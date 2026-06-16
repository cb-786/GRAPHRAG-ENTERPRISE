from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.core.config import settings
from app.services.neo4j_service import neo4j_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI lifespan handler — runs startup logic before yield,
    shutdown logic after.

    On startup:  open Neo4j driver + verify connectivity
    On shutdown: close the connection pool cleanly
    """
    logger.info("Starting up — connecting to Neo4j…")
    try:
        await neo4j_service.connect()
        logger.info("Neo4j connection established ✅")
    except Exception as e:
        # Don't crash the whole API if Neo4j is temporarily unavailable —
        # individual endpoints will raise 503 when they try to use the driver.
        logger.warning("Neo4j connection failed at startup: %s", e)

    yield  # ← app runs here

    logger.info("Shutting down — closing Neo4j connection…")
    await neo4j_service.disconnect()


app = FastAPI(
    title       = settings.APP_NAME,
    description = "GraphRAG-powered NIC code classification service",
    version     = "0.4.0",
    docs_url    = "/api/docs",
    redoc_url   = "/api/redoc",
    lifespan    = lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins    = settings.ALLOWED_ORIGINS,
    allow_credentials= True,
    allow_methods    = ["*"],
    allow_headers    = ["*"],
)

app.include_router(router)


@app.get("/health")
async def health_check():
    return {
        "status":  "OK",
        "service": settings.APP_NAME,
        "version": "0.4.0",
    }