"""REPL session state — track context across interactive commands."""

from __future__ import annotations
from typing import Any, Optional


class Session:
      """Holds stateful context for an interactive REPL session."""

    def __init__(self):
              self._data: dict[str, Any] = {}
              self._history: list[str] = []
              self.output_format: str = "json"
              self.supabase_client = None
              self.current_user_id: Optional[str] = None
              self.current_journey_path: Optional[str] = None

    def set(self, key: str, value: Any) -> None:
              self._data[key] = value

    def get(self, key: str, default: Any = None) -> Any:
              return self._data.get(key, default)

    def clear(self) -> None:
              self._data.clear()
              self.current_user_id = None
              self.current_journey_path = None

    def add_history(self, cmd: str) -> None:
              self._history.append(cmd)

    @property
    def history(self) -> list[str]:
              return list(self._history)

    def summary(self) -> dict:
              return {
                            "output_format": self.output_format,
                            "current_user_id": self.current_user_id,
                            "current_journey_path": self.current_journey_path,
                            "connected": self.supabase_client is not None,
                            "history_count": len(self._history),
                            "context_keys": list(self._data.keys()),
              }


# Module-level singleton for REPL use
_session = Session()


def get_session() -> Session:
      return _session


def reset_session() -> Session:
      global _session
      _session = Session()
      return _session
  
