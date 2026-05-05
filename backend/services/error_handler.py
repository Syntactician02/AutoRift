from services.ai_engine import analyze_error
from utils.logger import get_logger

logger = get_logger(__name__)


def handle_error(command: str, error_output: str) -> dict:
    """
    Handle a step failure:
    1. Call AI to analyze the error.
    2. Return structured error info for the caller to act on.
    """
    logger.warning(f"Handling error for command: {command}")
    logger.debug(f"Error output: {error_output}")

    ai_result = analyze_error(command, error_output)

    return {
        "success": False,
        "failed_command": command,
        "error_output": error_output,
        "explanation": ai_result.get("explanation", "Unknown error."),
        "suggestion": ai_result.get("suggestion", ""),
        "fix_command": ai_result.get("fix_command", ""),
    }