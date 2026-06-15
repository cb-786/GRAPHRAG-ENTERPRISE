from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from pathlib import Path
from datetime import datetime, timezone

from app.services.llm import llm_service
from app.services.graphrag import graphrag_service
from app.core.data_parser import parse_nic_csv, parse_to_dicts
from app.models.nic_code import ParseResult
from app.models.graph_models import GraphResult, BatchExtractionResult

router  = APIRouter(prefix="/v1", tags=["v1"])

DATA_DIR = Path(__file__).resolve().parents[2] / "data"
NIC_CSV  = DATA_DIR / "nic_2008.csv"


# ── Iteration 1 ───────────────────────────────────────────────────────────────

@router.get("/ping")
async def ping():
    return {"message": "pong", "timestamp": datetime.now(timezone.utc).isoformat()}


@router.get("/status")
async def status():
    return {
        "status": "operational",
        "services": {
            "api":      "up",
            "llm":      "up",
            "data":     "up",
            "graphrag": "up",               # ✅ Iteration 4
            "neo4j":    "not_configured",   # Iteration 5
            "redis":    "not_configured",   # Iteration 5
        },
    }


# ── Iteration 2 ───────────────────────────────────────────────────────────────

@router.get("/llm/test")
async def llm_test():
    prompt = "Hello, what are you?"
    try:
        reply = await llm_service.complete(prompt)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM error: {e}")
    return {
        "prompt":    prompt,
        "response":  reply,
        "model":     llm_service._model,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


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
    return {"total_in_dataset": len(entries), "returned": min(n, len(entries)), "entries": entries[:n]}


@router.get("/data/search")
async def data_search(q: str):
    try:
        entries = parse_to_dicts(NIC_CSV)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    q_lower = q.lower()
    matches = [
        e for e in entries
        if q_lower in e["description"].lower()
        or q_lower in e["division"].lower()
        or q_lower in e["section"].lower()
    ]
    return {"query": q, "matches": len(matches), "results": matches[:50]}


# ── Iteration 4 ───────────────────────────────────────────────────────────────

@router.get("/graph/extract", response_model=GraphResult)
async def graph_extract(
    code: str = Query(description="5-digit NIC Sub Class code, e.g. 01111"),
):
    """
    Pass Condition for Iteration 4:
    Returns valid nodes + edges for a single NIC code with zero hallucinated formatting.

    curl "http://localhost/api/v1/graph/extract?code=01111" | python3 -m json.tool
    """
    try:
        entries = parse_to_dicts(NIC_CSV)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

    entry = next((e for e in entries if e["code"] == code), None)
    if not entry:
        raise HTTPException(status_code=404, detail=f"NIC code {code!r} not found")

    try:
        result = await graphrag_service.extract(entry)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Extraction error: {e}")

    return result


class BatchRequest(BaseModel):
    codes: list[str]          # e.g. ["01111", "01112", "01120"]


@router.post("/graph/extract/batch", response_model=BatchExtractionResult)
async def graph_extract_batch(body: BatchRequest):
    """
    Extract entities from multiple NIC codes in one request.
    Capped at 20 codes per call to stay within rate limits.
    """
    if len(body.codes) > 20:
        raise HTTPException(status_code=400, detail="Max 20 codes per batch request")

    try:
        all_entries = parse_to_dicts(NIC_CSV)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

    code_set    = set(body.codes)
    entries     = [e for e in all_entries if e["code"] in code_set]
    missing     = code_set - {e["code"] for e in entries}

    if missing:
        raise HTTPException(
            status_code=404,
            detail=f"Codes not found in dataset: {sorted(missing)}",
        )

    try:
        result = await graphrag_service.extract_batch(entries)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Batch extraction error: {e}")

    return result