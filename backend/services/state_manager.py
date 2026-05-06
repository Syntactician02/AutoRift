import asyncio
from typing import Optional

class StateManager:
    def __init__(self):
        self.is_paused = False
        self.is_running = False
        self.current_step = 0
        self.current_task_id: Optional[str] = None
        self.injected_input: Optional[str] = None
        self.logs: list = []
        self._pause_event = asyncio.Event()
        self._pause_event.set()

    def pause(self):
        self.is_paused = True
        self._pause_event.clear()
        self.logs.append("[State] Paused")

    def resume(self):
        self.is_paused = False
        self._pause_event.set()
        self.logs.append("[State] Resumed")

    async def wait_if_paused(self):
        await self._pause_event.wait()

    def inject_input(self, instruction: str):
        self.injected_input = instruction
        self.logs.append(f"[Injected] {instruction}")

    def consume_injected_input(self) -> Optional[str]:
        val = self.injected_input
        self.injected_input = None
        return val

    def log(self, msg: str):
        print(msg)
        self.logs.append(msg)

    def reset(self, task_id: str = None):
        self.is_paused = False
        self.is_running = False
        self.current_step = 0
        self.current_task_id = task_id
        self.injected_input = None
        self.logs = []
        self._pause_event.set()

state = StateManager()