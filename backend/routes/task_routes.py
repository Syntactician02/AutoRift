from fastapi import APIRouter
from models.task_model import TaskRequest
from models.response_model import APIResponse
from services.executor import start_task_execution
from utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)


@router.post("/start-task", response_model=APIResponse)
async def start_task(body: TaskRequest):
    """
    Start executing a new task described in natural language.
    The system will plan and execute steps automatically.
    """
    logger.info(f"Received start-task request: {body.task}")
    result = start_task_execution(body.task)
    return APIResponse(
        success=result["success"],
        message=result["message"],
        data={"task": body.task},
    )