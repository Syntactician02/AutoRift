import asyncio
from services.state_manager import state
from execution.pexpect_engine import run_command
from execution.browser_engine import run_browser_action
from services.error_handler import handle_error
from utils.task_logger import update_task_status, update_task_steps

async def execute_steps(steps: list, task_id: str):
    state.reset(task_id=task_id)
    state.is_running = True
    update_task_status(task_id, "running")
    state.log(f"[Executor] Starting task {task_id} with {len(steps)} steps")

    for i, step in enumerate(steps):
        state.current_step = i
        await state.wait_if_paused()

        injected = state.consume_injected_input()
        if injected:
            state.log(f"[Executor] Injected context at step {i}: {injected}")
            step["injected_context"] = injected

        state.log(f"[Executor] Step {i}: {step.get('description', step)}")

        try:
            if step.get("type") == "terminal":
                result = run_command(step["command"])
            elif step.get("type") == "browser":
                result = await run_browser_action(step)
            else:
                result = {"success": False, "error": f"Unknown type: {step.get('type')}"}

            state.log(f"[Executor] Step {i} result: {result}")

            if not result.get("success"):
                state.log(f"[Executor] Step {i} FAILED — calling AI error handler")
                fix = await handle_error(step, result.get("error", "Unknown"))
                update_task_status(task_id, "error")
                state.is_running = False
                return {"status": "error", "step": i, "fix": fix}

        except Exception as e:
            state.log(f"[Executor] Exception at step {i}: {e}")
            update_task_status(task_id, "error")
            state.is_running = False
            return {"status": "exception", "step": i, "error": str(e)}

    update_task_status(task_id, "completed")
    state.is_running = False
    state.log(f"[Executor] Task {task_id} COMPLETED")
    return {"status": "completed", "steps_executed": len(steps)}