import threading
from services.state_manager import state
from services.error_handler import handle_error
from services.planner import generate_plan
from execution.pexpect_engine import run_command
from execution.browser_engine import execute_browser_step
from execution.app_controller import execute_app_step
from utils.logger import get_logger
from utils.helpers import format_step_log

logger = get_logger(__name__)

# Stores the result of the last completed execution
_last_execution_result: dict = {}
_execution_lock = threading.Lock()


def get_last_result() -> dict:
    with _execution_lock:
        return dict(_last_execution_result)


def _set_last_result(result: dict):
    with _execution_lock:
        _last_execution_result.clear()
        _last_execution_result.update(result)


def _execute_step(step: dict) -> dict:
    """Route a single step to the appropriate engine."""
    step_type = step.get("type", "terminal")

    if step_type == "terminal":
        command = step.get("command", "")
        return run_command(command)

    elif step_type == "browser":
        return execute_browser_step(step)

    elif step_type == "app":
        return execute_app_step(step)

    else:
        logger.warning(f"Unknown step type: {step_type}")
        return {"success": False, "error": f"Unknown step type: {step_type}"}


def _run_task_thread(task: str):
    """
    Core execution loop — runs in a background thread.
    Supports pause/resume, injected input, and error handling.
    """
    logger.info(f"Starting task execution thread for: {task}")
    steps = generate_plan(task)

    if not steps:
        logger.error("No steps generated for task.")
        state.stop()
        _set_last_result({
            "success": False,
            "message": "AI could not generate a plan for this task.",
            "steps_completed": 0,
        })
        return

    state.start(task=task, total=len(steps))
    completed = []
    errors = []

    for i, step in enumerate(steps):
        # Respect pause
        state.wait_if_paused()

        # Check for stop
        if not state.is_running:
            logger.info("Execution stopped externally.")
            break

        state.current_step_index = i
        log = format_step_log(i, step)
        logger.info(f"Executing: {log}")

        # Check for injected user input
        injected = state.consume_injected_input()
        if injected:
            logger.info(f"Injected instruction at step {i}: {injected}")
            # Prepend injected instruction as an extra terminal step
            inject_step = {
                "type": "terminal",
                "command": injected,
                "description": "User-injected instruction",
            }
            result = _execute_step(inject_step)
            if not result.get("success"):
                logger.warning(f"Injected step failed: {result}")

        # Execute main step
        result = _execute_step(step)

        if result.get("success"):
            completed.append({"step": step, "output": result.get("stdout", result.get("output", ""))})
            state.advance_step()
        else:
            error_info = handle_error(
                command=step.get("command", str(step)),
                error_output=result.get("error", "Unknown error"),
            )
            errors.append(error_info)
            logger.error(f"Step {i} failed. Error info: {error_info}")

            # For MVP: log the suggested fix and continue (user can override via /input)
            if error_info.get("fix_command"):
                logger.info(f"Attempting auto-fix: {error_info['fix_command']}")
                fix_result = run_command(error_info["fix_command"])
                if fix_result.get("success"):
                    logger.info("Auto-fix succeeded. Retrying original step...")
                    retry = _execute_step(step)
                    if retry.get("success"):
                        completed.append({"step": step, "output": retry.get("stdout", "")})
                        state.advance_step()
                        continue

            logger.warning(f"Skipping step {i} after failed fix attempt.")
            state.advance_step()

    state.stop()

    _set_last_result({
        "success": len(errors) == 0,
        "message": "Task completed." if not errors else f"Task completed with {len(errors)} error(s).",
        "steps_completed": len(completed),
        "steps_total": len(steps),
        "errors": errors,
    })
    logger.info("Task execution thread finished.")


def start_task_execution(task: str):
    """
    Start a new task in a background daemon thread.
    Prevents running multiple tasks simultaneously.
    """
    if state.is_running:
        logger.warning("A task is already running. Ignoring new start request.")
        return {"success": False, "message": "A task is already running."}

    thread = threading.Thread(target=_run_task_thread, args=(task,), daemon=True)
    thread.start()
    logger.info("Task thread started.")
    return {"success": True, "message": f"Task started: {task}"}