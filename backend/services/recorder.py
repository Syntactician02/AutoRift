"""
Recorder service - Handles recording of user actions
"""

from datetime import datetime
from typing import List, Dict, Any
from utils.logger import logger
from utils.state_manager import state_manager

class RecorderService:
    def __init__(self):
        self.is_recording = False
        self.session_id = None
        self.steps = []
        self.start_time = None

    def start(self) -> str:
        """Start recording session"""
        if self.is_recording:
            raise Exception("Already recording")
        
        self.is_recording = True
        self.session_id = datetime.now().isoformat()
        self.steps = []
        self.start_time = datetime.now()
        logger.info(f"Recording session started: {self.session_id}")
        return self.session_id

    def stop(self) -> List[Dict[str, Any]]:
        """Stop recording session and return steps"""
        if not self.is_recording:
            raise Exception("Not currently recording")
        
        self.is_recording = False
        end_time = datetime.now()
        duration = (end_time - self.start_time).total_seconds()
        
        logger.info(f"Recording session stopped. Duration: {duration}s, Steps: {len(self.steps)}")
        return self.steps

    def add_step(self, step: Dict[str, Any]):
        """Add a step to the current recording"""
        if not self.is_recording:
            raise Exception("Not currently recording")
        
        self.steps.append(step)
        logger.debug(f"Step added: {step}")

    def get_status(self) -> Dict[str, Any]:
        """Get current recording status"""
        return {
            "is_recording": self.is_recording,
            "session_id": self.session_id,
            "steps_count": len(self.steps),
            "duration": (datetime.now() - self.start_time).total_seconds() if self.is_recording else None
        }

# Global recorder service instance
recorder_service = RecorderService()
