"""
State Manager - Manages application state
"""

from typing import Dict, Any
from threading import Lock

class StateManager:
    """Thread-safe state management"""
    
    def __init__(self):
        self._state: Dict[str, Any] = {}
        self._lock = Lock()

    def set(self, key: str, value: Any):
        """Set a state value"""
        with self._lock:
            self._state[key] = value

    def get(self, key: str, default: Any = None) -> Any:
        """Get a state value"""
        with self._lock:
            return self._state.get(key, default)

    def update(self, data: Dict[str, Any]):
        """Update multiple state values"""
        with self._lock:
            self._state.update(data)

    def delete(self, key: str):
        """Delete a state value"""
        with self._lock:
            if key in self._state:
                del self._state[key]

    def clear(self):
        """Clear all state"""
        with self._lock:
            self._state.clear()

    def get_all(self) -> Dict[str, Any]:
        """Get all state"""
        with self._lock:
            return self._state.copy()

# Global state manager instance
state_manager = StateManager()
