"""TCC-I sleep algorithm — SE, sleep window, ISI calculations."""

from __future__ import annotations
from dataclasses import dataclass
from typing import Optional


# ── Constants ──────────────────────────────────────────────────────────────────
WASO_PER_WAKE_MINUTES = 15      # Minutes of WASO assumed per awakening
MIN_WINDOW_MINUTES = 300         # Minimum sleep window: 5 hours
EXTENSION_THRESHOLD = 90.0       # SE >= 90% → extend window by 15 min
MAINTENANCE_THRESHOLD = 85.0     # SE 85-89% → maintain window
RESTRICTION_DELTA = 15           # Minutes to add/remove per week
EXTENSION_DELTA = 15


# ── Data classes ───────────────────────────────────────────────────────────────
@dataclass
class SleepMetrics:
      tib: int            # Time in Bed (minutes)
    tst: int            # Total Sleep Time (minutes)
    latency: int        # Sleep Onset Latency (minutes)
    wakes: int          # Number of awakenings
    waso: int           # Wake After Sleep Onset (minutes)
    se: float           # Sleep Efficiency (%)

    def to_dict(self) -> dict:
              return {
                            "tib_min": self.tib,
                            "tst_min": self.tst,
                            "latency_min": self.latency,
                            "wakes": self.wakes,
                            "waso_min": self.waso,
                            "sleep_efficiency_pct": round(self.se, 1),
              }


@dataclass
class WindowAdjustment:
      current_bedtime: str        # HH:MM
    current_wake: str           # HH:MM
    current_window_min: int
    action: str                 # "extend" | "maintain" | "restrict"
    new_bedtime: str
    new_wake: str
    new_window_min: int
    delta_min: int
    reason: str

    def to_dict(self) -> dict:
              return {
                            "current_bedtime": self.current_bedtime,
                            "current_wake": self.current_wake,
                            "current_window_min": self.current_window_min,
                            "action": self.action,
                            "new_bedtime": self.new_bedtime,
                            "new_wake": self.new_wake,
                            "new_window_min": self.new_window_min,
                            "delta_min": self.delta_min,
                            "reason": self.reason,
              }


# ── ISI severity ───────────────────────────────────────────────────────────────
def isi_severity(score: int) -> dict:
      """Return ISI severity category for a given score (0-28)."""
      if score < 0 or score > 28:
                raise ValueError(f"ISI score must be 0-28, got {score}")
            if score <= 7:
                      category = "no_insomnia"
                      label = "No clinically significant insomnia"
                      label_fr = "Pas d'insomnie cliniquement significative"
elif score <= 14:
        category = "subthreshold"
        label = "Subthreshold insomnia"
        label_fr = "Insomnie sous le seuil clinique"
elif score <= 21:
        category = "moderate"
        label = "Moderate clinical insomnia"
        label_fr = "Insomnie clinique modérée"
else:
        category = "severe"
          label = "Severe clinical insomnia"
        label_fr = "Insomnie clinique sévère"
    return {
              "score": score,
              "category": category,
              "label": label,
              "label_fr": label_fr,
              "max_score": 28,
    }


# ── Sleep metrics calculation ──────────────────────────────────────────────────
def compute_metrics(
      tib: int,
      tst: Optional[int] = None,
      latency: int = 0,
      wakes: int = 0,
      waso: Optional[int] = None,
) -> SleepMetrics:
      """Compute sleep metrics from raw inputs.

          Args:
                  tib: Time in bed (minutes)
                          tst: Total sleep time (minutes). If None, computed from tib - latency - waso.
                                  latency: Sleep onset latency (minutes)
                                          wakes: Number of awakenings
                                                  waso: Wake After Sleep Onset (minutes). If None, estimated as wakes * 15.
                                                      """
    if waso is None:
              waso = wakes * WASO_PER_WAKE_MINUTES
          if tst is None:
                    tst = max(0, tib - latency - waso)
                se = (tst / tib * 100) if tib > 0 else 0.0
    return SleepMetrics(tib=tib, tst=tst, latency=latency, wakes=wakes, waso=waso, se=se)


# ── Window adjustment ──────────────────────────────────────────────────────────
def _parse_time(t: str) -> tuple[int, int]:
      """Parse HH:MM → (hours, minutes)."""
    h, m = t.split(":")
    return int(h), int(m)


def _format_time(total_minutes: int) -> str:
      """Format total minutes since midnight → HH:MM."""
    total_minutes = total_minutes % (24 * 60)
    h = total_minutes // 60
    m = total_minutes % 60
    return f"{h:02d}:{m:02d}"


def _window_minutes(bedtime: str, wake: str) -> int:
      """Compute window size in minutes between bedtime and wake."""
    bh, bm = _parse_time(bedtime)
    wh, wm = _parse_time(wake)
    bed_total = bh * 60 + bm
    wake_total = wh * 60 + wm
    if wake_total <= bed_total:
              wake_total += 24 * 60
          return wake_total - bed_total


def adjust_window(avg_se: float, bedtime: str, wake: str) -> WindowAdjustment:
      """Compute the TCC-I weekly window adjustment.

          Rules:
                SE >= 90%  → extend by 15 min (earlier bedtime)
                      SE 85-89%  → maintain
                            SE < 85%   → restrict by 15 min (later bedtime), min 5h window
                                """
    current_window = _window_minutes(bedtime, wake)
    bh, bm = _parse_time(bedtime)
    bed_total = bh * 60 + bm

    if avg_se >= EXTENSION_THRESHOLD:
              action = "extend"
              delta = EXTENSION_DELTA
              new_bed_total = bed_total - delta
              reason = f"SE {avg_se:.1f}% ≥ {EXTENSION_THRESHOLD}% → extend window (earlier bedtime)"
elif avg_se >= MAINTENANCE_THRESHOLD:
        action = "maintain"
        delta = 0
        new_bed_total = bed_total
        reason = f"SE {avg_se:.1f}% in {MAINTENANCE_THRESHOLD}-{EXTENSION_THRESHOLD}% range → maintain window"
else:
        action = "restrict"
        proposed_window = current_window - RESTRICTION_DELTA
        if proposed_window < MIN_WINDOW_MINUTES:
                      delta = current_window - MIN_WINDOW_MINUTES
                      reason = f"SE {avg_se:.1f}% < {MAINTENANCE_THRESHOLD}% → restrict (capped at 5h minimum)"
else:
            delta = -RESTRICTION_DELTA
              reason = f"SE {avg_se:.1f}% < {MAINTENANCE_THRESHOLD}% → restrict by 15 min (later bedtime)"
        new_bed_total = bed_total - delta  # delta is negative for restrict

    wh, wm = _parse_time(wake)
    wake_total = wh * 60 + wm
    new_window = _window_minutes(_format_time(new_bed_total), wake)

    return WindowAdjustment(
              current_bedtime=bedtime,
              current_wake=wake,
              current_window_min=current_window,
              action=action,
              new_bedtime=_format_time(new_bed_total),
              new_wake=wake,
              new_window_min=new_window,
              delta_min=delta if action != "restrict" else -abs(delta),
              reason=reason,
    )
