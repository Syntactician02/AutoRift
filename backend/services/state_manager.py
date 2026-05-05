import threading
from utils.logger import get_logger

logger = get_logger(__name__)


class StateManager:
    """
    Global singleton to manage task execution state.
    Controls pause/resume and tracks current step.
    """

    def __init__(self):
        self._lock = threading.Lock()
        self._paused = threading.Event()
        self._paused.set()  # Start in "running" (not paused)

        self.is_running: bool = False
        self.current_step_index: int = 0
        self.total_steps: int = 0
        self.task_description: str = ""
        self.injected_input: str | None = None

    def start(self, task: str, total: int):
        with self._lock:
            self.is_running = True
            self.current_step_index = 0
            self.total_steps = total
            self.task_description = task
            self.injected_input = None
            self._paused.set()
        logger.info(f"Task started: {task} | Steps: {total}")

    def pause(self):
        with self._lock:
            self._paused.clear()
        logger.info("Execution paused.")

    def resume(self):
        with self._lock:
            self._paused.set()
        logger.info("Execution resumed.")

    def stop(self):
        with self._lock:
            self.is_running = False
            self._paused.set()
        logger.info("Execution stopped.")

    def wait_if_paused(self):
        """Block execution if paused. Called by executor between steps."""
        self._paused.wait()

    def advance_step(self):
        with self._lock:
            self.current_step_index += 1

    def inject_input(self, instruction: str):
        with self._lock:
            self.injected_input = instruction
        logger.info(f"User input injected: {instruction}")

    def consume_injected_input(self) -> str | None:
        with self._lock:
            val = self.injected_input
            self.injected_input = None
            return val

    def get_status(self) -> dict:
        with self._lock:
            return {
                "is_running": self.is_running,
                "is_paused": not self._paused.is_set(),
                "current_step": self.current_step_index,
                "total_steps": self.total_steps,
                "task": self.task_description,
                "pending_input": self.injected_input,
            }


# Global singleton instance
state = StateManager()