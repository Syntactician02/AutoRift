import json
import re
from typing import Any


def safe_json_parse(text: str) -> dict:
    """
    Safely parse JSON from a string, stripping markdown fences if present.
    Returns an empty dict on failure.
    """
    try:
        cleaned = re.sub(r"```(?:json)?", "", text).strip().rstrip("```").strip()
        return json.loads(cleaned)
    except (json.JSONDecodeError, ValueError):
        return {}


def format_step_log(index: int, step: dict) -> str:
    """Return a human-readable step summary."""
    step_type = step.get("type", "unknown")
    action = step.get("action", step.get("command", step.get("url", "")))
    return f"Step [{index}] | type={step_type} | action={action}"


def is_prompt_like(text: str) -> bool:
    """Detect if output text looks like an interactive prompt."""
    patterns = [
        r"\(y/n\)",
        r"\[Y/n\]",
        r"\[y/N\]",
        r"password:",
        r"continue\?",
        r"proceed\?",
        r"enter passphrase",
        r"are you sure",
    ]
    lower = text.lower()
    return any(re.search(p, lower) for p in patterns)