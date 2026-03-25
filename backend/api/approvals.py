from fastapi import APIRouter, HTTPException
from db.audit_log import get_pending_approvals, approve_remediation, save_execution_result
from db.connection import get_connection
from agents.graph import resume_event

router = APIRouter()


@router.get("/approvals/pending")
async def list_pending_approvals():
    plans = await get_pending_approvals()
    return {"pending": plans, "count": len(plans)}


@router.post("/approvals/{plan_id}/approve")
async def approve_plan(plan_id: str):
    updated = await approve_remediation(plan_id, approved=True)
    if not updated:
        raise HTTPException(status_code=404, detail="Plan not found or already processed")

    # Fetch thread_id to resume graph
    async with get_connection() as conn:
        row = await conn.fetchrow(
            "SELECT thread_id FROM remediation_plans WHERE id = $1::uuid", plan_id
        )
    if not row or not row["thread_id"]:
        raise HTTPException(status_code=422, detail="No thread_id — cannot resume graph")

    final_state = await resume_event(row["thread_id"], approved=True)
    result = final_state.get("execution_result")

    if result:
        await save_execution_result(plan_id, dict(result))

    return {"approved": True, "plan_id": plan_id, "execution_result": result}


@router.post("/approvals/{plan_id}/reject")
async def reject_plan(plan_id: str):
    updated = await approve_remediation(plan_id, approved=False)
    if not updated:
        raise HTTPException(status_code=404, detail="Plan not found or already processed")

    async with get_connection() as conn:
        row = await conn.fetchrow(
            "SELECT thread_id FROM remediation_plans WHERE id = $1::uuid", plan_id
        )
    if row and row["thread_id"]:
        await resume_event(row["thread_id"], approved=False)

    return {"rejected": True, "plan_id": plan_id}
