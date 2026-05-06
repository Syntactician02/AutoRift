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


@router.post("/start-task")
async def start_task(request: TaskRequest, background_tasks: BackgroundTasks):
    task_id = request.task_id or str(uuid.uuid4())

    save_task(
        task_id=task_id,
        task=request.task,
        shortcut_key=request.shortcut_key,
        recorded_steps=request.recorded_steps or []
    )

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