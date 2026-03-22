"""Tests for the user journey simulation module.

Tests the complete offline TCC-I program experience:
journal entries, ISI scores, weekly reviews, streaks, badges, and simulation.
"""

import json
import os
import tempfile
import pytest
from datetime import date, timedelta

from cli_anything.resteasy.core.journey import (
    create_journey,
    load_journey,
    add_journal_entry,
    submit_isi,
    weekly_review,
    get_journey_status,
    complete_module,
    log_night_session,
    simulate_program,
    ISI_QUESTIONS,
    BADGE_DEFINITIONS,
)


# ── Fixtures ───────────────────────────────────────────────────────────────────
@pytest.fixture
def journey_file(tmp_path):
      """Create a fresh journey file for each test."""
      path = str(tmp_path / "test_journey.json")
      create_journey(path, name="TestUser", locale="fr", bedtime="23:30", wake="06:00")
      return path


@pytest.fixture
def journey_with_entries(journey_file):
      """Journey with 7 consecutive journal entries."""
      base = date(2026, 1, 1)
      for i in range(7):
                d = (base + timedelta(days=i)).isoformat()
                add_journal_entry(journey_file, d, "23:30", "06:00", onset=30, wakes=2)
            return journey_file


# ── Create journey ─────────────────────────────────────────────────────────────
def test_create_journey(tmp_path):
      path = str(tmp_path / "j.json")
    state = create_journey(path, "Alice", "fr", "23:30", "06:00")
    assert state["user_name"] == "Alice"
    assert state["program_week"] == 1
    assert state["streak"] == 0
    assert os.path.exists(path)


def test_create_journey_persisted(tmp_path):
      path = str(tmp_path / "j.json")
    create_journey(path, "Bob", "en", "22:00", "05:30")
    state = load_journey(path)
    assert state["user_name"] == "Bob"
    assert state["bedtime"] == "22:00"
    assert state["wake"] == "05:30"


# ── Journal entries ────────────────────────────────────────────────────────────
def test_add_journal_entry_basic(journey_file):
      result = add_journal_entry(journey_file, "2026-01-01", "23:30", "06:00", onset=30, wakes=2)
    assert result["total_entries"] == 1
    assert "entry" in result
    entry = result["entry"]
    assert entry["date"] == "2026-01-01"
    assert entry["tib_min"] == 390  # 6.5 hours
    assert 0 < entry["sleep_efficiency_pct"] <= 100


def test_add_journal_entry_se_calculation(journey_file):
      # TIB=360 min (6h), onset=30, wakes=2 → waso=30 → TST=300 → SE=83.3%
      result = add_journal_entry(journey_file, "2026-01-01", "00:00", "06:00", onset=30, wakes=2)
    entry = result["entry"]
    assert entry["tib_min"] == 360
    assert entry["waso_min"] == 30
    assert entry["tst_min"] == 300
    assert abs(entry["sleep_efficiency_pct"] - 83.3) < 0.5


def test_add_journal_entry_high_efficiency(journey_file):
      # TIB=360, onset=5, wakes=0 → TST=355 → SE≈98.6%
      result = add_journal_entry(journey_file, "2026-01-01", "00:00", "06:00", onset=5, wakes=0)
    assert result["entry"]["sleep_efficiency_pct"] > 90
    # Should award efficiency_90 badge
    badge_ids = [b["badge_id"] for b in result["new_badges"]]
    assert "efficiency_90" in badge_ids


def test_add_multiple_entries(journey_file):
      for i in range(5):
                d = (date(2026, 1, 1) + timedelta(days=i)).isoformat()
                add_journal_entry(journey_file, d, "23:30", "06:00", onset=20, wakes=1)
            state = load_journey(journey_file)
    assert len(state["journal"]) == 5


# ── Streak tracking ────────────────────────────────────────────────────────────
def test_streak_consecutive(journey_file):
      for i in range(5):
                d = (date(2026, 1, 1) + timedelta(days=i)).isoformat()
                result = add_journal_entry(journey_file, d, "23:30", "06:00", onset=20, wakes=1)
            assert result["streak"] == 5


def test_streak_break(journey_file):
      add_journal_entry(journey_file, "2026-01-01", "23:30", "06:00", onset=20, wakes=1)
    add_journal_entry(journey_file, "2026-01-02", "23:30", "06:00", onset=20, wakes=1)
    # Skip day 3
    result = add_journal_entry(journey_file, "2026-01-04", "23:30", "06:00", onset=20, wakes=1)
    assert result["streak"] == 1  # Streak reset


def test_streak_longest(journey_file):
      # Build streak of 5
      for i in range(5):
                d = (date(2026, 1, 1) + timedelta(days=i)).isoformat()
                add_journal_entry(journey_file, d, "23:30", "06:00", onset=20, wakes=1)
            # Break it
            add_journal_entry(journey_file, "2026-01-10", "23:30", "06:00", onset=20, wakes=1)
    state = load_journey(journey_file)
    assert state["longest_streak"] == 5
    assert state["streak"] == 1


# ── Badge system ───────────────────────────────────────────────────────────────
def test_badge_first_entry(journey_file):
      result = add_journal_entry(journey_file, "2026-01-01", "23:30", "06:00", onset=20, wakes=1)
    badge_ids = [b["badge_id"] for b in result["new_badges"]]
    assert "first_entry" in badge_ids


def test_badge_streak_3(journey_file):
      badges_all = []
    for i in range(3):
              d = (date(2026, 1, 1) + timedelta(days=i)).isoformat()
              result = add_journal_entry(journey_file, d, "23:30", "06:00", onset=20, wakes=1)
              badges_all.extend(b["badge_id"] for b in result["new_badges"])
          assert "streak_3" in badges_all


def test_badge_streak_7(journey_with_entries):
      state = load_journey(journey_with_entries)
    earned = {b["badge_id"] for b in state["badges"]}
    assert "streak_7" in earned


def test_badge_efficiency_85(journey_file):
      # TIB=360, onset=10, wakes=1 → TST=335 → SE≈93%
      result = add_journal_entry(journey_file, "2026-01-01", "00:00", "06:00", onset=10, wakes=1)
    badge_ids = [b["badge_id"] for b in result["new_badges"]]
    assert "efficiency_85" in badge_ids or result["entry"]["sleep_efficiency_pct"] < 85


def test_badge_not_duplicated(journey_file):
      for i in range(3):
                d = (date(2026, 1, 1) + timedelta(days=i)).isoformat()
                add_journal_entry(journey_file, d, "23:30", "06:00", onset=20, wakes=1)
            state = load_journey(journey_file)
    badge_ids = [b["badge_id"] for b in state["badges"]]
    # No duplicates
    assert len(badge_ids) == len(set(badge_ids))


def test_badge_definitions_complete():
      assert len(BADGE_DEFINITIONS) == 12
    required_ids = {"first_entry", "streak_3", "streak_7", "streak_14", "streak_21",
                                        "streak_42", "efficiency_85", "efficiency_90", "week_complete",
                                        "night_owl", "isi_improved", "program_complete"}
    assert set(BADGE_DEFINITIONS.keys()) == required_ids


# ── ISI questionnaire ──────────────────────────────────────────────────────────
def test_submit_isi_valid(journey_file):
      result = submit_isi(journey_file, [3, 3, 2, 3, 2, 3, 3])
    assert result["isi_record"]["total"] == 19
    assert result["isi_record"]["category"] == "moderate"


def test_submit_isi_severe(journey_file):
      result = submit_isi(journey_file, [4, 4, 4, 4, 4, 4, 4])
    assert result["isi_record"]["total"] == 28
    assert result["isi_record"]["category"] == "severe"


def test_submit_isi_no_insomnia(journey_file):
      result = submit_isi(journey_file, [1, 1, 1, 1, 1, 1, 1])
    assert result["isi_record"]["total"] == 7
    assert result["isi_record"]["category"] == "no_insomnia"


def test_submit_isi_invalid_count(journey_file):
      with pytest.raises(ValueError, match="Expected 7 ISI scores"):
                submit_isi(journey_file, [3, 2, 1])


def test_submit_isi_invalid_range(journey_file):
      with pytest.raises(ValueError):
                submit_isi(journey_file, [5, 2, 1, 3, 2, 1, 2])


def test_submit_isi_persisted(journey_file):
      submit_isi(journey_file, [3, 2, 1, 3, 2, 1, 2])
    state = load_journey(journey_file)
    assert len(state["isi_scores"]) == 1
    assert state["isi_scores"][0]["total"] == 14


def test_isi_questions_count():
      assert len(ISI_QUESTIONS) == 7
    for q in ISI_QUESTIONS:
              assert "id" in q
              assert "text" in q
              assert "text_fr" in q
              assert len(q["options"]) == 5


# ── Weekly review ──────────────────────────────────────────────────────────────
def test_weekly_review_advances_week(journey_with_entries):
      state_before = load_journey(journey_with_entries)
    week_before = state_before["program_week"]
    result = weekly_review(journey_with_entries)
    assert result["new_program_week"] == week_before + 1


def test_weekly_review_window_action(journey_with_entries):
      result = weekly_review(journey_with_entries)
    assert result["review"]["window_action"] in ("extend", "maintain", "restrict")


def test_weekly_review_empty(journey_file):
      result = weekly_review(journey_file)
    assert "error" in result


def test_weekly_review_max_week(journey_with_entries):
      # Advance to week 6
      state = load_journey(journey_with_entries)
    state["program_week"] = 6
    import json
    with open(journey_with_entries, "w") as f:
              json.dump(state, f)
          result = weekly_review(journey_with_entries)
    # Should not exceed week 7
    assert result["new_program_week"] <= 7


# ── Journey status ─────────────────────────────────────────────────────────────
def test_journey_status(journey_with_entries):
      status = get_journey_status(journey_with_entries)
    assert status["user_name"] == "TestUser"
    assert status["total_entries"] == 7
    assert status["streak"] == 7
    assert "badges_earned" in status
    assert "isi_trend" in status


# ── Complete module ────────────────────────────────────────────────────────────
def test_complete_module(journey_file):
      result = complete_module(journey_file, "s1_sleep_education")
    assert "s1_sleep_education" in result["completed_modules"]
    assert result["count"] == 1


def test_complete_module_no_duplicate(journey_file):
      complete_module(journey_file, "s1_sleep_education")
    result = complete_module(journey_file, "s1_sleep_education")
    assert result["count"] == 1  # Not duplicated


# ── Night session ──────────────────────────────────────────────────────────────
def test_log_night_session(journey_file):
      result = log_night_session(journey_file, "breathing", 180)
    assert result["session"]["action"] == "breathing"
    assert result["session"]["duration_sec"] == 180
    assert result["total_sessions"] == 1


def test_log_night_session_badge(journey_file):
      result = log_night_session(journey_file, "relaxation", 300)
    badge_ids = [b["badge_id"] for b in result["new_badges"]]
    assert "night_owl" in badge_ids


def test_log_night_session_no_badge_for_got_up(journey_file):
      result = log_night_session(journey_file, "got_up", 0)
    assert len(result["new_badges"]) == 0


# ── Simulation ─────────────────────────────────────────────────────────────────
def test_simulate_improving(journey_file):
      result = simulate_program(journey_file, "improving")
    assert result["profile"] == "improving"
    assert result["total_days"] == 42
    assert result["final_streak"] == 42
    assert result["badges_earned"] >= 7
    # ISI should improve
    scores = [x["score"] for x in result["isi_trend"]]
    assert scores[0] > scores[-1]


def test_simulate_struggling(journey_file):
      result = simulate_program(journey_file, "struggling")
    assert result["total_days"] == 42
    scores = [x["score"] for x in result["isi_trend"]]
    assert scores[-1] < scores[0]  # Still improves, just less


def test_simulate_excellent(journey_file):
      result = simulate_program(journey_file, "excellent")
    assert result["total_days"] == 42
    scores = [x["score"] for x in result["isi_trend"]]
    assert scores[-1] <= 5  # Near no insomnia


def test_simulate_deterministic(tmp_path):
      """Same profile should produce same results when run twice."""
    path1 = str(tmp_path / "j1.json")
    path2 = str(tmp_path / "j2.json")
    create_journey(path1, "A", "fr", "23:30", "06:00")
    create_journey(path2, "A", "fr", "23:30", "06:00")
    r1 = simulate_program(path1, "improving")
    r2 = simulate_program(path2, "improving")
    assert r1["badges_earned"] == r2["badges_earned"]
    assert r1["final_streak"] == r2["final_streak"]
    assert r1["isi_trend"] == r2["isi_trend"]


def test_simulate_invalid_profile(journey_file):
      with pytest.raises(ValueError, match="Unknown profile"):
                simulate_program(journey_file, "nonexistent")


def test_simulate_isi_trend_improving_6_points(journey_file):
      result = simulate_program(journey_file, "improving")
    scores = [x["score"] for x in result["isi_trend"]]
    assert scores[0] - scores[-1] >= 6  # Should trigger isi_improved badge
    state = load_journey(journey_file)
    earned = {b["badge_id"] for b in state["badges"]}
    assert "isi_improved" in earned
