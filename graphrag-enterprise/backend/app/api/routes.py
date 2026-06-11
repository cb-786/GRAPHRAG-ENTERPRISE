from fastapi import APIRouter,HTTPException
from datetime import datetime, timezone
from pydantic import BaseModel

from app.services.llm import llm_service

router = APIRouter(prefix="/v1", tags=["v1"])


@router.get("/ping")
async def ping():
    """Simple round-trip connectivity check."""
    return {"message": "pong", "timestamp": datetime.now(timezone.utc).isoformat()}


@router.get("/status")
async def status():
    """
    Granular service status.
    Each dependency reports its own readiness — stubs for now,
    wired up in later iterations.
    """
    return {
        "status": "operational",
        "services": {
            "api": "up",
            "neo4j": "not_configured",   # Iteration 2
            "redis": "not_configured",   # Iteration 2
            "llm": "not_configured",     # Iteration 3
            "graphrag": "not_configured" # Iteration 4
        },
    }











     
@router.get("/llm/test")
async def llm_test():
    """
    Pass Condition for Iteration 2:
    Hit this endpoint and see the LLM's response printed in your terminal.
 
    curl http://localhost/api/v1/llm/test
    """
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
    """
    Send any prompt to the LLM and get a response back.
    Used by the frontend chat input (wired up later).
    """
    try:
        reply = await llm_service.complete(body.prompt, system=body.system)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM error: {e}")
 
    return {
        "prompt":   body.prompt,
        "response": reply,
        "model":    llm_service._model,
    }
