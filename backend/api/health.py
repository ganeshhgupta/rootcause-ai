import os
from datetime import datetime, timezone
from fastapi import APIRouter
from db.connection import get_connection
import chromadb

router = APIRouter()


@router.get("/health")
async def health_check():
    # DB check
    db_status = "disconnected"
    try:
        async with get_connection() as conn:
            await conn.fetchval("SELECT 1")
        db_status = "connected"
    except Exception:
        pass

    # ChromaDB / corpus check
    corpus_ready = False
    try:
        client = chromadb.PersistentClient(path="./chroma_db")
        col = client.get_or_create_collection("runbooks")
        corpus_ready = col.count() > 0
    except Exception:
        pass

    return {
        "status": "ok",
        "db": db_status,
        "corpus_ready": corpus_ready,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
