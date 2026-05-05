"""
Error Handler service - Centralized error handling and recovery
"""

from typing import Dict, Any
from utils.logger import logger

class ErrorHandlerService:
    def __init__(self):
        self.error_history = []

    def handle_error(self, error: Exception, context: str = "") -> Dict[str, Any]:
        """Handle and log an error with context"""
        error_data = {
            "type": type(error).__name__,
            "message": str(error),
            "context": context
        }
        
        self.error_history.append(error_data)
        logger.error(f"Error in {context}: {str(error)}")
        
        return error_data

    def handle_recording_error(self, error: Exception) -> Dict[str, Any]:
        """Handle recording-specific errors"""
        return self.handle_error(error, context="Recording")

    def handle_replay_error(self, error: Exception) -> Dict[str, Any]:
        """Handle replay-specific errors"""
        return self.handle_error(error, context="Replay")

    def handle_ai_error(self, error: Exception) -> Dict[str, Any]:
        """Handle AI engine errors"""
        return self.handle_error(error, context="AI Engine")

    def get_error_history(self) -> list:
        """Get list of recent errors"""
        return self.error_history[-10:]  # Last 10 errors

    def clear_error_history(self):
        """Clear error history"""
        self.error_history = []
        logger.info("Error history cleared")

# Global error handler service instance
error_handler_service = ErrorHandlerService()
