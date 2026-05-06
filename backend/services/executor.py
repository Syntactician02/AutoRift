import asyncio
from services.state_manager import state
from execution.pexpect_engine import run_command
from execution.browser_engine import run_browser_action, close_browser
from services.error_handler import handle_error
from utils.task_logger import update_task_status


async def execute_steps(steps: list, task_id: str):
    state.reset(task_id=task_id)
    state.is_running = True
    update_task_status(task_id, "running")
    state.log(f"[Executor] Starting task {task_id} with {len(steps)} steps")

    error_occurred = False

    for i, step in enumerate(steps):
        state.current_step = i
        await state.wait_if_paused()

        if not state.is_running:
            state.log("[Executor] Stopped externally")
            break

        injected = state.consume_injected_input()
        if injected:
            state.log(f"[Executor] Injected at step {i}: {injected}")
            step["injected_context"] = injected

        label = step.get("description", step.get("action", step.get("command", "?")))
        state.log(f"[Executor] Step {i+1}/{len(steps)}: {label}")

        try:
            if step.get("type") == "terminal":
                result = await asyncio.get_event_loop().run_in_executor(
                    None, run_command, step.get("command", "")
                )
            elif step.get("type") == "browser":
                result = await run_browser_action(step)
            else:
                result = {"success": False, "error": f"Unknown type: {step.get('type')}"}

            state.log(f"[Executor] Step {i+1} → success={result.get('success')} | {str(result.get('stdout', result.get('error', '')))[:120]}")

            if not result.get("success"):
                state.log(f"[Executor] Step {i+1} FAILED — calling AI error handler")
                fix = await handle_error(step, result.get("error", "Unknown error"))
                state.log(f"[Executor] AI: {fix.get('suggestion', '')}")
                error_occurred = True
                update_task_status(task_id, "error")
                state.is_running = False
                break

        except Exception as e:
            state.log(f"[Executor] Exception at step {i+1}: {e}")
            error_occurred = True
            update_task_status(task_id, "error")
            state.is_running = False
            break

    await close_browser()

    if not error_occurred:
        update_task_status(task_id, "completed")
        state.log(f"[Executor] Task {task_id} COMPLETED ✓")

    state.is_running = False
    return {
        "status": "error" if error_occurred else "completed",
        "steps_executed": state.current_step + 1
    }