import os
import json
import logging
from typing import Any, Optional
import redis

logger = logging.getLogger("uvicorn.error")

class CacheService:
    def __init__(self):
        # Fallback to localhost if running outside docker for local script testing
        self.redis_host = os.getenv("REDIS_HOST", "nic-redis")
        self.redis_port = int(os.getenv("REDIS_PORT", 6379))
        self.client: Optional[redis.Redis] = None
        self._connect()

    def _connect(self):
        try:
            self.client = redis.Redis(
                host=self.redis_host,
                port=self.redis_port,
                decode_responses=True,  # Automatically decodes bytes to strings
                socket_timeout=2.0
            )
            # Test connection immediately
            self.client.ping()
            logger.info(f"Connected to Redis cache at {self.redis_host}:{self.redis_port}")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            self.client = None

    async def get(self, key: str) -> Optional[Any]:
        """Retrieve and parse JSON payload from cache."""
        if not self.client:
            return None
        try:
            data = self.client.get(key)
            if data:
                return json.loads(data)
        except Exception as e:
            logger.error(f"Redis GET error for key {key}: {e}")
        return None

    async def set(self, key: str, value: Any, ttl: int = 3600) -> bool:
        """Serialize data to JSON and store in cache with a TTL (default 1 hour)."""
        if not self.client:
            return False
        try:
            serialized_value = json.dumps(value)
            self.client.setex(key, ttl, serialized_value)
            return True
        except Exception as e:
            logger.error(f"Redis SET error for key {key}: {e}")
            return False

# Singleton instance to be shared across routes
cache_service = CacheService()