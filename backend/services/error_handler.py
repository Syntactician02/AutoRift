import json
from services.ai_engine import ask_gemini

ERROR_PROMPT = """
A task automation step failed in AutoRift.

Step details: {step}
Error message: {error}

Return a JSON object ONLY:
{{
  "explanation": "what went wrong in simple terms",
  "suggestion": "how the user can fix it manually",
  "fix_command": "shell command to auto-fix this, or empty string if not applicable"
}}
"""

async def handle_error(step: dict, error: str) -> dict:
    prompt = ERROR_PROMPT.format(step=json.dumps(step), error=error)
    response = await ask_gemini(prompt)
    try:
        cleaned = response.strip().strip("```json").strip("```").strip()
        return json.loads(cleaned)
    except Exception:
        return {
            "explanation": "Unknown error occurred",
            "suggestion": "Check the logs manually",
            "fix_command": ""
        }