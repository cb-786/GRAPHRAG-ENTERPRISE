from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from pathlib import Path
from datetime import datetime, timezone

from app.services.llm import llm_service
from app.core.data_parser import parse_nic_csv, parse_to_dicts
from app.models.nic_code import ParseResult

router = APIRouter(prefix="/v1", tags=["v1"])

# Resolve CSV path relative to the backend root (works inside Docker too)
DATA_DIR = Path(__file__).resolve().parents[2] / "data"
NIC_CSV  = DATA_DIR / "nic_2008.csv"


# ── Iteration 1 routes ────────────────────────────────────────────────────────

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
            "data":     "up",               # ✅ Iteration 3
            "neo4j":    "not_configured",   # Iteration 4
            "redis":    "not_configured",   # Iteration 4
            "graphrag": "not_configured",   # Iteration 4
        },
    }


# ── Iteration 2 routes ────────────────────────────────────────────────────────

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


# ── Iteration 3 routes ────────────────────────────────────────────────────────

@router.get("/data/parse", response_model=ParseResult)
async def data_parse():
    """
    Parse the NIC 2008 CSV and return the full structured dataset.

    Pass condition: returns 1297 entries with 0 errors.
    curl http://localhost/api/v1/data/parse | python3 -m json.tool | head -60
    """
    try:
        result = parse_nic_csv(NIC_CSV)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Parse error: {e}")
    return result


@router.get("/data/sample")
async def data_sample(n: int = 10):
    """Return the first N parsed entries — quick sanity check."""
    try:
        entries = parse_to_dicts(NIC_CSV)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return {
        "total_in_dataset": len(entries),
        "returned": min(n, len(entries)),
        "entries":  entries[:n],
    }


@router.get("/data/search")
async def data_search(q: str):
    """
    Simple keyword search over NIC descriptions.
    Used by the frontend search bar; will be replaced by
    vector similarity search in Iteration 4.
    """
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
    return {
        "query":   q,
        "matches": len(matches),
        "results": matches[:50],          # cap at 50 for now
    }