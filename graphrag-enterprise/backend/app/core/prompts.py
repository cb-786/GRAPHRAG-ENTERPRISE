"""
Prompt templates — Iteration 4
================================
All LLM prompts live here so they can be tuned independently of service logic.

Critical design rule:
    Every prompt explicitly forbids markdown, code fences, and prose.
    The Gemini API is also called with response_mime_type="application/json"
    as a second layer of enforcement — but the prompt is the first line of defence.
"""

# ── System prompt — sets the model's persona for the entire session ────────────

EXTRACTION_SYSTEM_PROMPT = """You are a precise knowledge-graph construction engine
specialising in Indian industrial classification (NIC 2008).

Your ONLY job is to extract entities and relationships from NIC activity descriptions
and return them as a single, minified JSON object.

STRICT OUTPUT RULES — violation causes pipeline failure:
1. Return ONLY the JSON object. No markdown. No code fences. No prose. No explanation.
2. Every node id must be lowercase snake_case with no spaces (e.g. "product_wheat").
3. Node label must be exactly one of: Activity | Product | RawMaterial | Sector | Process
4. Edge type must be exactly one of: PRODUCES | USES | BELONGS_TO | INVOLVES | RELATED_TO | PART_OF
5. Every edge source and target must reference an id that exists in the nodes array.
6. Do not invent codes, statistics, dates, or organisations not implied by the description.
7. The Activity node id must always be "activity_<nic_code>" (e.g. "activity_01111").

Required JSON schema (copy this structure exactly):
{
  "nodes": [
    {"id": "string", "label": "string", "name": "string", "properties": {}}
  ],
  "edges": [
    {"source": "string", "target": "string", "type": "string"}
  ]
}"""


# ── Per-request extraction prompt ─────────────────────────────────────────────

def build_extraction_prompt(
    nic_code:    str,
    description: str,
    division:    str,
    section:     str,
) -> str:
    """
    Build the user-turn prompt for a single NIC entry.

    The section and division are included so the model can create correct
    Sector nodes without hallucinating — they come straight from the CSV.
    """
    return f"""Extract entities and relationships for this NIC 2008 entry.

NIC Code:    {nic_code}
Description: {description}
Division:    {division}
Section:     {section}

Instructions:
- Always create one Activity node with id "activity_{nic_code}" and name "{description}".
- Create a Sector node from the Section field (e.g. id "sector_agriculture").
- Add a BELONGS_TO edge from the Activity to the Sector.
- Extract Products the activity produces (PRODUCES edges).
- Extract RawMaterials the activity consumes (USES edges).
- Extract Processes / techniques involved (INVOLVES edges).
- Keep node names short and generic so they can be reused across NIC codes.
- Minimum: 2 nodes and 1 edge. Maximum: 8 nodes and 10 edges.

Return ONLY the JSON object. No markdown. No explanation."""


# ── Batch prompt (used when sending multiple descriptions in one call) ─────────

def build_batch_extraction_prompt(entries: list[dict]) -> str:
    """
    Build a prompt that extracts from multiple NIC entries in a single LLM call.
    Returns a JSON array — one graph object per entry.

    Used by the /graph/extract/batch endpoint.
    """
    lines = []
    for e in entries:
        lines.append(
            f'- code={e["code"]} | {e["description"]} | section={e["section"]}'
        )

    entries_text = "\n".join(lines)

    return f"""Extract entities and relationships for each NIC entry below.

{entries_text}

Return a JSON array where each element follows this schema:
{{
  "nic_code": "string",
  "nodes": [{{"id": "string", "label": "string", "name": "string", "properties": {{}}}}],
  "edges": [{{"source": "string", "target": "string", "type": "string"}}]
}}

Return ONLY the JSON array. No markdown. No explanation."""