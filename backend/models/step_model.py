"""
Step Model - Defines the structure of a recorded step
"""

from pydantic import BaseModel
from typing import Any, Optional
from datetime import datetime

class StepMetadata(BaseModel):
    """Metadata for a step"""
    timestamp: datetime
    duration: float
    element_id: Optional[str] = None
    element_type: Optional[str] = None
    screen_coordinates: Optional[dict] = None

class Step(BaseModel):
    """Main step model"""
    id: str
    type: str  # e.g., 'click', 'type', 'scroll', 'wait'
    action: str
    value: Optional[Any] = None
    metadata: StepMetadata
    description: Optional[str] = None

class Recording(BaseModel):
    """Recording model - collection of steps"""
    session_id: str
    steps: list[Step]
    created_at: datetime
    updated_at: datetime
    total_duration: float
    description: Optional[str] = None

class ReplayResult(BaseModel):
    """Result of replay operation"""
    status: str  # 'success', 'failed', 'partial'
    steps_executed: int
    steps_failed: int
    errors: Optional[list[str]] = None
    duration: float
