import os
import uuid
import json
import asyncio
from typing import Literal

from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.base import BaseCheckpointSaver, Checkpoint, CheckpointMetadata
from langgraph.types import interrupt

from agents.state import AgentState, NetworkEvent
from agents.monitor_agent import monitor_agent
from agents.diagnosis_agent import diagnosis_agent
from agents.remediation_agent import remediation_agent
from tools.action_executor import execute_action
from db.connection import get_connection


# ── NeonDB Checkpointer ────────────────────────────────────────────────────

class NeonCheckpointer(BaseCheckpointSaver):
    """Stores LangGraph checkpoints in NeonDB graph_checkpoints table."""

    async def aget(self, config: dict) -> Checkpoint | None:
        thread_id = config["configurable"].get("thread_id")
        if not thread_id:
            return None
        async with get_connection() as conn:
            row = await conn.fetchrow(
                "SELECT checkpoint_data FROM graph_checkpoints WHERE thread_id = $1",
                thread_id,
            )
        if not row:
            return None
        return json.loads(row["checkpoint_data"])

    async def aput(
        self,
        config: dict,
        checkpoint: Checkpoint,
        metadata: CheckpointMetadata,
        new_versions: dict,
    ) -> dict:
        thread_id = config["configurable"].get("thread_id", str(uuid.uuid4()))
        async with get_connection() as conn:
            await conn.execute(
                """
                INSERT INTO graph_checkpoints (thread_id, checkpoint_data, state_data, updated_at)
                VALUES ($1, $2::jsonb, $3::jsonb, NOW())
                ON CONFLICT (thread_id) DO UPDATE
                SET checkpoint_data = EXCLUDED.checkpoint_data,
                    state_data = EXCLUDED.state_data,
                    updated_at = NOW()
                """,
                thread_id,
                json.dumps(checkpoint),
                json.dumps(metadata),
            )
        return {**config, "configurable": {**config.get("configurable", {}), "thread_id": thread_id}}

    async def aget_tuple(self, config: dict):
        return None

    async def alist(self, config: dict, **kwargs):
        return
        yield  # make it a generator


# ── Node functions ─────────────────────────────────────────────────────────

async def monitor_node(state: AgentState) -> AgentState:
    return await monitor_agent(state)


async def diagnosis_node(state: AgentState) -> AgentState:
    return await diagnosis_agent(state)


async def remediation_node(state: AgentState) -> AgentState:
    return await remediation_agent(state)


async def hitl_node(state: AgentState) -> AgentState:
    """Genuine LangGraph interrupt — suspends graph until resume_event() is called."""
    human_decision = interrupt({
        "message": "Human approval required",
        "plan": state["remediation_plan"],
        "event_id": state["event_id"],
        "plan_id": state.get("remediation_plan_id"),
    })
    return {**state, "human_approved": human_decision}


async def executor_node(state: AgentState) -> AgentState:
    plan = state["remediation_plan"]
    result = await execute_action(plan)
    return {**state, "execution_result": result}


# ── Routing ────────────────────────────────────────────────────────────────

def route_after_remediation(state: AgentState) -> Literal["hitl_node", "executor_node"]:
    if state["remediation_plan"]["requires_approval"]:
        return "hitl_node"
    return "executor_node"


def route_after_hitl(state: AgentState) -> Literal["executor_node", "__end__"]:
    if state.get("human_approved") is True:
        return "executor_node"
    return "__end__"


# ── Build graph ────────────────────────────────────────────────────────────

_checkpointer = NeonCheckpointer()

_builder = StateGraph(AgentState)
_builder.add_node("monitor_node", monitor_node)
_builder.add_node("diagnosis_node", diagnosis_node)
_builder.add_node("remediation_node", remediation_node)
_builder.add_node("hitl_node", hitl_node)
_builder.add_node("executor_node", executor_node)

_builder.add_edge(START, "monitor_node")
_builder.add_edge("monitor_node", "diagnosis_node")
_builder.add_edge("diagnosis_node", "remediation_node")
_builder.add_conditional_edges("remediation_node", route_after_remediation)
_builder.add_conditional_edges("hitl_node", route_after_hitl)
_builder.add_edge("executor_node", END)

graph = _builder.compile(checkpointer=_checkpointer, interrupt_before=["hitl_node"])


async def run_event(event: NetworkEvent) -> tuple[AgentState, str]:
    thread_id = str(uuid.uuid4())
    config = {"configurable": {"thread_id": thread_id}}

    initial_state = AgentState(
        event=event,
        event_id=None,
        anomaly_summary=None,
        diagnosis=None,
        remediation_plan=None,
        remediation_plan_id=None,
        human_approved=None,
        execution_result=None,
        error=None,
        thread_id=thread_id,
    )

    final_state = await graph.ainvoke(initial_state, config=config)
    return final_state, thread_id


async def resume_event(thread_id: str, approved: bool) -> AgentState:
    config = {"configurable": {"thread_id": thread_id}}
    final_state = await graph.ainvoke(
        Command(resume=approved),
        config=config,
    )
    return final_state


# Import Command after graph is built to avoid circular issues
from langgraph.types import Command
