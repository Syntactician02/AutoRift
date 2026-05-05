from services.ai_engine import plan_task
from utils.logger import get_logger

logger = get_logger(__name__)


def generate_plan(task_description: str) -> list[dict]:
    """
    Use AI to convert a natural language task into a structured list of steps.
    Each step has: type, action/command, description, and optionally url/app_name.
    """
    logger.info(f"Generating plan for task: {task_description}")
    steps = plan_task(task_description)

    if not steps:
        logger.warning("AI returned no steps. Falling back to empty plan.")
        return []

    logger.info(f"Plan generated with {len(steps)} steps.")
    for i, step in enumerate(steps):
        logger.debug(f"  Step {i}: {step}")

    return steps