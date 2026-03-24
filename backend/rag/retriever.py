import chromadb
from typing import List
from rag.embedder import embed_query

_client = chromadb.PersistentClient(path="./chroma_db")
_collection: chromadb.Collection | None = None


def _get_collection() -> chromadb.Collection:
    global _collection
    if _collection is None:
        _collection = _client.get_or_create_collection(
            name="runbooks",
            metadata={"hnsw:space": "cosine"},
        )
    return _collection


async def retrieve(query: str, top_k: int = 5) -> List[dict]:
    """Embed query and perform dense retrieval from ChromaDB."""
    query_embedding = await embed_query(query)
    collection = _get_collection()

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=min(top_k, collection.count() or 1),
        include=["documents", "metadatas", "distances"],
    )

    items = []
    docs = results.get("documents", [[]])[0]
    metas = results.get("metadatas", [[]])[0]
    dists = results.get("distances", [[]])[0]

    for doc, meta, dist in zip(docs, metas, dists):
        items.append({
            "title": meta.get("title", ""),
            "content": doc,
            "failure_type": meta.get("failure_type", ""),
            "distance": dist,
            "chunk_id": meta.get("chunk_id", ""),
        })

    return items
