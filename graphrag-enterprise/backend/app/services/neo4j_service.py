"""
Neo4jService — Iteration 5
============================
Handles all graph database operations: connecting, writing nodes/edges,
and querying the stored graph.

Cypher primer (everything we use here):
    MERGE  (n:Label {id: $id})           -- create node if it doesn't exist
    SET    n += $props                   -- set / update properties
    MATCH  (a {id: $src}), (b {id: $tgt})-- find two existing nodes
    MERGE  (a)-[:TYPE]->(b)             -- create relationship if it doesn't exist
    RETURN n, r                          -- return nodes / relationships

Why MERGE instead of CREATE?
    Running the same extraction twice won't duplicate data.
    Safe for re-ingestion and retries.
"""
import logging
from contextlib import asynccontextmanager

from neo4j import AsyncGraphDatabase, AsyncDriver
from neo4j.exceptions import ServiceUnavailable

from app.core.config import settings
from app.models.graph_models import GraphResult, Node, Edge

logger = logging.getLogger(__name__)


class Neo4jService:

    def __init__(self):
        self._driver: AsyncDriver | None = None

    # ── Lifecycle ─────────────────────────────────────────────────────────────

    async def connect(self) -> None:
        """Open the driver connection pool. Called once at app startup."""
        self._driver = AsyncGraphDatabase.driver(
            settings.NEO4J_URI,
            auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD),
        )
        # Verify the connection is actually reachable
        await self._driver.verify_connectivity()
        logger.info("Neo4j connected  |  uri=%s", settings.NEO4J_URI)

        # Create indexes on first connect so lookups are fast
        await self._create_indexes()

    async def disconnect(self) -> None:
        """Close the driver. Called at app shutdown."""
        if self._driver:
            await self._driver.close()
            logger.info("Neo4j disconnected")

    def _require_driver(self) -> AsyncDriver:
        if not self._driver:
            raise RuntimeError(
                "Neo4jService not connected. "
                "Call await neo4j_service.connect() at startup."
            )
        return self._driver

    # ── Schema / indexes ──────────────────────────────────────────────────────

    async def _create_indexes(self) -> None:
        """
        Create uniqueness constraints so MERGE is fast and IDs stay unique.
        Safe to run multiple times — IF NOT EXISTS is idempotent.
        """
        constraints = [
            "CREATE CONSTRAINT node_id_unique IF NOT EXISTS "
            "FOR (n:Activity) REQUIRE n.id IS UNIQUE",

            "CREATE CONSTRAINT product_id_unique IF NOT EXISTS "
            "FOR (n:Product) REQUIRE n.id IS UNIQUE",

            "CREATE CONSTRAINT sector_id_unique IF NOT EXISTS "
            "FOR (n:Sector) REQUIRE n.id IS UNIQUE",

            "CREATE CONSTRAINT rawmaterial_id_unique IF NOT EXISTS "
            "FOR (n:RawMaterial) REQUIRE n.id IS UNIQUE",

            "CREATE CONSTRAINT process_id_unique IF NOT EXISTS "
            "FOR (n:Process) REQUIRE n.id IS UNIQUE",
        ]
        driver = self._require_driver()
        async with driver.session() as session:
            for cypher in constraints:
                await session.run(cypher)
        logger.info("Neo4j indexes/constraints verified")

    # ── Write ─────────────────────────────────────────────────────────────────

    async def write_node(self, node: Node) -> None:
        """
        Upsert a single node into Neo4j.

        Cypher explanation:
            MERGE finds an existing node with this id, or creates one.
            SET n += $props  adds/updates properties without overwriting
            the whole node (the += means merge, not replace).
        """
        cypher = f"""
        MERGE (n:{node.label} {{id: $id}})
        SET n += $props
        RETURN n
        """
        props = {"id": node.id, "name": node.name, **node.properties}
        driver = self._require_driver()
        async with driver.session() as session:
            await session.run(cypher, id=node.id, props=props)

    async def write_edge(self, edge: Edge) -> None:
        """
        Upsert a single relationship between two existing nodes.

        Cypher explanation:
            MATCH finds both nodes by their id (must already exist).
            MERGE creates the relationship only if it doesn't exist yet.
            The relationship type is dynamic so we use string formatting
            (safe here because edge.type is validated by Pydantic to be
            one of our allowed uppercase strings).
        """
        cypher = f"""
        MATCH (a {{id: $source}}), (b {{id: $target}})
        MERGE (a)-[r:{edge.type}]->(b)
        RETURN r
        """
        driver = self._require_driver()
        async with driver.session() as session:
            result = await session.run(
                cypher, source=edge.source, target=edge.target
            )
            record = await result.single()
            if record is None:
                logger.warning(
                    "Edge not created — one or both nodes missing: "
                    "%s -[%s]-> %s",
                    edge.source, edge.type, edge.target,
                )

    async def write_graph_result(self, result: GraphResult) -> dict:
        """
        Write all nodes then all edges from a GraphResult in one operation.
        Nodes must be written before edges (edges reference node ids).

        Returns a summary dict for the API response.
        """
        # Write nodes first
        for node in result.nodes:
            await self.write_node(node)

        # Then write edges
        for edge in result.edges:
            await self.write_edge(edge)

        summary = {
            "nic_code":      result.nic_code,
            "description":   result.description,
            "nodes_written": len(result.nodes),
            "edges_written": len(result.edges),
        }
        logger.info(
            "Graph written  code=%s  nodes=%d  edges=%d",
            result.nic_code, len(result.nodes), len(result.edges),
        )
        return summary

    # ── Read / Query ──────────────────────────────────────────────────────────

    async def get_node_by_id(self, node_id: str) -> dict | None:
        """
        Retrieve a single node by its id property.

        Cypher explanation:
            MATCH (n {id: $id})  finds any node (any label) with this id.
            RETURN n             returns the node as a record.
        """
        cypher = "MATCH (n {id: $id}) RETURN n"
        driver = self._require_driver()
        async with driver.session() as session:
            result = await session.run(cypher, id=node_id)
            record = await result.single()
            if record is None:
                return None
            return dict(record["n"])

    async def get_graph_for_nic_code(self, nic_code: str) -> dict:
        """
        Retrieve all nodes and relationships for a given NIC activity.

        Cypher explanation:
            MATCH (a:Activity {id: $id})   start at the Activity node
            OPTIONAL MATCH (a)-[r]->(b)    follow any outgoing relationship
            RETURN a, collect(...)         group relationships + targets into lists
        """
        activity_id = f"activity_{nic_code}"
        cypher = """
        MATCH (a:Activity {id: $id})
        OPTIONAL MATCH (a)-[r]->(b)
        RETURN
            a                                        AS activity,
            collect({
                rel_type: type(r),
                target_id: b.id,
                target_label: labels(b)[0],
                target_name: b.name
            }) AS relationships
        """
        driver = self._require_driver()
        async with driver.session() as session:
            result = await session.run(cypher, id=activity_id)
            record = await result.single()

        if record is None:
            return {}

        activity = dict(record["activity"])
        rels = [r for r in record["relationships"] if r["target_id"] is not None]

        return {
            "nic_code":      nic_code,
            "activity":      activity,
            "relationships": rels,
        }

    async def search_nodes_by_name(self, query: str) -> list[dict]:
        """
        Case-insensitive substring search across all node names.
        Used by the frontend search bar in Iteration 6.

        Cypher explanation:
            toLower(n.name) CONTAINS toLower($query)   case-insensitive match
            LIMIT 20                                   safety cap
        """
        cypher = """
        MATCH (n)
        WHERE toLower(n.name) CONTAINS toLower($query)
        RETURN n
        LIMIT 20
        """
        driver = self._require_driver()
        async with driver.session() as session:
            result = await session.run(cypher, query=query)
            records = await result.data()
        return [dict(r["n"]) for r in records]

    async def get_stats(self) -> dict:
        """
        Return basic graph statistics — useful for the /status endpoint.
        """
        cypher = """
        MATCH (n) WITH count(n) AS total_nodes
        MATCH ()-[r]->() WITH total_nodes, count(r) AS total_edges
        RETURN total_nodes, total_edges
        """
        driver = self._require_driver()
        async with driver.session() as session:
            result = await session.run(cypher)
            record = await result.single()
        return {
            "total_nodes": record["total_nodes"] if record else 0,
            "total_edges": record["total_edges"] if record else 0,
        }

    # ── Pass Condition helper ─────────────────────────────────────────────────

    async def test_write_and_read(self) -> dict:
        """
        Insert a dummy node + edge and immediately retrieve them.
        This is the exact pass condition for Iteration 5.
        Cleans up after itself.
        """
        driver = self._require_driver()

        # Write dummy data
        async with driver.session() as session:
            await session.run("""
                MERGE (a:TestNode {id: 'test_node_a', name: 'Test Node A'})
                MERGE (b:TestNode {id: 'test_node_b', name: 'Test Node B'})
                MERGE (a)-[:TEST_RELATION]->(b)
            """)

        # Read it back
        async with driver.session() as session:
            result = await session.run("""
                MATCH (a:TestNode {id: 'test_node_a'})-[r:TEST_RELATION]->(b:TestNode)
                RETURN a.name AS a_name, type(r) AS rel, b.name AS b_name
            """)
            record = await result.single()

        # Clean up
        async with driver.session() as session:
            await session.run("MATCH (n:TestNode) DETACH DELETE n")

        if record is None:
            raise RuntimeError("Write succeeded but read returned nothing — check Neo4j")

        return {
            "wrote":     "TestNode A -[:TEST_RELATION]-> TestNode B",
            "retrieved": f"{record['a_name']} -[{record['rel']}]-> {record['b_name']}",
            "status":    "PASS",
        }


# ── Module-level singleton ────────────────────────────────────────────────────
neo4j_service = Neo4jService()