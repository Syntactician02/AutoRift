import uuid
from fastapi import APIRouter, BackgroundTasks
from models.task_model import TaskRequest, ShortcutTrigger
from services.planner import plan_task
from services.executor import execute_steps
from utils.task_logger import (
    save_task, get_all_tasks,
    get_task_by_shortcut, update_task_steps
)

router = APIRouter()


@router.post("/demo")
async def run_demo(background_tasks: BackgroundTasks):
    """Quick demo: opens Google and searches for AutoRift"""
    task_id = str(uuid.uuid4())
    steps = [
        {"type": "browser", "action": "open_url", "params": {"url": "https://www.google.com"}, "description": "Open Google"},
        {"type": "browser", "action": "click", "params": {"selector": "textarea[name='q']"}, "description": "Click search box"},
        {"type": "browser", "action": "type", "params": {"selector": "textarea[name='q']", "text": "AutoRift automation"}, "description": "Type search query"},
        {"type": "browser", "action": "keydown", "params": {"key": "Enter"}, "description": "Press Enter to search"},
    ]
    from utils.task_logger import save_task, update_task_steps
    save_task(task_id=task_id, task="Demo: Search Google", shortcut_key=None, recorded_steps=[])
    update_task_steps(task_id, steps)
    background_tasks.add_task(execute_steps, steps, task_id)
    return {"status": "started", "task_id": task_id, "message": "Demo running — watch for a browser window!"}



@router.post("/start-task")
async def start_task(request: TaskRequest, background_tasks: BackgroundTasks):
    task_id = request.task_id or str(uuid.uuid4())

    save_task(
        task_id=task_id,
        task=request.task,
        shortcut_key=request.shortcut_key,
        recorded_steps=request.recorded_steps or []
    )

    # REPLAY mode: if recorded_steps provided, convert them directly without re-planning via Gemini
    if request.recorded_steps:
        steps = _convert_recorded_to_executable(request.recorded_steps)
        print(f"[REPLAY] Using {len(steps)} recorded steps directly (no AI re-planning)")
    else:
        steps = await plan_task(request.task)

    if not steps:
        return {
            "status": "error",
            "message": "Planner returned no steps. Check GEMINI_API_KEY in .env"
        }

    update_task_steps(task_id, steps)
    background_tasks.add_task(execute_steps, steps, task_id)

    return {
        "status": "started",
        "task_id": task_id,
        "steps_planned": len(steps),
        "shortcut_key": request.shortcut_key,
        "steps": steps
    }


def _convert_recorded_to_executable(recorded_steps: list) -> list:
    """Convert frontend-recorded steps (click/input/keydown/navigate) into
    executor-compatible steps with type=browser or type=terminal."""
    executable = []
    for s in recorded_steps:
        step_type = s.get("type", "")
        payload = s.get("payload", {})

        if step_type == "navigate":
            executable.append({
                "type": "browser",
                "action": "open_url",
                "params": {"url": payload.get("url", "")},
                "description": f"Navigate to {payload.get('url', '')}",
            })
        elif step_type == "click":
            selector = payload.get("selector", "body")
            x = payload.get("x")
            y = payload.get("y")

            # If selector is screen(x,y) format, extract coordinates
            import re
            m = re.match(r"screen\((\d+),\s*(\d+)\)", selector) if selector else None
            if m:
                x, y = int(m.group(1)), int(m.group(2))
                params = {"x": x, "y": y}
            elif x is not None and y is not None:
                params = {"x": x, "y": y}
            else:
                params = {"selector": selector}

            executable.append({
                "type": "browser",
                "action": "click",
                "params": params,
                "description": f"Click {payload.get('text', selector)}",
            })
        elif step_type == "input":
            executable.append({
                "type": "browser",
                "action": "type",
                "params": {
                    "selector": payload.get("selector", "body"),
                    "text": payload.get("value", ""),
                },
                "description": f"Type into {payload.get('selector', '')}",
            })
        elif step_type == "keydown":
            key = payload.get("key", "")
            # Map keydown to a JS keypress via terminal fallback
            executable.append({
                "type": "browser",
                "action": "keydown",
                "params": {"key": key},
                "description": f"Press key: {key}",
            })
        # scroll and other unknown types are skipped gracefully
    return executable


@router.post("/run-by-shortcut")
async def run_by_shortcut(payload: ShortcutTrigger, background_tasks: BackgroundTasks):
    task_data = get_task_by_shortcut(payload.shortcut_key)
    if not task_data:
        return {
            "status": "error",
            "message": f"No task saved for shortcut: {payload.shortcut_key}"
        }

    steps = await plan_task(task_data["task"])
    if not steps:
        return {"status": "error", "message": "Failed to re-plan task"}

    update_task_steps(task_data["task_id"], steps)
    background_tasks.add_task(execute_steps, steps, task_data["task_id"])

    return {
        "status": "started",
        "task_id": task_data["task_id"],
        "task": task_data["task"],
        "shortcut_key": payload.shortcut_key,
        "steps_planned": len(steps)
    }


@router.get("/tasks")
async def list_tasks():
    return get_all_tasks()