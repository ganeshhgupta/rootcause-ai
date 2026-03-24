import os
import asyncpg
from pathlib import Path

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is required but not set")

_pool: asyncpg.Pool | None = None


async def init_pool() -> None:
    global _pool
    _pool = await asyncpg.create_pool(
        DATABASE_URL,
        min_size=2,
        max_size=10,
        command_timeout=30,
    )


async def close_pool() -> None:
    global _pool
    if _pool:
        await _pool.close()
        _pool = None


async def run_migrations() -> None:
    sql_path = Path(__file__).parent / "migrations.sql"
    sql = sql_path.read_text()
    async with get_connection() as conn:
        await conn.execute(sql)


class get_connection:
    """Async context manager returning an asyncpg connection from the pool."""

    async def __aenter__(self) -> asyncpg.Connection:
        if _pool is None:
            raise RuntimeError("Database pool not initialized. Call init_pool() first.")
        self._conn = await _pool.acquire()
        return self._conn

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        await _pool.release(self._conn)
