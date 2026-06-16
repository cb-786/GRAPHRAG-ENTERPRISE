from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    APP_NAME: str = "NIC Code Classification API"
    DEBUG: bool = False
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost",
        "http://localhost:80",
        "http://localhost:3000",
        "http://localhost:5173",
    ]

    # ── Iteration 2: LLM ──────────────────────────────────────────────────────
    GEMINI_API_KEY: str = ""
    LLM_MODEL: str = "gemini-2.5-flash"

    # ── Iteration 3: Graph DB + Cache ─────────────────────────────────────────
    NEO4J_URI: str = "bolt://neo4j:7687"
    NEO4J_USER: str = "neo4j"
    NEO4J_PASSWORD: str = "changeme"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()











