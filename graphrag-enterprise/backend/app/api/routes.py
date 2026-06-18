from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from pathlib import Path
from datetime import datetime, timezone

from app.services.llm import llm_service
from app.services.graphrag import graphrag_service
from app.services.neo4j_service import neo4j_service
from app.core.data_parser import parse_nic_csv, parse_to_dicts
from app.models.nic_code import ParseResult
from app.models.graph_models import GraphResult, BatchExtractionResult

router   = APIRouter(prefix="/v1", tags=["v1"])
DATA_DIR = Path(__file__).resolve().parents[2] / "data"
NIC_CSV  = DATA_DIR / "nic_2008.csv"


# ── Iteration 1 ───────────────────────────────────────────────────────────────

@router.get("/ping")
async def ping():
    return {"message": "pong", "timestamp": datetime.now(timezone.utc).isoformat()}


@router.get("/status")
async def status():
    try:
        graph_stats = await neo4j_service.get_stats()
        neo4j_status = "up"
    except Exception:
        graph_stats  = {}
        neo4j_status = "unreachable"

    return {
        "status": "operational",
        "services": {
            "api":      "up",
            "llm":      "up",
            "data":     "up",
            "graphrag": "up",
            "neo4j":    neo4j_status,
        },
        "graph_stats": graph_stats,
    }


# ── Iteration 2 ───────────────────────────────────────────────────────────────

@router.get("/llm/test")
async def llm_test():
    prompt = "Hello, what are you?"
    try:
        reply = await llm_service.complete(prompt)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM error: {e}")
    return {"prompt": prompt, "response": reply, "model": llm_service._model,
            "timestamp": datetime.now(timezone.utc).isoformat()}


class PromptRequest(BaseModel):
    prompt: str
    system: str | None = None


@router.post("/llm/complete")
async def llm_complete(body: PromptRequest):
    try:
        reply = await llm_service.complete(body.prompt, system=body.system)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM error: {e}")
    return {"prompt": body.prompt, "response": reply, "model": llm_service._model}


# ── Iteration 3 ───────────────────────────────────────────────────────────────

@router.get("/data/parse", response_model=ParseResult)
async def data_parse():
    try:
        return parse_nic_csv(NIC_CSV)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Parse error: {e}")


@router.get("/data/sample")
async def data_sample(n: int = 10):
    try:
        entries = parse_to_dicts(NIC_CSV)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return {"total_in_dataset": len(entries), "returned": min(n, len(entries)),
            "entries": entries[:n]}


@router.get("/data/search")
async def data_search(q: str):
    try:
        entries = parse_to_dicts(NIC_CSV)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    q_lower = q.lower()
    matches = [e for e in entries if q_lower in e["description"].lower()
               or q_lower in e["division"].lower()
               or q_lower in e["section"].lower()]
    return {"query": q, "matches": len(matches), "results": matches[:50]}


# ── Iteration 4 ───────────────────────────────────────────────────────────────

@router.get("/graph/extract", response_model=GraphResult)
async def graph_extract(code: str = Query(description="5-digit NIC code e.g. 01111")):
    """Extract entities from one NIC code (no DB write)."""
    try:
        entries = parse_to_dicts(NIC_CSV)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

    entry = next((e for e in entries if e["code"] == code), None)
    if not entry:
        raise HTTPException(status_code=404, detail=f"NIC code {code!r} not found")
    try:
        return await graphrag_service.extract(entry)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Extraction error: {e}")


class BatchRequest(BaseModel):
    codes: list[str]
    store: bool = False     # set True to also write to Neo4j


@router.post("/graph/extract/batch", response_model=BatchExtractionResult)
async def graph_extract_batch(body: BatchRequest):
    if len(body.codes) > 20:
        raise HTTPException(status_code=400, detail="Max 20 codes per batch")
    try:
        all_entries = parse_to_dicts(NIC_CSV)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

    entries = [e for e in all_entries if e["code"] in set(body.codes)]
    missing = set(body.codes) - {e["code"] for e in entries}
    if missing:
        raise HTTPException(status_code=404,
                            detail=f"Codes not found: {sorted(missing)}")
    try:
        return await graphrag_service.extract_batch(entries, store=body.store)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


# ── Iteration 5 ───────────────────────────────────────────────────────────────

@router.get("/graph/db/test")
async def graph_db_test():
    """
    Pass Condition for Iteration 5.
    Inserts a dummy node/edge into Neo4j and immediately retrieves it.

    curl http://localhost/api/v1/graph/db/test | python3 -m json.tool
    """
    try:
        result = await neo4j_service.test_write_and_read()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Neo4j test failed: {e}")
    return result


@router.post("/graph/store")
async def graph_store(code: str = Query(description="5-digit NIC code to extract + store")):
    """
    Extract entities from a NIC code and write them to Neo4j in one call.

    curl -X POST "http://localhost/api/v1/graph/store?code=01111"
    """
    try:
        entries = parse_to_dicts(NIC_CSV)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

    entry = next((e for e in entries if e["code"] == code), None)
    if not entry:
        raise HTTPException(status_code=404, detail=f"NIC code {code!r} not found")

    try:
        summary = await graphrag_service.extract_and_store(entry)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
    return summary


@router.get("/graph/query")
async def graph_query(code: str = Query(description="5-digit NIC code to retrieve")):
    """
    Retrieve a stored NIC activity and its relationships from Neo4j.

    curl "http://localhost/api/v1/graph/query?code=01111" | python3 -m json.tool
    """
    try:
        result = await neo4j_service.get_graph_for_nic_code(code)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Neo4j query error: {e}")

    if not result:
        raise HTTPException(
            status_code=404,
            detail=f"No graph data found for code {code!r}. "
                   f"Run POST /graph/store?code={code} first."
        )
    return result


@router.get("/graph/search")
async def graph_search(q: str = Query(description="Search node names in Neo4j")):
    """
    Search stored node names in Neo4j by keyword.

    curl "http://localhost/api/v1/graph/search?q=wheat"
    """
    try:
        nodes = await neo4j_service.search_nodes_by_name(q)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Neo4j search error: {e}")
    return {"query": q, "matches": len(nodes), "nodes": nodes}


@router.get("/graph/stats")
async def graph_stats():
    """Total node and edge counts in the Neo4j database."""
    try:
        return await neo4j_service.get_stats()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Neo4j stats error: {e}")

# ── Iteration 6 ───────────────────────────────────────────────────────────────

@router.get("/search/semantic")
async def search_semantic(q: str = Query(..., min_length=3, description="Semantic search query")):
    """
    Iteration 6 Pass Condition.
    Takes a natural language query, embeds it, and retrieves the closest NIC Activity matches.

    curl "http://localhost/api/v1/search/semantic?q=making%20clothes" | python3 -m json.tool
    """
    try:
        # 1. Convert user text into a 768-dim vector
        query_vector = await llm_service.generate_embedding(q)
        
        # 2. Search Neo4j via vector index
        results = await neo4j_service.semantic_search(query_vector, top_k=3)
        
        if not results:
            return {
                "status": "success", 
                "query": q, 
                "matches": 0, 
                "data": [], 
                "message": "No matches found. Did you run the hydration script?"
            }
            
        return {
            "status": "success", 
            "query": q,
            "matches": len(results),
            "data": results
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Semantic search error: {e}")