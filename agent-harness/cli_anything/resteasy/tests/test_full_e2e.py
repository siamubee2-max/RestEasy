"""E2E + subprocess tests for the RestEasy CLI — 14 tests.

Tests the CLI commands via subprocess and Click's test runner.
"""

import json
import os
import subprocess
import sys
import tempfile
import pytest
from click.testing import CliRunner

from cli_anything.resteasy.resteasy_cli import cli


# ── Helpers ────────────────────────────────────────────────────────────────────
@pytest.fixture
def runner():
      return CliRunner()


@pytest.fixture
def journey_path(tmp_path):
      """Create a fresh journey via CLI runner."""
      runner = CliRunner()
      path = str(tmp_path / "journey.json")
      result = runner.invoke(cli, ["journey", "new", "-o", path, "--name", "TestUser"])
      assert result.exit_code == 0, result.output
      return path


# ════════════════════════════════════════════════════════════════════════════════
# Sleep commands
# ════════════════════════════════════════════════════════════════════════════════

def test_cli_sleep_efficiency(runner):
      result = runner.invoke(cli, ["sleep", "efficiency", "--tib", "360", "--latency", "30", "--wakes", "2"])
      assert result.exit_code == 0
      data = json.loads(result.output)
      assert data["tib_min"] == 360
      assert data["latency_min"] == 30
      assert "sleep_efficiency_pct" in data


def test_cli_sleep_window(runner):
      result = runner.invoke(cli, ["sleep", "window", "--se", "92.0", "--bedtime", "23:30", "--wake", "06:00"])
      assert result.exit_code == 0
      data = json.loads(result.output)
      assert data["action"] == "extend"
      assert data["new_bedtime"] == "23:15"


def test_cli_sleep_isi_severity(runner):
      result = runner.invoke(cli, ["sleep", "isi-severity", "--score", "17"])
      assert result.exit_code == 0
      data = json.loads(result.output)
      assert data["category"] == "moderate"
      assert data["score"] == 17


# ════════════════════════════════════════════════════════════════════════════════
# Program commands
# ════════════════════════════════════════════════════════════════════════════════

def test_cli_program_modules(runner):
      result = runner.invoke(cli, ["program", "modules"])
      assert result.exit_code == 0
      data = json.loads(result.output)
      assert len(data) == 6
      assert data[0]["week"] == 1


def test_cli_help(runner):
      result = runner.invoke(cli, ["--help"])
      assert result.exit_code == 0
      assert "RestEasy" in result.output


# ════════════════════════════════════════════════════════════════════════════════
# Journey commands
# ════════════════════════════════════════════════════════════════════════════════

def test_cli_journey_new(runner, tmp_path):
      path = str(tmp_path / "j.json")
      result = runner.invoke(cli, ["journey", "new", "-o", path, "--name", "Alice"])
      assert result.exit_code == 0
      data = json.loads(result.output)
      assert data["status"] == "created"
      assert data["user_name"] == "Alice"
      assert os.path.exists(path)


def test_cli_journey_journal(runner, journey_path):
      result = runner.invoke(cli, [
                "journey", "journal", journey_path,
                "--date", "2026-01-01",
                "--bedtime", "23:30",
                "--wake", "06:00",
                "--onset", "30",
                "--wakes", "2",
      ])
      assert result.exit_code == 0
      data = json.loads(result.output)
      assert data["total_entries"] == 1
      assert data["streak"] == 1


def test_cli_journey_isi(runner, journey_path):
      result = runner.invoke(cli, [
                "journey", "isi", journey_path,
                "--answers", "3,2,1,3,2,1,2",
      ])
      assert result.exit_code == 0
      data = json.loads(result.output)
      assert data["isi_record"]["total"] == 14
      assert data["isi_record"]["category"] == "subthreshold"


def test_cli_journey_review(runner, journey_path, tmp_path):
      # Add 7 entries first
      for i in range(7):
                runner.invoke(cli, [
                              "journey", "journal", journey_path,
                              "--date", f"2026-01-{i+1:02d}",
                              "--bedtime", "23:30",
                              "--wake", "06:00",
                              "--onset", "20",
                              "--wakes", "1",
                ])
            result = runner.invoke(cli, ["journey", "review", journey_path])
    assert result.exit_code == 0
    data = json.loads(result.output)
    assert "review" in data
    assert data["new_program_week"] == 2


def test_cli_journey_status(runner, journey_path):
      result = runner.invoke(cli, ["journey", "status", journey_path])
    assert result.exit_code == 0
    data = json.loads(result.output)
    assert data["user_name"] == "TestUser"
    assert "streak" in data
    assert "badges_earned" in data


def test_cli_journey_simulate_improving(runner, journey_path):
      result = runner.invoke(cli, ["journey", "simulate", journey_path, "--profile", "improving"])
    assert result.exit_code == 0
    data = json.loads(result.output)
    assert data["profile"] == "improving"
    assert data["total_days"] == 42
    assert data["final_streak"] == 42


def test_cli_journey_badges(runner, journey_path):
      result = runner.invoke(cli, ["journey", "badges", journey_path])
    assert result.exit_code == 0
    data = json.loads(result.output)
    assert "earned" in data
    assert "available" in data
    assert "total" in data
    assert data["total"] == 12


# ════════════════════════════════════════════════════════════════════════════════
# Format tests
# ════════════════════════════════════════════════════════════════════════════════

def test_cli_format_json(runner):
      result = runner.invoke(cli, ["--format", "json", "sleep", "isi-severity", "--score", "15"])
      assert result.exit_code == 0
      data = json.loads(result.output)
      assert "category" in data


def test_cli_format_text(runner):
      result = runner.invoke(cli, ["--format", "text", "sleep", "isi-severity", "--score", "15"])
      assert result.exit_code == 0
      # Should produce text output (not necessarily valid JSON)
      assert len(result.output) > 0
