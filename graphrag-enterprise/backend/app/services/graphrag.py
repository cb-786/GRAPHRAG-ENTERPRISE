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
"""
GraphRAGService — Iteration 5 update
======================================
write_to_neo4j() is now fully implemented using Neo4jService.
Everything else stays the same as Iteration 4.
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
        """Extract entities and relationships from a single NIC entry."""
        prompt = build_extraction_prompt(
            nic_code    = entry["code"],
            description = entry["description"],
            division    = entry.get("division", ""),
            section     = entry.get("section", ""),
        )
        raw = await self._call_llm(prompt)
        nodes, edges = self._parse_llm_response(raw, entry["code"])
        return GraphResult(
            nic_code         = entry["code"],
            description      = entry["description"],
            nodes            = nodes,
            edges            = edges,
            raw_llm_response = raw,
        )

    async def extract_and_store(self, entry: dict) -> dict:
        """
        Extract entities from one NIC entry, then immediately write to Neo4j.
        This is the key new method for Iteration 5.
        """
        # Import here to avoid circular imports at module load time
        from app.services.neo4j_service import neo4j_service

        result  = await self.extract(entry)
        summary = await neo4j_service.write_graph_result(result)
        return summary

    async def extract_batch(
        self,
        entries: list[dict],
        *,
        store: bool = False,
    ) -> BatchExtractionResult:
        """
        Extract from multiple NIC entries.

        Args:
            entries: list of NIC entry dicts
            store:   if True, write each result to Neo4j after extraction
        """
        from app.services.neo4j_service import neo4j_service

        results: list[GraphResult] = []
        errors:  list[str]         = []

        for entry in entries:
            try:
                result = await self.extract(entry)
                results.append(result)
                if store:
                    await neo4j_service.write_graph_result(result)
            except Exception as e:
                msg = f"code={entry.get('code', '?')}: {e}"
                logger.warning("Extraction error — %s", msg)
                errors.append(msg)

        return BatchExtractionResult(
            total_processed = len(results),
            total_nodes     = sum(len(r.nodes) for r in results),
            total_edges     = sum(len(r.edges) for r in results),
            results         = results,
            errors          = errors,
        )

    # ── Private helpers (unchanged from Iteration 4) ──────────────────────────

    async def _call_llm(self, prompt: str) -> str:
        config = types.GenerateContentConfig(
            system_instruction = EXTRACTION_SYSTEM_PROMPT,
            response_mime_type = "application/json",
            temperature        = 0.1,
        )
        response = await self._client.aio.models.generate_content(
            model    = self._model,
            contents = prompt,
            config   = config,
        )
        return response.text

    def _parse_llm_response(
        self, raw: str, nic_code: str
    ) -> tuple[list[Node], list[Edge]]:
        cleaned = re.sub(r"```(?:json)?|```", "", raw).strip()
        try:
            data = json.loads(cleaned)
        except json.JSONDecodeError as e:
            raise ValueError(
                f"LLM returned invalid JSON for code={nic_code}: {e}\n\nRaw: {raw[:500]}"
            )

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

        edges: list[Edge] = []
        for e in raw_edges:
            try:
                edge = Edge(**e)
                if edge.source not in node_ids or edge.target not in node_ids:
                    logger.warning("Skipping edge with missing node refs: %s", e)
                    continue
                edges.append(edge)
            except Exception as e:
                logger.warning("Skipping invalid edge %s — %s", e, e)

        expected_id = f"activity_{nic_code}"
        if not any(n.id == expected_id for n in nodes):
            nodes.insert(0, Node(
                id=expected_id, label="Activity", name=f"Activity {nic_code}"
            ))

        return nodes, edges


# ── Module-level singleton ────────────────────────────────────────────────────
graphrag_service = GraphRAGService()