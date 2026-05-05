"""
Recording routes - Handle start/stop of recording operations
"""

from fastapi import APIRouter, HTTPException
from services.recorder import recorder_service
from utils.logger import logger

router = APIRouter()

@router.post("/start")
async def start_recording():
    """Start a new recording session"""
    try:
        result = recorder_service.start()
        logger.info("Recording started")
        return {"status": "recording_started", "session_id": result}
    except Exception as e:
        logger.error(f"Error starting recording: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/stop")
async def stop_recording():
    """Stop the current recording session"""
    try:
        steps = recorder_service.stop()
        logger.info("Recording stopped")
        return {"status": "recording_stopped", "steps": steps}
    except Exception as e:
        logger.error(f"Error stopping recording: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status")
async def get_recording_status():
    """Get the current recording status"""
    try:
        status = recorder_service.get_status()
        return {"status": status}
    except Exception as e:
        logger.error(f"Error getting recording status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
