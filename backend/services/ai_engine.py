import google.generativeai as genai
from config.settings import GEMINI_API_KEY
from utils.logger import get_logger
from utils.helpers import safe_json_parse

logger = get_logger(__name__)

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-1.5-flash")


def analyze_error(command: str, error_output: str) -> dict:
    """
    Call Gemini to analyze a failed command and suggest a fix.
    Returns structured JSON with explanation, suggestion, and fix_command.
    """
    prompt = f"""
You are an AI assistant helping fix automation errors.

A command failed during task execution.

Command: {command}
Error Output: {error_output}

Respond ONLY with valid JSON in this exact format (no markdown, no extra text):
{{
  "explanation": "Brief explanation of what went wrong",
  "suggestion": "What the user should know or do",
  "fix_command": "The exact terminal command to fix this, or empty string if not applicable"
}}
"""
    try:
        logger.info("Calling Gemini AI to analyze error...")
        response = model.generate_content(prompt)
        raw = response.text.strip()
        logger.debug(f"Gemini raw response: {raw}")
        result = safe_json_parse(raw)
        if not result:
            result = {
                "explanation": "AI could not parse the error.",
                "suggestion": "Review the error manually.",
                "fix_command": ""
            }
        return result
    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        return {
            "explanation": f"AI engine failed: {str(e)}",
            "suggestion": "Check your GEMINI_API_KEY and network connection.",
            "fix_command": ""
        }


def plan_task(task_description: str) -> list[dict]:
    """
    Use Gemini to break a natural language task into structured steps.
    Returns a list of step dicts.
    """
    prompt = f"""
You are an AI task planner for an automation system.

The user wants to: {task_description}

Break this into sequential steps. Each step must be one of:
- terminal: run a shell command
- browser: open/interact with a website
- app: open or switch to a desktop application

Respond ONLY with valid JSON — a list of step objects (no markdown, no explanation):
[
  {{"type": "terminal", "command": "echo hello", "description": "Print hello"}},
  {{"type": "browser", "action": "open", "url": "https://example.com", "description": "Open website"}},
  {{"type": "app", "action": "open", "app_name": "Chrome", "description": "Launch Chrome"}}
]

Only include steps relevant to the task. Do not add unnecessary steps.
"""
    try:
        logger.info("Calling Gemini AI to plan task...")
        response = model.generate_content(prompt)
        raw = response.text.strip()
        logger.debug(f"Gemini plan response: {raw}")
        result = safe_json_parse(raw)
        if isinstance(result, list):
            return result
        logger.warning("Gemini returned non-list plan. Wrapping in list.")
        return [result] if result else []
    except Exception as e:
        logger.error(f"Gemini plan error: {e}")
        return []