import json
from typing import Any
from uuid import UUID
from db.connection import get_connection


async def insert_network_event(event_data: dict) -> str:
    async with get_connection() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO network_events
                (node_id, latency_ms, packet_loss_pct, throughput_mbps, anomaly_score, severity)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id::text
            """,
            event_data["node_id"],
            float(event_data["latency_ms"]),
            float(event_data["packet_loss_pct"]),
            float(event_data["throughput_mbps"]),
            float(event_data["anomaly_score"]),
            event_data["severity"],
        )
        return row["id"]


async def insert_agent_decision(decision_data: dict) -> str:
    async with get_connection() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO agent_decisions
                (event_id, agent_name, input_state, output_state, latency_ms, token_count)
            VALUES ($1::uuid, $2, $3::jsonb, $4::jsonb, $5, $6)
            RETURNING id::text
            """,
            decision_data["event_id"],
            decision_data["agent_name"],
            json.dumps(decision_data["input_state"]),
            json.dumps(decision_data["output_state"]),
            int(decision_data["latency_ms"]),
            decision_data.get("token_count"),
        )
        return row["id"]


async def insert_remediation_plan(plan_data: dict) -> str:
    async with get_connection() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO remediation_plans
                (event_id, thread_id, action_type, target_node, parameters,
                 confidence, requires_approval)
            VALUES ($1::uuid, $2, $3, $4, $5::jsonb, $6, $7)
            RETURNING id::text
            """,
            plan_data["event_id"],
            plan_data.get("thread_id"),
            plan_data["action_type"],
            plan_data["target_node"],
            json.dumps(plan_data["parameters"]),
            float(plan_data["confidence"]),
            bool(plan_data["requires_approval"]),
        )
        return row["id"]


async def get_pending_approvals() -> list[dict]:
    async with get_connection() as conn:
        rows = await conn.fetch(
            """
            SELECT
                rp.id::text AS plan_id,
                rp.event_id::text,
                rp.thread_id,
                rp.action_type,
                rp.target_node,
                rp.parameters,
                rp.confidence,
                rp.created_at::text,
                ne.node_id,
                ne.latency_ms,
                ne.packet_loss_pct,
                ne.throughput_mbps,
                ne.anomaly_score,
                ne.severity
            FROM remediation_plans rp
            JOIN network_events ne ON ne.id = rp.event_id
            WHERE rp.requires_approval = TRUE AND rp.approved = FALSE
            ORDER BY rp.created_at DESC
            """
        )
        return [dict(r) for r in rows]


async def approve_remediation(plan_id: str, approved: bool) -> bool:
    async with get_connection() as conn:
        result = await conn.execute(
            """
            UPDATE remediation_plans
            SET approved = $1, approved_at = NOW()
            WHERE id = $2::uuid AND requires_approval = TRUE
            """,
            approved,
            plan_id,
        )
        return result == "UPDATE 1"


async def save_execution_result(plan_id: str, result: dict) -> None:
    async with get_connection() as conn:
        await conn.execute(
            """
            UPDATE remediation_plans
            SET execution_result = $1::jsonb
            WHERE id = $2::uuid
            """,
            json.dumps(result),
            plan_id,
        )


async def get_event_trace(event_id: str) -> dict:
    async with get_connection() as conn:
        event_row = await conn.fetchrow(
            "SELECT * FROM network_events WHERE id = $1::uuid", event_id
        )
        if not event_row:
            return {}

        decision_rows = await conn.fetch(
            """
            SELECT agent_name, input_state, output_state, latency_ms, token_count, created_at
            FROM agent_decisions WHERE event_id = $1::uuid ORDER BY created_at
            """,
            event_id,
        )

        plan_row = await conn.fetchrow(
            "SELECT * FROM remediation_plans WHERE event_id = $1::uuid ORDER BY created_at DESC LIMIT 1",
            event_id,
        )

        decisions_by_agent = {r["agent_name"]: dict(r) for r in decision_rows}
        total_latency = sum(r["latency_ms"] for r in decision_rows)

        return {
            "event": dict(event_row),
            "monitor_decision": decisions_by_agent.get("monitor"),
            "diagnosis_decision": decisions_by_agent.get("diagnosis"),
            "remediation_decision": decisions_by_agent.get("remediation"),
            "execution_result": dict(plan_row)["execution_result"] if plan_row and plan_row["execution_result"] else None,
            "total_latency_ms": total_latency,
        }
