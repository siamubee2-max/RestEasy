"""User journey simulation — walk through the TCC-I 6-week program.

Simulates the full RestEasy user experience offline:
- Daily morning journal entry
- Sleep efficiency tracking
- Weekly review with window adjustment
- ISI questionnaire (7 questions)
- Streak & badge tracking
- 6-week program progression
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from typing import Any, Optional

from cli_anything.resteasy.core.sleep import (
    compute_metrics,
    adjust_window,
    isi_severity,
)


# ── ISI Questions ──────────────────────────────────────────────────────────────
ISI_QUESTIONS = [
      {
                "id": "q1_severity_onset",
                "text": "Severity of your sleep onset problem (difficulty falling asleep)",
                "text_fr": "Sévérité de votre difficulté à vous endormir",
                "options": ["None", "Mild", "Moderate", "Severe", "Very Severe"],
      },
      {
                "id": "q2_severity_maintenance",
                "text": "Severity of your sleep maintenance problem (difficulty staying asleep)",
                "text_fr": "Sévérité de votre difficulté à rester endormi",
                "options": ["None", "Mild", "Moderate", "Severe", "Very Severe"],
      },
      {
                "id": "q3_severity_waking",
                "text": "Severity of your problem of waking up too early",
                "text_fr": "Sévérité de votre réveil trop tôt le matin",
                "options": ["None", "Mild", "Moderate", "Severe", "Very Severe"],
      },
      {
                "id": "q4_satisfaction",
                "text": "How SATISFIED/dissatisfied are you with your CURRENT sleep pattern?",
                "text_fr": "Dans quelle mesure êtes-vous satisfait(e) de votre sommeil actuel ?",
                "options": ["Very Satisfied", "Satisfied", "Neutral", "Dissatisfied", "Very Dissatisfied"],
      },
      {
                "id": "q5_noticeable",
                "text": "How NOTICEABLE to others do you think your sleep problem is in terms of impairing quality of life?",
                "text_fr": "Dans quelle mesure votre problème de sommeil est-il perceptible par votre entourage ?",
                "options": ["Not at all", "A Little", "Somewhat", "Much", "Very Much"],
      },
      {
                "id": "q6_worried",
                "text": "How WORRIED/distressed are you about your current sleep problem?",
                "text_fr": "Dans quelle mesure êtes-vous préoccupé(e) par votre problème de sommeil actuel ?",
                "options": ["Not at all", "A Little", "Somewhat", "Much", "Very Much"],
      },
      {
                "id": "q7_interfering",
                "text": "To what extent do you consider your sleep problem to INTERFERE with your daily functioning?",
                "text_fr": "Dans quelle mesure votre problème de sommeil interfère-t-il avec votre fonctionnement quotidien ?",
                "options": ["Not at all", "A Little", "Somewhat", "Much", "Very Much"],
      },
]


# ── Badge definitions ──────────────────────────────────────────────────────────
BADGE_DEFINITIONS = {
      "first_entry": {
                "emoji": "🌱",
                "name": "First Step",
                "condition": "Complete your first journal entry",
      },
      "streak_3": {
                "emoji": "🔥",
                "name": "3-Day Streak",
                "condition": "Log sleep 3 days in a row",
      },
      "streak_7": {
                "emoji": "⚡",
                "name": "Week Warrior",
                "condition": "Log sleep 7 days in a row",
      },
      "streak_14": {
                "emoji": "💪",
                "name": "Two-Week Champion",
                "condition": "Log sleep 14 days in a row",
      },
      "streak_21": {
                "emoji": "🏆",
                "name": "Habit Builder",
                "condition": "Log sleep 21 days in a row",
      },
      "streak_42": {
                "emoji": "🎖️",
                "name": "Program Complete",
                "condition": "Log sleep for all 42 days of the program",
      },
      "efficiency_85": {
                "emoji": "😴",
                "name": "Good Sleeper",
                "condition": "Achieve sleep efficiency ≥ 85% on any night",
      },
      "efficiency_90": {
                "emoji": "✨",
                "name": "Excellent Sleeper",
                "condition": "Achieve sleep efficiency ≥ 90% on any night",
      },
      "week_complete": {
                "emoji": "📅",
                "name": "Week Complete",
                "condition": "Complete a full week of the program",
      },
      "night_owl": {
                "emoji": "🦉",
                "name": "Night Owl",
                "condition": "Complete a night mode session",
      },
      "isi_improved": {
                "emoji": "📉",
                "name": "ISI Improved",
                "condition": "Reduce ISI score by 6+ points between assessments",
      },
      "program_complete": {
                "emoji": "🎓",
                "name": "TCC-I Graduate",
                "condition": "Complete the full 6-week TCC-I program",
      },
}


# ── Journey state ──────────────────────────────────────────────────────────────
def _empty_journey(name: str, locale: str, bedtime: str, wake: str) -> dict:
      return {
                "version": "1.0",
                "user_name": name,
                "locale": locale,
                "created_at": datetime.utcnow().isoformat(),
                "program_week": 1,
                "bedtime": bedtime,
                "wake": wake,
                "streak": 0,
                "longest_streak": 0,
                "last_entry_date": None,
                "journal": [],
                "isi_scores": [],
                "weekly_reviews": [],
                "badges": [],
                "completed_modules": [],
                "night_sessions": [],
      }


def load_journey(path: str) -> dict:
      """Load journey state from JSON file."""
      with open(path, "r", encoding="utf-8") as f:
                return json.load(f)


def save_journey(path: str, state: dict) -> None:
      """Save journey state to JSON file."""
      with open(path, "w", encoding="utf-8") as f:
                json.dump(state, f, indent=2, ensure_ascii=False)


# ── Badge checking ─────────────────────────────────────────────────────────────
def _award_badge(state: dict, badge_id: str) -> Optional[dict]:
      """Award a badge if not already earned. Returns badge dict or None."""
      earned_ids = {b["badge_id"] for b in state["badges"]}
      if badge_id not in earned_ids and badge_id in BADGE_DEFINITIONS:
                info = BADGE_DEFINITIONS[badge_id]
                badge = {
                    "badge_id": badge_id,
                    "emoji": info["emoji"],
                    "name": info["name"],
                    "unlocked_at": datetime.utcnow().isoformat(),
                }
                state["badges"].append(badge)
                return badge
            return None


def _check_badges(state: dict, new_entry: Optional[dict] = None) -> list[dict]:
      """Check and award all applicable badges. Returns list of newly awarded badges."""
    newly_awarded = []

    # first_entry
    if len(state["journal"]) >= 1:
              b = _award_badge(state, "first_entry")
              if b:
                            newly_awarded.append(b)

          # streak badges
          streak = state["streak"]
    for threshold, badge_id in [(3, "streak_3"), (7, "streak_7"), (14, "streak_14"),
                                                                  (21, "streak_21"), (42, "streak_42")]:
                                                                            if streak >= threshold:
                                                                                          b = _award_badge(state, badge_id)
                                                                                          if b:
                                                                                                            newly_awarded.append(b)

                                                                                  # efficiency badges
                                                                                  if new_entry:
                                                                            se = new_entry.get("sleep_efficiency_pct", 0)
        if se >= 90:
                      b = _award_badge(state, "efficiency_90")
            if b:
                              newly_awarded.append(b)
        if se >= 85:
                      b = _award_badge(state, "efficiency_85")
            if b:
                              newly_awarded.append(b)

    # week_complete
    if state["program_week"] > 1 or len(state["weekly_reviews"]) >= 1:
              b = _award_badge(state, "week_complete")
        if b:
                      newly_awarded.append(b)

    # program_complete
    if state["program_week"] > 6 or len(state["weekly_reviews"]) >= 6:
              b = _award_badge(state, "program_complete")
        if b:
                      newly_awarded.append(b)

    # ISI improved
    if len(state["isi_scores"]) >= 2:
              first_score = state["isi_scores"][0]["total"]
        last_score = state["isi_scores"][-1]["total"]
        if first_score - last_score >= 6:
                      b = _award_badge(state, "isi_improved")
            if b:
                              newly_awarded.append(b)

    return newly_awarded


# ── Streak management ──────────────────────────────────────────────────────────
def _update_streak(state: dict, entry_date: str) -> dict:
      """Update streak based on new entry date."""
    today = date.fromisoformat(entry_date)
    last_str = state.get("last_entry_date")

    if last_str is None:
              state["streak"] = 1
else:
        last = date.fromisoformat(last_str)
        diff = (today - last).days
        if diff == 1:
                      state["streak"] += 1
elif diff == 0:
            pass  # Same day, no change
else:
            state["streak"] = 1  # Streak broken

    state["last_entry_date"] = entry_date
    state["longest_streak"] = max(state["longest_streak"], state["streak"])
    return state


# ── Public API ─────────────────────────────────────────────────────────────────
def create_journey(path: str, name: str, locale: str, bedtime: str, wake: str) -> dict:
      """Create a new journey file."""
    state = _empty_journey(name, locale, bedtime, wake)
    save_journey(path, state)
    return state


def add_journal_entry(
      path: str,
      entry_date: str,
      bedtime: str,
      wake: str,
      onset: int,
      wakes: int,
      waso: Optional[int] = None,
) -> dict:
      """Add a morning journal entry and update streak/badges."""
    state = load_journey(path)

    # Compute sleep metrics
    from cli_anything.resteasy.core.sleep import _window_minutes, compute_metrics
    tib = _window_minutes(bedtime, wake)
    metrics = compute_metrics(tib=tib, latency=onset, wakes=wakes, waso=waso)

    entry = {
              "date": entry_date,
              "bedtime": bedtime,
              "wake": wake,
              "onset_latency_min": onset,
              "wakes": wakes,
              **metrics.to_dict(),
    }

    state["journal"].append(entry)
    _update_streak(state, entry_date)
    new_badges = _check_badges(state, new_entry=entry)
    save_journey(path, state)

    return {
              "entry": entry,
              "streak": state["streak"],
              "longest_streak": state["longest_streak"],
              "new_badges": new_badges,
              "total_entries": len(state["journal"]),
    }


def submit_isi(path: str, scores: list[int]) -> dict:
      """Submit ISI questionnaire answers (7 scores, 0-4 each)."""
    if len(scores) != 7:
              raise ValueError(f"Expected 7 ISI scores, got {len(scores)}")
    for i, s in enumerate(scores):
              if not 0 <= s <= 4:
                            raise ValueError(f"Score {i+1} must be 0-4, got {s}")

    state = load_journey(path)
    total = sum(scores)
    severity = isi_severity(total)

    record = {
              "date": datetime.utcnow().date().isoformat(),
              "scores": scores,
              "total": total,
              "category": severity["category"],
              "label": severity["label"],
              "label_fr": severity["label_fr"],
              "week": state["program_week"],
    }
    state["isi_scores"].append(record)
    new_badges = _check_badges(state)
    save_journey(path, state)

    return {
              "isi_record": record,
              "new_badges": new_badges,
              "history_count": len(state["isi_scores"]),
    }


def weekly_review(path: str) -> dict:
      """Perform weekly review: compute avg SE, adjust window, advance week."""
    state = load_journey(path)

    # Get this week's entries
    current_week = state["program_week"]
    week_entries = state["journal"][-(7):]  # Last 7 entries

    if not week_entries:
              return {"error": "No journal entries for this week", "program_week": current_week}

    avg_se = sum(e["sleep_efficiency_pct"] for e in week_entries) / len(week_entries)
    avg_tst = sum(e["tst_min"] for e in week_entries) / len(week_entries)

    # Compute window adjustment
    adjustment = adjust_window(avg_se, state["bedtime"], state["wake"])

    # Build review record
    review = {
              "week": current_week,
              "date": datetime.utcnow().date().isoformat(),
              "entries_count": len(week_entries),
              "avg_sleep_efficiency_pct": round(avg_se, 1),
              "avg_tst_min": round(avg_tst, 1),
              "window_action": adjustment.action,
              "old_bedtime": state["bedtime"],
              "new_bedtime": adjustment.new_bedtime,
              "wake_time": state["wake"],
              "window_delta_min": adjustment.delta_min,
              "reason": adjustment.reason,
    }
    state["weekly_reviews"].append(review)

    # Apply new window
    state["bedtime"] = adjustment.new_bedtime
    state["program_week"] = min(current_week + 1, 7)

    new_badges = _check_badges(state)
    save_journey(path, state)

    return {
              "review": review,
              "new_program_week": state["program_week"],
              "new_bedtime": adjustment.new_bedtime,
              "new_badges": new_badges,
    }


def get_journey_status(path: str) -> dict:
      """Get comprehensive journey status."""
    state = load_journey(path)

    isi_trend = [
              {"week": r["week"], "score": r["total"], "category": r["category"]}
              for r in state["isi_scores"]
    ]

    return {
              "user_name": state["user_name"],
              "program_week": state["program_week"],
              "current_bedtime": state["bedtime"],
              "current_wake": state["wake"],
              "streak": state["streak"],
              "longest_streak": state["longest_streak"],
              "total_entries": len(state["journal"]),
              "total_badges": len(state["badges"]),
              "badges_earned": [b["badge_id"] for b in state["badges"]],
              "isi_trend": isi_trend,
              "completed_modules": state["completed_modules"],
              "weekly_reviews_count": len(state["weekly_reviews"]),
              "night_sessions_count": len(state["night_sessions"]),
    }


def complete_module(path: str, module_id: str) -> dict:
      """Mark a therapy module as completed."""
    state = load_journey(path)
    if module_id not in state["completed_modules"]:
              state["completed_modules"].append(module_id)
    save_journey(path, state)
    return {
              "module_id": module_id,
              "completed_modules": state["completed_modules"],
              "count": len(state["completed_modules"]),
    }


def log_night_session(path: str, action: str, duration: int) -> dict:
      """Log a night mode session."""
    state = load_journey(path)
    session = {
              "date": datetime.utcnow().isoformat(),
              "action": action,
              "duration_sec": duration,
    }
    state["night_sessions"].append(session)
    new_badges = []
    if action in ("relaxation", "breathing"):
              b = _award_badge(state, "night_owl")
        if b:
                      new_badges.append(b)
    save_journey(path, state)
    return {"session": session, "new_badges": new_badges, "total_sessions": len(state["night_sessions"])}


def simulate_program(path: str, profile: str = "improving") -> dict:
      """Simulate a full 6-week TCC-I program with synthetic data.

          Profiles:
              - improving: gradual improvement, reaches 90%+ SE by week 5
                  - struggling: slow improvement, stays in 80-85% range
                      - excellent: quick improvement, 90%+ SE from week 2
                          """
    state = load_journey(path)

    # Profile data: (avg_se_week1..6, isi_scores_week1..7)
    profiles = {
              "improving": {
                            "se_by_week": [72, 78, 82, 87, 91, 93],
                            "isi_by_week": [22, 18, 16, 13, 10, 7],
                            "wakes_by_week": [4, 3, 3, 2, 1, 1],
                            "latency_by_week": [45, 35, 28, 20, 15, 10],
              },
              "struggling": {
                            "se_by_week": [68, 72, 75, 80, 82, 84],
                            "isi_by_week": [24, 22, 20, 18, 16, 14],
                            "wakes_by_week": [5, 4, 4, 3, 3, 2],
                            "latency_by_week": [55, 50, 45, 38, 32, 28],
              },
              "excellent": {
                            "se_by_week": [80, 88, 92, 94, 95, 96],
                            "isi_by_week": [18, 14, 10, 7, 5, 3],
                            "wakes_by_week": [3, 2, 1, 1, 0, 0],
                            "latency_by_week": [30, 20, 15, 10, 8, 5],
              },
    }

    if profile not in profiles:
              raise ValueError(f"Unknown profile: {profile}. Choose from: {list(profiles.keys())}")

    p = profiles[profile]
    start_date = date.today() - timedelta(days=41)

    # Simulate 42 days (6 weeks × 7 days)
    for week_idx in range(6):
              se_target = p["se_by_week"][week_idx]
        wakes = p["wakes_by_week"][week_idx]
        latency = p["latency_by_week"][week_idx]

        for day_idx in range(7):
                      day_num = week_idx * 7 + day_idx
            entry_date = (start_date + timedelta(days=day_num)).isoformat()

            # Add small daily variance
            import random
            random.seed(day_num * 13 + week_idx * 7)  # Deterministic
            se_variance = random.uniform(-3, 3)
            actual_se = max(50, min(100, se_target + se_variance))

            # Compute TIB from bedtime/wake
            from cli_anything.resteasy.core.sleep import _window_minutes
            tib = _window_minutes(state["bedtime"], state["wake"])

            # Back-compute TST from target SE
            tst = int(tib * actual_se / 100)
            actual_waso = max(0, tib - tst - latency)
            actual_wakes = max(0, actual_waso // 15)

            entry = {
                              "date": entry_date,
                              "bedtime": state["bedtime"],
                              "wake": state["wake"],
                              "onset_latency_min": latency,
                              "wakes": actual_wakes,
                              "tib_min": tib,
                              "tst_min": tst,
                              "latency_min": latency,
                              "waso_min": actual_waso,
                              "sleep_efficiency_pct": round(actual_se, 1),
            }
            state["journal"].append(entry)
            _update_streak(state, entry_date)
            _check_badges(state, new_entry=entry)

        # Weekly ISI
        isi_total = p["isi_by_week"][week_idx]
        # Distribute across 7 questions approximately
        base = isi_total // 7
        rem = isi_total % 7
        scores = [min(4, base + (1 if i < rem else 0)) for i in range(7)]
        isi_record = {
                      "date": (start_date + timedelta(days=(week_idx + 1) * 7 - 1)).isoformat(),
                      "scores": scores,
                      "total": isi_total,
                      "week": week_idx + 1,
                      **isi_severity(isi_total),
        }
        state["isi_scores"].append(isi_record)

        # Weekly review
        week_entries = state["journal"][week_idx * 7: (week_idx + 1) * 7]
        avg_se = sum(e["sleep_efficiency_pct"] for e in week_entries) / len(week_entries)
        adjustment = adjust_window(avg_se, state["bedtime"], state["wake"])
        review = {
                      "week": week_idx + 1,
                      "date": (start_date + timedelta(days=(week_idx + 1) * 7 - 1)).isoformat(),
                      "entries_count": 7,
                      "avg_sleep_efficiency_pct": round(avg_se, 1),
                      "window_action": adjustment.action,
                      "old_bedtime": state["bedtime"],
                      "new_bedtime": adjustment.new_bedtime,
                      "wake_time": state["wake"],
                      "window_delta_min": adjustment.delta_min,
        }
        state["weekly_reviews"].append(review)
        state["bedtime"] = adjustment.new_bedtime
        state["program_week"] = week_idx + 2

    _check_badges(state)
    state["program_week"] = 7  # Completed

    save_journey(path, state)

    return {
              "profile": profile,
              "total_days": len(state["journal"]),
              "final_streak": state["streak"],
              "badges_earned": len(state["badges"]),
              "isi_trend": [{"week": r["week"], "score": r["total"]} for r in state["isi_scores"]],
              "final_window": f"{state['bedtime']} - {state['wake']}",
              "program_week": state["program_week"],
    }
