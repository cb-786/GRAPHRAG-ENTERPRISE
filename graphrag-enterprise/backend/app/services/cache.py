import os
import json
import logging
from typing import Any, Optional
import redis

logger = logging.getLogger("uvicorn.error")

class CacheService:
    def __init__(self):
        self.redis_url = os.getenv("REDIS_URL")
        self.redis_host = os.getenv("REDIS_HOST", "nic-redis")
        self.redis_port = int(os.getenv("REDIS_PORT", 6379))
        self.client: Optional[redis.Redis] = None
        self._memory_cache = {}  # In-memory fallback if Redis is unavailable
        self._connect()

    def _connect(self):
        try:
            if self.redis_url:
                self.client = redis.from_url(
                    self.redis_url,
                    decode_responses=True,
                    socket_timeout=3.0
                )
                self.client.ping()
                logger.info("Connected to Redis cache via REDIS_URL")
                return

            self.client = redis.Redis(
                host=self.redis_host,
                port=self.redis_port,
                decode_responses=True,
                socket_timeout=2.0
            )
            self.client.ping()
            logger.info(f"Connected to Redis cache at {self.redis_host}:{self.redis_port}")
        except Exception as e:
            logger.warning(f"Redis not available, operating with in-memory fallback: {e}")
            self.client = None

    async def get(self, key: str) -> Optional[Any]:
        """Retrieve and parse JSON payload from cache."""
        if not self.client:
            return self._memory_cache.get(key)
        try:
            data = self.client.get(key)
            if data:
                return json.loads(data)
        except Exception as e:
            logger.error(f"Redis GET error for key {key}: {e}")
            return self._memory_cache.get(key)
        return None

    async def set(self, key: str, value: Any, ttl: int = 3600) -> bool:
        """Serialize data to JSON and store in cache with a TTL (default 1 hour)."""
        if not self.client:
            self._memory_cache[key] = value
            return True
        try:
            serialized_value = json.dumps(value)
            self.client.setex(key, ttl, serialized_value)
            return True
        except Exception as e:
            logger.error(f"Redis SET error for key {key}: {e}")
            self._memory_cache[key] = value
            return False

# Singleton instance to be shared across routes
cache_service = CacheService()