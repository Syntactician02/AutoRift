import json
import os
from datetime import datetime

_HERE = os.path.dirname(os.path.abspath(__file__))
LOG_FILE = os.path.normpath(os.path.join(_HERE, "..", "tasks_log.json"))


def _ensure_file():
    if not os.path.exists(LOG_FILE):
        with open(LOG_FILE, "w") as f:
            json.dump({}, f)


def load_tasks() -> dict:
    _ensure_file()
    with open(LOG_FILE, "r", encoding="utf-8") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return {}


def _write_tasks(tasks: dict):
    tmp = LOG_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(tasks, f, indent=2)
    os.replace(tmp, LOG_FILE)
    print(f"[TaskLogger] Written → {LOG_FILE}")


def save_task(task_id: str, task: str, shortcut_key: str = None,
              recorded_steps: list = None):
    tasks = load_tasks()
    tasks[task_id] = {
        "task": task,
        "shortcut_key": shortcut_key,
        "status": "logged",
        "created_at": datetime.utcnow().isoformat(),
        "recorded_steps": recorded_steps or [],
        "steps": []
    }
    _write_tasks(tasks)
    print(f"[TaskLogger] Saved task {task_id}")


def update_task_steps(task_id: str, steps: list):
    if not isinstance(steps, list):
        print(f"[TaskLogger] SKIP: got {type(steps)}, expected list")
        return
    tasks = load_tasks()
    if task_id in tasks:
        tasks[task_id]["steps"] = steps
        tasks[task_id]["status"] = "planned"
    _write_tasks(tasks)


def update_task_status(task_id: str, status: str):
    tasks = load_tasks()
    if task_id in tasks:
        tasks[task_id]["status"] = status
        tasks[task_id]["updated_at"] = datetime.utcnow().isoformat()
    _write_tasks(tasks)


def get_task_by_shortcut(shortcut_key: str) -> dict | None:
    tasks = load_tasks()
    for task_id, data in tasks.items():
        if data.get("shortcut_key") == shortcut_key:
            return {"task_id": task_id, **data}
    return None


def get_all_tasks() -> dict:
    return load_tasks()