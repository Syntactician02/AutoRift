import json
import os
from datetime import datetime

LOG_FILE = os.path.join(os.path.dirname(__file__), "../tasks_log.json")

def load_tasks() -> dict:
    if not os.path.exists(LOG_FILE):
        return {}
    with open(LOG_FILE, "r") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return {}

def save_task(task_id: str, task: str, shortcut_key: str = None,
              recorded_steps: list = None):
    tasks = load_tasks()
    tasks[task_id] = {
        "task": task,
        "shortcut_key": shortcut_key,
        "status": "logged",
        "created_at": datetime.utcnow().isoformat(),
        "steps": [],
        "recorded_steps": recorded_steps or [],
    }
    with open(LOG_FILE, "w") as f:
        json.dump(tasks, f, indent=2)
    print(f"[TaskLogger] Saved task {task_id}")

def update_task_steps(task_id: str, steps: list):
    tasks = load_tasks()
    if task_id in tasks:
        tasks[task_id]["steps"] = steps
        tasks[task_id]["status"] = "planned"
    with open(LOG_FILE, "w") as f:
        json.dump(tasks, f, indent=2)

def update_task_status(task_id: str, status: str):
    tasks = load_tasks()
    if task_id in tasks:
        tasks[task_id]["status"] = status
        tasks[task_id]["updated_at"] = datetime.utcnow().isoformat()
    with open(LOG_FILE, "w") as f:
        json.dump(tasks, f, indent=2)

def get_task_by_shortcut(shortcut_key: str) -> dict | None:
    tasks = load_tasks()
    for task_id, data in tasks.items():
        if data.get("shortcut_key") == shortcut_key:
            return {"task_id": task_id, **data}
    return None

def get_all_tasks() -> dict:
    return load_tasks()