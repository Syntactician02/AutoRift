import platform
from execution.pexpect_engine import run_command
from utils.logger import get_logger

logger = get_logger(__name__)

# Map of friendly app names to platform-specific launch commands
APP_COMMANDS = {
    "chrome":   {"linux": "google-chrome", "darwin": "open -a 'Google Chrome'", "windows": "start chrome"},
    "firefox":  {"linux": "firefox",        "darwin": "open -a Firefox",          "windows": "start firefox"},
    "vscode":   {"linux": "code",           "darwin": "open -a 'Visual Studio Code'", "windows": "start code"},
    "terminal": {"linux": "x-terminal-emulator", "darwin": "open -a Terminal",    "windows": "start cmd"},
    "notepad":  {"linux": "gedit",          "darwin": "open -a TextEdit",          "windows": "start notepad"},
}


def _get_platform_key() -> str:
    system = platform.system().lower()
    if system == "darwin":
        return "darwin"
    if system == "windows":
        return "windows"
    return "linux"


def open_app(app_name: str) -> dict:
    """
    Launch a desktop application by name.
    Falls back to running the app_name directly if not in the known map.
    """
    key = _get_platform_key()
    app_lower = app_name.lower().strip()
    cmd_map = APP_COMMANDS.get(app_lower)

    if cmd_map:
        command = cmd_map.get(key, app_lower)
    else:
        logger.warning(f"Unknown app '{app_name}', attempting to launch directly.")
        command = app_lower

    logger.info(f"Opening app '{app_name}' via command: {command}")
    result = run_command(command, timeout=15)
    return result


def execute_app_step(step: dict) -> dict:
    """Route app control steps."""
    action = step.get("action", "open")
    app_name = step.get("app_name", "")

    if action == "open":
        return open_app(app_name)
    else:
        logger.warning(f"Unknown app action: {action}")
        return {"success": False, "error": f"Unknown app action: {action}"}