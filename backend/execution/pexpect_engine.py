import pexpect
import sys

def run_command(command: str, timeout: int = 60) -> dict:
    print(f"[Terminal] Running: {command}")
    try:
        child = pexpect.spawn(
            "/bin/bash",
            ["-c", command],
            timeout=timeout,
            encoding="utf-8"
        )

        output_lines = []

        while True:
            try:
                index = child.expect([
                    r"\(y/n\)",
                    r"\(yes/no\)",
                    r"Password:",
                    r"password:",
                    r"\[sudo\]",
                    r"Press ENTER",
                    pexpect.EOF,
                    pexpect.TIMEOUT
                ], timeout=timeout)

                if child.before:
                    output_lines.append(child.before)

                if index == 0 or index == 1:
                    child.sendline("y")
                elif index in [2, 3, 4]:
                    child.sendline("")  # blank password — override in production
                elif index == 5:
                    child.sendline("")
                elif index == 6:  # EOF — done
                    break
                elif index == 7:  # TIMEOUT
                    child.close()
                    return {
                        "success": False,
                        "stdout": "\n".join(output_lines),
                        "error": "Command timed out"
                    }

            except pexpect.EOF:
                break

        child.close()
        stdout = "\n".join(output_lines)
        success = child.exitstatus == 0 if child.exitstatus is not None else True

        return {
            "success": success,
            "stdout": stdout,
            "error": "" if success else f"Exit code: {child.exitstatus}"
        }

    except Exception as e:
        return {
            "success": False,
            "stdout": "",
            "error": str(e)
        }