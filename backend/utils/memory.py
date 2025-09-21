from typing import Any, Dict, List

from langchain_core.memory import BaseMemory
from pydantic import Field, PrivateAttr

class WindowedSummaryMemory(BaseMemory):
    max_window: int = Field(default=10)
    memory_key: str = Field(default="history")
    _history: List[Dict[str, Any]] = PrivateAttr(default_factory=list)

    @property
    def memory_variables(self) -> List[str]:
        return [self.memory_key]

    def load_memory_variables(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Return history and maintain only the last max_window items."""
        return {self.memory_key: self._history[-self.max_window :]}

    def save_context(self, inputs: Dict[str, Any], outputs: Dict[str, Any]) -> None:
        """Save context from conversation to memory."""
        self._history.append(
            {"input": inputs.get("input", ""), "output": outputs.get("response", "")}
        )
        # Trim history to max_window size
        if len(self._history) > self.max_window:
            self._history.pop(0)

    def clear(self) -> None:
        """Clear memory contents."""
        self._history = []

    @property
    def history(self) -> List[Dict[str, Any]]:
        return self._history.copy()
