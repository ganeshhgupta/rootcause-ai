"""
pubsub_client.py — Upstash Redis Streams for event pub/sub.
Uses XADD to publish, XREAD BLOCK to subscribe (real streaming, not polling).
"""
import os
import json
import asyncio
from typing import AsyncGenerator

import redis.asyncio as aioredis

_REDIS_URL = os.environ.get("UPSTASH_REDIS_URL")
if not _REDIS_URL:
    raise ValueError(
        "UPSTASH_REDIS_URL environment variable is required but not set. "
        "Create a free Redis database at upstash.com and paste the connection URL."
    )

STREAM_KEY = "network-events"

_redis: aioredis.Redis | None = None


def _get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(_REDIS_URL, decode_responses=True)
    return _redis


async def publish_event(event: dict) -> str:
    """Publish a network event dict to the Redis stream. Returns the message ID."""
    r = _get_redis()
    msg_id = await r.xadd(STREAM_KEY, {"payload": json.dumps(event)})
    return msg_id


async def subscribe_events() -> AsyncGenerator[dict, None]:
    """
    Async generator that yields parsed network event dicts from the Redis stream.
    Uses XREAD BLOCK 2000ms so it truly blocks until a message arrives.
    Starts from the latest message at connection time (not replaying history).
    """
    r = _get_redis()
    # Start reading from "now" (only new messages)
    last_id = "$"
    while True:
        try:
            results = await r.xread(
                {STREAM_KEY: last_id},
                count=10,
                block=2000,  # block up to 2 seconds
            )
            if not results:
                continue
            for _stream_name, messages in results:
                for msg_id, fields in messages:
                    last_id = msg_id
                    try:
                        event = json.loads(fields["payload"])
                        yield event
                    except (json.JSONDecodeError, KeyError):
                        continue
        except aioredis.RedisError as exc:
            # Back off and retry on transient errors
            await asyncio.sleep(2)
            continue


async def close() -> None:
    global _redis
    if _redis:
        await _redis.aclose()
        _redis = None
