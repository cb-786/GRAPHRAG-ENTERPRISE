from fastapi import APIRouter
from datetime import datetime, timezone

router = APIRouter(prefix="/api/v1", tags=["v1"])


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