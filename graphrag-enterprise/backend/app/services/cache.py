"""
CacheService — Redis-backed result cache.
Stub for Iteration 1; fully implemented in Iteration 2.
"""


class CacheService:
    """
    Wraps Redis to cache classification results and avoid redundant LLM calls.

    Planned interface (Iteration 2):
        await cache.get(key: str) -> dict | None
        await cache.set(key: str, value: dict, ttl: int) -> None
        await cache.delete(key: str) -> None
    """

    def __init__(self):
        self._client = None  # redis.asyncio.Redis — wired in Iteration 2

    async def connect(self) -> None:  # pragma: no cover
        raise NotImplementedError("CacheService.connect() — Iteration 2")

    async def disconnect(self) -> None:  # pragma: no cover
        raise NotImplementedError("CacheService.disconnect() — Iteration 2")