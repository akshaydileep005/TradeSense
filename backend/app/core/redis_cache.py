import json
import logging
from typing import Optional, Any
from app.core.config import settings

logger = logging.getLogger("tradesense.redis")

class RedisCacheService:
    def __init__(self):
        self._client = None
        self._is_connected = False
        self._attempted = False

    def _get_client(self):
        if not self._attempted:
            self._attempted = True
            redis_url = settings.REDIS_URL
            if not redis_url:
                return None
            try:
                import redis
                self._client = redis.from_url(
                    redis_url,
                    decode_responses=True,
                    socket_connect_timeout=1.5,
                    socket_timeout=1.5,
                    retry_on_timeout=False
                )
                self._client.ping()
                self._is_connected = True
                logger.info("Connected to Redis cache at %s", redis_url)
            except Exception as e:
                logger.warning("Redis is offline or unreachable (%s). Using in-memory caching fallback.", str(e))
                self._client = None
                self._is_connected = False
        return self._client if self._is_connected else None

    def get_json(self, key: str) -> Optional[Any]:
        """Fetch and deserialise JSON cached payload from Redis."""
        client = self._get_client()
        if not client:
            return None
        try:
            val = client.get(key)
            if val:
                return json.loads(val)
        except Exception:
            # Mark disconnected so we don't block on further calls
            self._is_connected = False
            return None
        return None

    def set_json(self, key: str, value: Any, ttl_seconds: int = 10) -> bool:
        """Store JSON serialised payload in Redis with expiration TTL."""
        client = self._get_client()
        if not client:
            return False
        try:
            client.setex(key, ttl_seconds, json.dumps(value))
            return True
        except Exception:
            self._is_connected = False
            return False

    def delete(self, key: str) -> bool:
        client = self._get_client()
        if not client:
            return False
        try:
            client.delete(key)
            return True
        except Exception:
            self._is_connected = False
            return False

    def is_active(self) -> bool:
        return self._is_connected

redis_cache = RedisCacheService()
