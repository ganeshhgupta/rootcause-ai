"""
action_executor.py — makes real HTTP calls to the network simulator.
"""
import os
import httpx
from agents.state import RemediationPlan, ExecutionResult

_SIMULATOR_URL = os.environ.get("SIMULATOR_URL", "http://localhost:8001")
_TIMEOUT = 5.0


async def execute_action(plan: RemediationPlan) -> ExecutionResult:
    action = plan["action_type"]
    node = plan["target_node"]
    params = plan["parameters"]

    endpoint_map = {
        "reroute": "/network/reroute",
        "throttle": "/network/throttle",
        "restart": "/network/restart",
    }
    endpoint = endpoint_map.get(action, "/network/reroute")
    body = {"node_id": node, **params}

    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.post(f"{_SIMULATOR_URL}{endpoint}", json=body)
            resp.raise_for_status()
            data = resp.json()
            return ExecutionResult(
                success=data.get("success", True),
                action_taken=f"{action} on {node}",
                response_code=resp.status_code,
                message=str(data),
            )
    except httpx.TimeoutException:
        return ExecutionResult(
            success=False,
            action_taken=f"{action} on {node}",
            response_code=408,
            message="Simulator request timed out after 5s",
        )
    except httpx.HTTPStatusError as exc:
        return ExecutionResult(
            success=False,
            action_taken=f"{action} on {node}",
            response_code=exc.response.status_code,
            message=exc.response.text,
        )
    except httpx.RequestError as exc:
        return ExecutionResult(
            success=False,
            action_taken=f"{action} on {node}",
            response_code=503,
            message=f"Cannot reach simulator: {exc}",
        )
