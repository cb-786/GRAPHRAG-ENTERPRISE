"""
GraphRAGService — retrieval-augmented classification over the NIC knowledge graph.
Stub for Iteration 1; fully implemented in Iteration 4.
"""


class GraphRAGService:
    """
    Queries a Neo4j knowledge graph to retrieve relevant NIC code context,
    then feeds that context to the LLM for final classification.

    Planned interface (Iteration 4):
        await graphrag.retrieve(query: str, top_k: int) -> list[dict]
        await graphrag.classify(description: str) -> ClassificationResult
    """

    def __init__(self):
        self._driver = None  # neo4j.AsyncDriver — wired in Iteration 2

    async def classify(self, description: str) -> dict:  # pragma: no cover
        raise NotImplementedError("GraphRAGService.classify() — Iteration 4")