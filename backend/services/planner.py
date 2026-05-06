import json
from services.ai_engine import ask_gemini

PLANNER_PROMPT = """
You are a task planner for an automation system called AutoRift.
Break this task into sequential executable steps.

Each step must be a JSON object with:
- "type": "terminal" or "browser"
- "command": shell command (for terminal steps)
- "action": one of open_url, click, type, navigate (for browser steps)
- "params": dict of params for browser action e.g. {{"url": "..."}}, {{"selector": "..."}}, {{"text": "..."}}
- "description": human readable explanation of this step

Return ONLY a valid JSON array. No markdown, no explanation, just the array.

Task: {task}
"""

async def plan_task(task: str) -> list:
    prompt = PLANNER_PROMPT.format(task=task)
    response = await ask_gemini(prompt)
    try:
        cleaned = response.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("```")[1]
            if cleaned.startswith("json"):
                cleaned = cleaned[4:]
        cleaned = cleaned.strip()
        steps = json.loads(cleaned)
        print(f"[Planner] {len(steps)} steps planned")
        return steps
    except Exception as e:
        print(f"[Planner Error] {e} | Raw: {response}")
        return []