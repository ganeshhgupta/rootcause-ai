"""
Embedder — uses sentence-transformers/all-MiniLM-L6-v2 (local, no API key required).
Loaded once at module init; embed_texts and embed_query are async-compatible wrappers.
"""
import asyncio
from typing import List
from sentence_transformers import SentenceTransformer

_model = SentenceTransformer("all-MiniLM-L6-v2")


async def embed_texts(texts: List[str]) -> List[List[float]]:
    loop = asyncio.get_event_loop()
    embeddings = await loop.run_in_executor(
        None, lambda: _model.encode(texts, batch_size=64, show_progress_bar=False)
    )
    return [emb.tolist() for emb in embeddings]


async def embed_query(text: str) -> List[float]:
    results = await embed_texts([text])
    return results[0]
