from fastapi import APIRouter
from models.task_model import InputRequest
from models.response_model import APIResponse
from services.state_manager import state
from utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)


@router.post("/pause", response_model=APIResponse)
async def pause_execution():
    """Pause the currently running task after the current step completes."""
    if not state.is_running:
        return APIResponse(success=False, message="No task is currently running.")
    state.pause()
    return APIResponse(success=True, message="Execution paused.")


@router.post("/resume", response_model=APIResponse)
async def resume_execution():
    """Resume a paused task."""
    if not state.is_running:
        return APIResponse(success=False, message="No task is currently running.")
    state.resume()
    return APIResponse(success=True, message="Execution resumed.")


@router.post("/input", response_model=APIResponse)
async def inject_input(body: InputRequest):
    """
    Inject a real-time instruction into the running task.
    The executor will pick it up before the next step.
    """
    if not state.is_running:
        return APIResponse(success=False, message="No task is currently running.")
    state.inject_input(body.instruction)
    return APIResponse(
        success=True,
        message="Instruction injected.",
        data={"instruction": body.instruction},
    )