"""
corpus_builder.py — fetches real telecom/networking articles from Wikipedia API,
chunks them into runbook-sized documents, embeds, and stores in NeonDB + ChromaDB.
No hardcoded content. Idempotent: skips if NeonDB already has >= 80 rows.
"""
import asyncio
import hashlib
import re
from typing import List

import httpx
import chromadb

from db.connection import get_connection
from rag.embedder import embed_texts

_chroma_client = chromadb.PersistentClient(path="./chroma_db")

# Wikipedia articles grouped by failure_type.
# Each tuple: (wikipedia_page_title, failure_type)
WIKI_SOURCES = [
    # latency_spike
    ("Network delay", "latency_spike"),
    ("Latency (engineering)", "latency_spike"),
    ("Bufferbloat", "latency_spike"),
    ("Quality of service", "latency_spike"),
    ("Jitter (networking)", "latency_spike"),
    ("TCP congestion control", "latency_spike"),
    ("Round-trip delay", "latency_spike"),
    ("Network performance", "latency_spike"),

    # packet_loss
    ("Packet loss", "packet_loss"),
    ("Error detection and correction", "packet_loss"),
    ("Forward error correction", "packet_loss"),
    ("Automatic repeat request", "packet_loss"),
    ("Bit error rate", "packet_loss"),
    ("Cyclic redundancy check", "packet_loss"),

    # throughput_degradation
    ("Throughput", "throughput_degradation"),
    ("Bandwidth (computing)", "throughput_degradation"),
    ("Network congestion", "throughput_degradation"),
    ("Traffic shaping", "throughput_degradation"),
    ("Bandwidth throttling", "throughput_degradation"),
    ("Goodput", "throughput_degradation"),

    # node_failure
    ("Failover", "node_failure"),
    ("High availability", "node_failure"),
    ("Fault tolerance", "node_failure"),
    ("Redundancy (engineering)", "node_failure"),
    ("Network redundancy", "node_failure"),
    ("Mean time between failures", "node_failure"),

    # bgp_instability
    ("Border Gateway Protocol", "bgp_instability"),
    ("BGP hijacking", "bgp_instability"),
    ("Route flapping", "bgp_instability"),
    ("Autonomous system (Internet)", "bgp_instability"),
    ("Classless Inter-Domain Routing", "bgp_instability"),
    ("OSPF", "bgp_instability"),

    # dns_failure
    ("Domain Name System", "dns_failure"),
    ("DNS spoofing", "dns_failure"),
    ("DNS over HTTPS", "dns_failure"),
    ("DNSSEC", "dns_failure"),
    ("DNS root zone", "dns_failure"),

    # hardware_fault
    ("Small form-factor pluggable transceiver", "hardware_fault"),
    ("Network switch", "hardware_fault"),
    ("Router (computing)", "hardware_fault"),
    ("Power supply unit (computer)", "hardware_fault"),
    ("Printed circuit board", "hardware_fault"),
    ("Mean time to repair", "hardware_fault"),

    # congestion
    ("Network congestion", "congestion"),
    ("Explicit Congestion Notification", "congestion"),
    ("Active queue management", "congestion"),
    ("Random early detection", "congestion"),
    ("Leaky bucket", "congestion"),
    ("Token bucket", "congestion"),

    # ddos_attack
    ("Denial-of-service attack", "ddos_attack"),
    ("SYN flood", "ddos_attack"),
    ("Botnet", "ddos_attack"),
    ("IP address spoofing", "ddos_attack"),
    ("Intrusion detection system", "ddos_attack"),
    ("Anycast", "ddos_attack"),

    # misconfiguration
    ("Network address translation", "misconfiguration"),
    ("Access control list", "misconfiguration"),
    ("VLAN", "misconfiguration"),
    ("Spanning Tree Protocol", "misconfiguration"),
    ("Firewall (computing)", "misconfiguration"),
    ("Network Time Protocol", "misconfiguration"),
]


def _chunk_text(text: str, title: str, failure_type: str, chunk_size: int = 600) -> List[dict]:
    """Split Wikipedia article text into ~600-word chunks suitable as runbook entries."""
    # Clean wiki markup artifacts
    text = re.sub(r"=+\s*[^=]+\s*=+", "", text)
    text = re.sub(r"\[\d+\]", "", text)
    text = re.sub(r"\s{2,}", " ", text).strip()

    words = text.split()
    chunks = []
    for i in range(0, len(words), chunk_size):
        chunk_words = words[i : i + chunk_size]
        if len(chunk_words) < 80:
            continue  # skip tiny tail chunks
        content = " ".join(chunk_words)
        chunk_title = f"{title} — Part {i // chunk_size + 1}"
        chunk_id = hashlib.md5(content.encode()).hexdigest()[:12]
        chunks.append({
            "title": chunk_title,
            "content": content,
            "failure_type": failure_type,
            "chunk_id": chunk_id,
        })
    return chunks


async def _fetch_wiki_extract(session: httpx.AsyncClient, page_title: str) -> str:
    """Fetch plain-text extract of a Wikipedia article via the MediaWiki API."""
    params = {
        "action": "query",
        "prop": "extracts",
        "exintro": False,
        "explaintext": True,
        "titles": page_title,
        "format": "json",
        "exsectionformat": "plain",
    }
    try:
        resp = await session.get(
            "https://en.wikipedia.org/w/api.php",
            params=params,
            timeout=20.0,
        )
        resp.raise_for_status()
        data = resp.json()
        pages = data.get("query", {}).get("pages", {})
        for page in pages.values():
            return page.get("extract", "")
    except (httpx.HTTPError, Exception):
        pass
    return ""


async def build_corpus() -> None:
    """
    Fetch Wikipedia articles, chunk them, embed, and store in NeonDB + ChromaDB.
    Idempotent: skips entirely if runbooks table already has >= 80 rows.
    """
    async with get_connection() as conn:
        count = await conn.fetchval("SELECT COUNT(*) FROM runbooks")
    if count >= 80:
        print(f"[corpus_builder] Corpus already built ({count} runbooks). Skipping.")
        return

    print("[corpus_builder] Fetching Wikipedia articles...")
    all_chunks: List[dict] = []

    async with httpx.AsyncClient(headers={"User-Agent": "RootCauseAI/1.0"}) as session:
        tasks = [_fetch_wiki_extract(session, title) for title, _ in WIKI_SOURCES]
        texts = await asyncio.gather(*tasks)

    for (page_title, failure_type), text in zip(WIKI_SOURCES, texts):
        if not text:
            print(f"[corpus_builder] WARNING: No content for '{page_title}', skipping")
            continue
        chunks = _chunk_text(text, page_title, failure_type)
        all_chunks.extend(chunks)

    if not all_chunks:
        raise RuntimeError("corpus_builder: No chunks produced. Check network access to Wikipedia.")

    print(f"[corpus_builder] Embedding {len(all_chunks)} chunks...")
    contents = [c["content"] for c in all_chunks]
    embeddings = await embed_texts(contents)

    # Insert into NeonDB
    async with get_connection() as conn:
        async with conn.transaction():
            for chunk, emb in zip(all_chunks, embeddings):
                await conn.execute(
                    """
                    INSERT INTO runbooks (title, content, failure_type, embedding)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT DO NOTHING
                    """,
                    chunk["title"],
                    chunk["content"],
                    chunk["failure_type"],
                    emb,
                )

    # Build ChromaDB collection
    collection = _chroma_client.get_or_create_collection(
        name="runbooks",
        metadata={"hnsw:space": "cosine"},
    )
    # Add in batches to avoid ChromaDB limits
    batch_size = 100
    for i in range(0, len(all_chunks), batch_size):
        batch_chunks = all_chunks[i : i + batch_size]
        batch_embeddings = embeddings[i : i + batch_size]
        collection.add(
            documents=[c["content"] for c in batch_chunks],
            metadatas=[{
                "title": c["title"],
                "failure_type": c["failure_type"],
                "chunk_id": c["chunk_id"],
            } for c in batch_chunks],
            ids=[c["chunk_id"] for c in batch_chunks],
            embeddings=batch_embeddings,
        )

    print(f"[corpus_builder] Done. {len(all_chunks)} runbook chunks stored.")
