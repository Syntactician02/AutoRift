from fastapi import APIRouter
from models.response_model import APIResponse
from services.state_manager import state
from services.executor import get_last_result
from utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)


@router.get("/status", response_model=APIResponse)
async def get_status():
    """
    Returns the current execution state:
    running/paused, step progress, task name, and last result if finished.
    """
    status = state.get_status()
    if not status["is_running"]:
        last = get_last_result()
        status["last_result"] = last

    return APIResponse(
        success=True,
        message="Status fetched.",
        data=status,
    )