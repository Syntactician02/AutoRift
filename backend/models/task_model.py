from pydantic import BaseModel
from typing import Optional


class TaskRequest(BaseModel):
    task: str


class InputRequest(BaseModel):
    instruction: str


class StepResult(BaseModel):
    step_index: int
    step: dict
    success: bool
    output: Optional[str] = None
    error: Optional[str] = None