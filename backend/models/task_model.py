from pydantic import BaseModel
from typing import Optional, List, Any

class TaskRequest(BaseModel):
    task: str
    task_id: Optional[str] = None
    shortcut_key: Optional[str] = None
    recorded_steps: Optional[List[Any]] = None

class InjectedInput(BaseModel):
    instruction: str

class ShortcutTrigger(BaseModel):
    shortcut_key: str