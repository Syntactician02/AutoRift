from pydantic import BaseModel
from typing import Optional

class TaskRequest(BaseModel):
    task: str
    task_id: Optional[str] = None
    shortcut_key: Optional[str] = None

class InjectedInput(BaseModel):
    instruction: str

class ShortcutTrigger(BaseModel):
    shortcut_key: str