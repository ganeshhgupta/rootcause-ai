# RootCause AI

**Autonomous telecom network operations multi-agent system.**

Monitor 20 nodes in real time → detect anomalies → diagnose root cause via RAG → execute remediation — with a human-in-the-loop gate for critical actions.

![Dashboard Preview](https://placehold.co/1200x600/0a1628/f59e0b?text=RootCause+AI+Dashboard)

---

## Architecture

```
Redis Stream (Upstash)
       ↓
  Event Generator (simulator)
       ↓
  ┌──────────────────────────────────────┐
  │         LangGraph Pipeline           │
  │                                      │
  │  Monitor Agent                       │
  │    → z-score anomaly detection       │
  │    → Groq LLM summary                │
  │         ↓                            │
  │  Diagnosis Agent                     │
  │    → ChromaDB semantic search        │
  │    → RAG over Wikipedia runbooks     │
  │    → Groq root-cause classification  │
  │         ↓                            │
  │  Remediation Agent                   │
  │    → Action plan (reroute/throttle/  │
  │      restart)                        │
  │         ↓                            │
  │  HITL Gate (interrupt)               │
  │    → NeonDB checkpoint               │
  │    → Waits for operator approval     │
  │         ↓                            │
  │  Executor                            │
  │    → HTTP call to Network Simulator  │
  └──────────────────────────────────────┘
       ↓
  SSE → Next.js Dashboard (Vercel)
       ↓
  NeonDB audit trail
```

---

## Services

| Service | Port | Description |
|---------|------|-------------|
| `backend` | 8000 | FastAPI — agents, SSE, approvals API |
| `simulator` | 8001 | FastAPI — 20-node network state machine |
| `frontend` | 3000 | Next.js 14 — live NOC dashboard |

---

## Quick Start (Docker Compose)

```bash
# 1. Clone
git clone https://github.com/ganeshhgupta/rootcause-ai
cd rootcause-ai

# 2. Set environment variables
cp .env.example .env
# Edit .env — fill in GROQ_API_KEY, DATABASE_URL, UPSTASH_REDIS_URL

# 3. Start all services
docker compose up --build

# 4. Open dashboard
open http://localhost:3000
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | ✅ | Groq API key (free at console.groq.com) |
| `GROQ_MODEL` | — | Default: `llama-3.1-8b-instant` |
| `DATABASE_URL` | ✅ | NeonDB connection string |
| `UPSTASH_REDIS_URL` | ✅ | Upstash Redis URL (free tier works) |
| `LANGCHAIN_API_KEY` | — | LangSmith tracing (optional) |
| `LANGCHAIN_TRACING_V2` | — | Set `true` to enable LangSmith |
| `SIMULATOR_URL` | — | Default: `http://localhost:8001` |
| `NEXT_PUBLIC_API_URL` | — | Backend URL for frontend |
| `ANOMALY_HITL_THRESHOLD` | — | Default: `0.8` |

---

## API Endpoints

```
GET  /health                          — health check
GET  /events/stream                   — SSE live event stream
GET  /approvals/pending               — pending HITL approvals
POST /approvals/{plan_id}/approve     — approve + execute
POST /approvals/{plan_id}/reject      — reject
GET  /traces/{event_id}               — full 3-agent decision trace
```

---

## How the RAG Corpus is Built

On first startup, `corpus_builder.py` fetches ~60 Wikipedia articles covering:
BGP routing, packet loss, DDoS attacks, hardware faults, DNS failures, congestion,
and more. Articles are chunked into ~600-word segments, embedded with
`sentence-transformers/all-MiniLM-L6-v2`, and stored in:
- **ChromaDB** (in-process, persisted to `./chroma_db/`) — for fast similarity search
- **NeonDB** — for audit trail and analytics

Subsequent startups skip rebuild if ≥80 rows exist.

---

## Deployment

**Backend → Render**
Configured in `render.yaml`. Set `DATABASE_URL`, `GROQ_API_KEY`, `UPSTASH_REDIS_URL`
as environment variables in the Render dashboard.

**Frontend → Vercel**
```bash
cd frontend
npx vercel --token <your_token>
```
Set `NEXT_PUBLIC_API_URL` to your Render backend URL.

---

## Tech Stack

- **LangGraph 0.2** — stateful multi-agent graph with interrupt/resume
- **Groq** — ultra-low-latency LLM inference (LLaMA 3.1)
- **ChromaDB** — in-process vector store
- **sentence-transformers** — local embeddings, no API key
- **NeonDB** — serverless Postgres (audit trail + checkpoints)
- **Upstash Redis Streams** — event pub/sub (XADD/XREAD)
- **FastAPI + SSE** — real-time event streaming
- **Next.js 14** — App Router dashboard
- **LangSmith** — observability + tracing
