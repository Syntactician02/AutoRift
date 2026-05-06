from fastapi import APIRouter
from services.state_manager import state
from utils.task_logger import get_all_tasks

router = APIRouter()

@router.get("/status")
async def get_status():
    return {
        "is_running": state.is_running,
        "is_paused": state.is_paused,
        "current_step": state.current_step,
        "current_task_id": state.current_task_id,
        "logs": state.logs[-50:]  # last 50 log lines
    }

@router.get("/logs")
async def get_logs():
    return {"logs": state.logs}