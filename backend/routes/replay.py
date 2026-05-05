"""
Replay routes - Handle playback of recorded actions
"""

from fastapi import APIRouter, HTTPException, Body
from services.replayer import replayer_service
from utils.logger import logger

router = APIRouter()

@router.post("/start")
async def start_replay(steps: list = Body(...)):
    """Start replaying recorded steps"""
    try:
        result = replayer_service.replay(steps)
        logger.info("Replay started")
        return {"status": "replay_started", "result": result}
    except Exception as e:
        logger.error(f"Error starting replay: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/stop")
async def stop_replay():
    """Stop the current replay session"""
    try:
        result = replayer_service.stop()
        logger.info("Replay stopped")
        return {"status": "replay_stopped", "result": result}
    except Exception as e:
        logger.error(f"Error stopping replay: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status")
async def get_replay_status():
    """Get the current replay status"""
    try:
        status = replayer_service.get_status()
        return {"status": status}
    except Exception as e:
        logger.error(f"Error getting replay status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
