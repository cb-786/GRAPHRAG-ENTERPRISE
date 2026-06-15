"""
Graph data models — Iteration 4
================================
Defines the Node/Edge/Graph structures that flow through the full pipeline:

    NIC CSV  →  data_parser  →  graphrag (extraction)  →  Neo4j (Iteration 5)

Node labels (what kinds of entities we extract):
    Activity    — the core industrial activity  e.g. "Growing of wheat"
    Product     — output / commodity            e.g. "Wheat", "Steel"
    RawMaterial — input material                e.g. "Iron ore", "Cotton"
    Sector      — broad economic sector         e.g. "Agriculture"
    Process     — method or technique           e.g. "Weaving", "Smelting"

Edge types (relationships between nodes):
    PRODUCES      Activity → Product
    USES          Activity → RawMaterial
    BELONGS_TO    Activity → Sector
    INVOLVES      Activity → Process
    RELATED_TO    generic catch-all
    PART_OF       sub-activity → parent activity
"""
from pydantic import BaseModel, field_validator
from typing import Any


class Node(BaseModel):
    """A single entity / vertex in the knowledge graph."""

    id: str                          # snake_case unique identifier, e.g. "product_wheat"
    label: str                       # one of the labels listed above
    name: str                        # human-readable display name
    properties: dict[str, Any] = {} # optional extra attributes

    @field_validator("label")
    @classmethod
    def valid_label(cls, v: str) -> str:
        allowed = {"Activity", "Product", "RawMaterial", "Sector", "Process"}
        if v not in allowed:
            raise ValueError(f"Node label must be one of {allowed}, got {v!r}")
        return v

    @field_validator("id")
    @classmethod
    def snake_case_id(cls, v: str) -> str:
        if " " in v:
            raise ValueError(f"Node id must not contain spaces, got {v!r}")
        return v.lower()


class Edge(BaseModel):
    """A directed relationship / edge in the knowledge graph."""

    source: str          # id of the source node
    target: str          # id of the target node
    type: str            # relationship type, e.g. "PRODUCES"

    @field_validator("type")
    @classmethod
    def upper_case_type(cls, v: str) -> str:
        return v.upper()


class GraphResult(BaseModel):
    """
    The structured output of one extraction call.
    Returned by the /graph/extract endpoint and by graphrag.py.
    """
    nic_code:    str
    description: str
    nodes:       list[Node]
    edges:       list[Edge]
    raw_llm_response: str = ""   # kept for debugging; stripped before Neo4j write


class BatchExtractionResult(BaseModel):
    """Result of extracting entities from multiple NIC entries at once."""
    total_processed: int
    total_nodes:     int
    total_edges:     int
    results:         list[GraphResult]
    errors:          list[str] = []