from pydantic import BaseModel
from typing import Optional, Any


class APIResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Any] = None


class ErrorResponse(BaseModel):
    success: bool = False
    message: str
    explanation: Optional[str] = None
    suggestion: Optional[str] = None
    fix_command: Optional[str] = None