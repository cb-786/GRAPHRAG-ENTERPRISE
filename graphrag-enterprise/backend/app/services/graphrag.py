"""
GraphRAGService — Iteration 4
==============================
Uses the Gemini LLM to extract nodes and edges from NIC descriptions.

Flow:
    NICEntry dict
        │
        ▼
    build_extraction_prompt()       ← constructs tight JSON-only prompt
        │
        ▼
    Gemini API (JSON mode)          ← response_mime_type forces clean JSON
        │
        ▼
    _parse_llm_response()           ← strips any stray fences, validates schema
        │
        ▼
    GraphResult(nodes, edges)       ← fully validated Pydantic object

Iteration 5 will add:
    write_to_neo4j(result)          ← persists nodes/edges to the graph DB
    vector_search(query)            ← ANN search over embedded node names
"""
import json
import logging
import re

from google import genai
from google.genai import types

from app.core.config import settings
from app.core.prompts import (
    EXTRACTION_SYSTEM_PROMPT,
    build_extraction_prompt,
    build_batch_extraction_prompt,
)
from app.models.graph_models import Node, Edge, GraphResult, BatchExtractionResult

logger = logging.getLogger(__name__)


class GraphRAGService:

    def __init__(self):
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY not set — see backend/.env")
        self._client = genai.Client(api_key=settings.GEMINI_API_KEY)
        self._model  = settings.LLM_MODEL
        logger.info("GraphRAGService ready  |  model=%s", self._model)

    # ── Public API ────────────────────────────────────────────────────────────

    async def extract(self, entry: dict) -> GraphResult:
        """
        Extract entities and relationships from a single NIC entry.

        Args:
            entry: dict with keys code, description, division, section
                   (exactly what data_parser.parse_to_dicts() produces)

        Returns:
            GraphResult with validated nodes and edges.
        """
        prompt = build_extraction_prompt(
            nic_code    = entry["code"],
            description = entry["description"],
            division    = entry.get("division", ""),
            section     = entry.get("section", ""),
        )

        raw = await self._call_llm(prompt)
        nodes, edges = self._parse_llm_response(raw, entry["code"])

        result = GraphResult(
            nic_code         = entry["code"],
            description      = entry["description"],
            nodes            = nodes,
            edges            = edges,
            raw_llm_response = raw,
        )
        logger.info(
            "Extracted  code=%s  nodes=%d  edges=%d",
            entry["code"], len(nodes), len(edges),
        )
        return result

    async def extract_batch(
        self,
        entries: list[dict],
        *,
        max_per_call: int = 5,
    ) -> BatchExtractionResult:
        """
        Extract from multiple NIC entries, chunked to stay within context limits.

        Args:
            entries:      list of NIC entry dicts
            max_per_call: how many descriptions to send per LLM call

        Returns:
            BatchExtractionResult aggregating all graphs and errors.
        """
        results: list[GraphResult] = []
        errors:  list[str]         = []

        # Process one at a time for reliability in Iteration 4;
        # batching can be enabled in Iteration 5 once quality is confirmed.
        for entry in entries:
            try:
                result = await self.extract(entry)
                results.append(result)
            except Exception as e:
                msg = f"code={entry.get('code', '?')}: {e}"
                logger.warning("Extraction error — %s", msg)
                errors.append(msg)

        total_nodes = sum(len(r.nodes) for r in results)
        total_edges = sum(len(r.edges) for r in results)

        return BatchExtractionResult(
            total_processed = len(results),
            total_nodes     = total_nodes,
            total_edges     = total_edges,
            results         = results,
            errors          = errors,
        )

    # ── Private helpers ───────────────────────────────────────────────────────

    async def _call_llm(self, prompt: str) -> str:
        """
        Call Gemini with JSON mode enforced at the API level.
        response_mime_type="application/json" is the second layer of defence
        against markdown and stray prose — the prompt is the first.
        """
        config = types.GenerateContentConfig(
            system_instruction  = EXTRACTION_SYSTEM_PROMPT,
            response_mime_type  = "application/json",   # ← forces clean JSON
            temperature         = 0.1,                  # low temp = consistent structure
        )
        response = await self._client.aio.models.generate_content(
            model    = self._model,
            contents = prompt,
            config   = config,
        )
        return response.text

    def _parse_llm_response(
        self,
        raw: str,
        nic_code: str,
    ) -> tuple[list[Node], list[Edge]]:
        """
        Parse and validate the LLM JSON response.

        Layers of defence:
        1. Strip any stray markdown fences the model sneaked in
        2. json.loads() — hard fail if unparseable
        3. Validate each node/edge through Pydantic
        4. Cross-check that all edge source/target ids exist in nodes
        5. Ensure the mandatory Activity node is present

        Raises:
            ValueError if the structure is fundamentally broken.
        """
        # ── 1. Strip markdown fences ──────────────────────────────────────────
        cleaned = re.sub(r"```(?:json)?|```", "", raw).strip()

        # ── 2. Parse JSON ────────────────────────────────────────────────────
        try:
            data = json.loads(cleaned)
        except json.JSONDecodeError as e:
            raise ValueError(f"LLM returned invalid JSON for code={nic_code}: {e}\n\nRaw: {raw[:500]}")

        # ── 3. Validate nodes ────────────────────────────────────────────────
        raw_nodes = data.get("nodes", [])
        raw_edges = data.get("edges", [])

        if not raw_nodes:
            raise ValueError(f"No nodes returned for code={nic_code}")

        nodes: list[Node] = []
        node_ids: set[str] = set()

        for n in raw_nodes:
            try:
                node = Node(**n)
                nodes.append(node)
                node_ids.add(node.id)
            except Exception as e:
                logger.warning("Skipping invalid node %s — %s", n, e)

        # ── 4. Validate edges ────────────────────────────────────────────────
        edges: list[Edge] = []
        for e in raw_edges:
            try:
                edge = Edge(**e)
                # Cross-check that referenced ids actually exist
                if edge.source not in node_ids:
                    logger.warning(
                        "Edge source %r not in node ids — skipping", edge.source
                    )
                    continue
                if edge.target not in node_ids:
                    logger.warning(
                        "Edge target %r not in node ids — skipping", edge.target
                    )
                    continue
                edges.append(edge)
            except Exception as e:
                logger.warning("Skipping invalid edge %s — %s", e, e)

        # ── 5. Ensure Activity node exists ───────────────────────────────────
        expected_activity_id = f"activity_{nic_code}"
        if not any(n.id == expected_activity_id for n in nodes):
            logger.warning(
                "Activity node %r missing — injecting stub", expected_activity_id
            )
            nodes.insert(0, Node(
                id    = expected_activity_id,
                label = "Activity",
                name  = f"Activity {nic_code}",
            ))

        if not nodes:
            raise ValueError(f"Zero valid nodes after validation for code={nic_code}")

        return nodes, edges

    # ── Iteration 5 stubs ─────────────────────────────────────────────────────

    async def write_to_neo4j(self, result: GraphResult) -> None:
        """Persist GraphResult to Neo4j — Iteration 5."""
        raise NotImplementedError("write_to_neo4j() — Iteration 5")

    async def vector_search(self, query: str, top_k: int = 10) -> list[dict]:
        """ANN search over node embeddings — Iteration 5."""
        raise NotImplementedError("vector_search() — Iteration 5")


# ── Module-level singleton ────────────────────────────────────────────────────
graphrag_service = GraphRAGService()