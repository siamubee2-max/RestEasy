"""CSV/JSON export utilities for sleep data."""

from __future__ import annotations

import csv
import io
import json
from typing import Any


def to_json(data: Any, indent: int = 2) -> str:
      """Serialize data to JSON string."""
      return json.dumps(data, indent=indent, ensure_ascii=False, default=str)


def to_csv(rows: list[dict], fieldnames: list[str] | None = None) -> str:
      """Serialize list of dicts to CSV string."""
      if not rows:
                return ""
            if fieldnames is None:
                      fieldnames = list(rows[0].keys())
                  output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction="ignore")
    writer.writeheader()
    writer.writerows(rows)
    return output.getvalue()


def export_sleep_entries(entries: list[dict], fmt: str = "json") -> str:
      """Export sleep entries to JSON or CSV."""
    if fmt == "csv":
              fields = ["date", "bedtime", "wake", "tib_min", "tst_min", "latency_min",
                                          "waso_min", "wakes", "sleep_efficiency_pct"]
              return to_csv(entries, fieldnames=fields)
          return to_json(entries)


def export_isi_scores(scores: list[dict], fmt: str = "json") -> str:
      """Export ISI scores to JSON or CSV."""
    if fmt == "csv":
              fields = ["date", "week", "total", "category"]
              return to_csv(scores, fieldnames=fields)
          return to_json(scores)


def export_journey(journey_state: dict, fmt: str = "json") -> str:
      """Export full journey state."""
    if fmt == "csv":
              # Export journal entries as CSV
              return export_sleep_entries(journey_state.get("journal", []), fmt="csv")
          return to_json(journey_state)
