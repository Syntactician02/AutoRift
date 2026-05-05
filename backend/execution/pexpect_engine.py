import pexpect
import re
from utils.logger import get_logger
from utils.helpers import is_prompt_like

logger = get_logger(__name__)

# Timeout in seconds for each command
DEFAULT_TIMEOUT = 60

# Patterns that require automatic responses
AUTO_RESPONSES = [
    (r"(?i)(continue\?|proceed\?|are you sure).*\(y/n\)", "y\n"),
    (r"(?i)\[Y/n\]", "Y\n"),
    (r"(?i)\[y/N\]", "y\n"),
    (r"(?i)password\s*:", "\n"),         # blank password for non-interactive
    (r"(?i)enter passphrase", "\n"),
]


def run_command(command: str, timeout: int = DEFAULT_TIMEOUT) -> dict:
    """
    Run a shell command interactively using pexpect.
    Automatically responds to known prompts.
    Returns: { stdout, error, success }
    """
    logger.info(f"Running terminal command: {command}")
    output_lines = []

    try:
        child = pexpect.spawn(
            "/bin/bash",
            ["-c", command],
            timeout=timeout,
            encoding="utf-8",
        )

        while True:
            try:
                patterns = [pexpect.EOF, pexpect.TIMEOUT] + [
                    p for p, _ in AUTO_RESPONSES
                ]
                index = child.expect(
                    [pexpect.EOF, pexpect.TIMEOUT] + [p for p, _ in AUTO_RESPONSES],
                    timeout=timeout,
                )

                # Capture output so far
                chunk = child.before or ""
                if chunk:
                    output_lines.append(chunk)

                if index == 0:
                    # EOF: command finished
                    break
                elif index == 1:
                    # Timeout
                    logger.warning(f"Command timed out: {command}")
                    child.terminate(force=True)
                    return {
                        "stdout": "".join(output_lines),
                        "error": "Command timed out.",
                        "success": False,
                    }
                else:
                    # Matched one of the auto-response patterns
                    matched_pattern_index = index - 2
                    _, response = AUTO_RESPONSES[matched_pattern_index]
                    logger.debug(f"Auto-responding to prompt with: {response.strip()}")
                    child.sendline(response.strip())

            except pexpect.EOF:
                break
            except pexpect.TIMEOUT:
                logger.warning(f"Timeout during interactive session for: {command}")
                break

        child.close()
        exit_code = child.exitstatus or 0
        stdout = "".join(output_lines)

        if exit_code != 0:
            logger.error(f"Command failed with exit code {exit_code}: {command}")
            return {
                "stdout": stdout,
                "error": f"Exit code {exit_code}",
                "success": False,
            }

        logger.info(f"Command succeeded: {command}")
        return {
            "stdout": stdout,
            "error": None,
            "success": True,
        }

    except Exception as e:
        logger.error(f"pexpect error: {e}")
        return {
            "stdout": "",
            "error": str(e),
            "success": False,
        }