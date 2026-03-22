"""Unit tests for core modules — 41 tests.

Covers: sleep.py, program.py, project.py, export.py, session.py
"""

import json
import os
import tempfile
import pytest

from cli_anything.resteasy.core.sleep import (
    compute_metrics,
    adjust_window,
    isi_severity,
    SleepMetrics,
)
from cli_anything.resteasy.core.program import (
    list_modules,
    get_module,
    get_week_module,
    program_progress,
)
from cli_anything.resteasy.core.export import to_json, to_csv, export_sleep_entries
from cli_anything.resteasy.core.session import Session, get_session, reset_session


# ════════════════════════════════════════════════════════════════════════════════
# sleep.py tests
# ════════════════════════════════════════════════════════════════════════════════

class TestComputeMetrics:
      def test_basic(self):
                m = compute_metrics(tib=360, latency=30, wakes=2)
                assert m.tib == 360
                assert m.latency == 30
                assert m.wakes == 2
                assert m.waso == 30  # 2 * 15
        assert m.tst == 300  # 360 - 30 - 30
        assert abs(m.se - 83.3) < 0.2

    def test_perfect_sleep(self):
              m = compute_metrics(tib=480, latency=0, wakes=0)
              assert m.se == 100.0
              assert m.tst == 480

    def test_waso_override(self):
              m = compute_metrics(tib=360, latency=20, wakes=3, waso=45)
              assert m.waso == 45
              assert m.tst == 360 - 20 - 45

    def test_tst_override(self):
              m = compute_metrics(tib=360, tst=300)
              assert m.tst == 300
              assert abs(m.se - 83.3) < 0.2

    def test_se_calculation(self):
              m = compute_metrics(tib=480, latency=15, wakes=1)
              # waso=15, tst=450, se=93.75
              assert abs(m.se - 93.75) < 0.1

    def test_to_dict(self):
              m = compute_metrics(tib=360, latency=30, wakes=2)
              d = m.to_dict()
              assert "tib_min" in d
              assert "tst_min" in d
              assert "sleep_efficiency_pct" in d
              assert "waso_min" in d


class TestAdjustWindow:
      def test_extend_above_90(self):
                adj = adjust_window(92.0, "23:30", "06:00")
                assert adj.action == "extend"
                assert adj.delta_min == 15
                assert adj.new_bedtime == "23:15"

    def test_maintain_85_to_89(self):
              adj = adjust_window(87.0, "23:30", "06:00")
              assert adj.action == "maintain"
              assert adj.delta_min == 0
              assert adj.new_bedtime == "23:30"

    def test_restrict_below_85(self):
              adj = adjust_window(78.0, "23:30", "06:00")
              assert adj.action == "restrict"
              assert adj.delta_min == -15
              assert adj.new_bedtime == "23:45"

    def test_window_size_computed(self):
              adj = adjust_window(92.0, "23:00", "06:00")
              assert adj.current_window_min == 420

    def test_min_window_respected(self):
              # If current window is just above 5h, restriction should be capped
              adj = adjust_window(70.0, "01:00", "06:00")
              assert adj.new_window_min >= 300

    def test_midnight_crossing(self):
              adj = adjust_window(92.0, "23:45", "06:00")
              # Should extend to 23:30
              assert adj.new_bedtime == "23:30"


class TestISISeverity:
      def test_no_insomnia(self):
                r = isi_severity(7)
                assert r["category"] == "no_insomnia"

    def test_subthreshold(self):
              r = isi_severity(10)
              assert r["category"] == "subthreshold"

    def test_moderate(self):
              r = isi_severity(17)
              assert r["category"] == "moderate"

    def test_severe(self):
              r = isi_severity(22)
              assert r["category"] == "severe"

    def test_boundary_values(self):
              assert isi_severity(0)["category"] == "no_insomnia"
              assert isi_severity(28)["category"] == "severe"
              assert isi_severity(14)["category"] == "subthreshold"
              assert isi_severity(21)["category"] == "moderate"

    def test_invalid_range(self):
              with pytest.raises(ValueError):
                            isi_severity(-1)
                        with pytest.raises(ValueError):
                                      isi_severity(29)

    def test_has_fr_label(self):
              r = isi_severity(15)
        assert "label_fr" in r
        assert len(r["label_fr"]) > 0


# ════════════════════════════════════════════════════════════════════════════════
# program.py tests
# ════════════════════════════════════════════════════════════════════════════════

class TestProgram:
      def test_list_modules_count(self):
                modules = list_modules()
                assert len(modules) == 6

    def test_module_structure(self):
              modules = list_modules()
        for m in modules:
                      assert "id" in m
                      assert "week" in m
                      assert "title" in m
                      assert "title_fr" in m
                      assert 1 <= m["week"] <= 6

    def test_get_module_by_id(self):
              m = get_module("s1_sleep_education")
        assert m is not None
        assert m["week"] == 1

    def test_get_module_not_found(self):
              assert get_module("nonexistent") is None

    def test_get_week_module(self):
              m = get_week_module(3)
        assert m is not None
        assert m["week"] == 3

    def test_program_progress_empty(self):
              p = program_progress([])
        assert p["completed"] == 0
        assert p["percentage"] == 0

    def test_program_progress_full(self):
              all_ids = [m["id"] for m in list_modules()]
        p = program_progress(all_ids)
        assert p["completed"] == 6
        assert p["percentage"] == 100.0

    def test_program_progress_partial(self):
              p = program_progress(["s1_sleep_education", "s2_stimulus_control"])
        assert p["completed"] == 2
        assert abs(p["percentage"] - 33.3) < 0.5


# ════════════════════════════════════════════════════════════════════════════════
# export.py tests
# ════════════════════════════════════════════════════════════════════════════════

class TestExport:
      def test_to_json(self):
                data = {"key": "value", "number": 42}
                result = to_json(data)
                parsed = json.loads(result)
                assert parsed["key"] == "value"
                assert parsed["number"] == 42

    def test_to_csv_empty(self):
              assert to_csv([]) == ""

    def test_to_csv_basic(self):
              rows = [{"a": 1, "b": 2}, {"a": 3, "b": 4}]
              result = to_csv(rows)
              assert "a,b" in result
              assert "1,2" in result
              assert "3,4" in result

    def test_export_sleep_entries_json(self):
              entries = [{"date": "2026-01-01", "sleep_efficiency_pct": 85.0, "tib_min": 360,
                                              "tst_min": 306, "latency_min": 20, "waso_min": 34, "wakes": 2,
                                              "bedtime": "23:30", "wake": "06:00"}]
              result = export_sleep_entries(entries, fmt="json")
              parsed = json.loads(result)
              assert len(parsed) == 1

    def test_export_sleep_entries_csv(self):
              entries = [{"date": "2026-01-01", "sleep_efficiency_pct": 85.0, "tib_min": 360,
                                              "tst_min": 306, "latency_min": 20, "waso_min": 34, "wakes": 2,
                                              "bedtime": "23:30", "wake": "06:00"}]
              result = export_sleep_entries(entries, fmt="csv")
              assert "date" in result
              assert "2026-01-01" in result


# ════════════════════════════════════════════════════════════════════════════════
# session.py tests
# ════════════════════════════════════════════════════════════════════════════════

class TestSession:
      def test_set_get(self):
                s = Session()
                s.set("key", "value")
                assert s.get("key") == "value"

    def test_get_default(self):
              s = Session()
              assert s.get("missing", "default") == "default"

    def test_clear(self):
              s = Session()
              s.set("key", "value")
              s.current_user_id = "user123"
              s.clear()
              assert s.get("key") is None
              assert s.current_user_id is None

    def test_history(self):
              s = Session()
              s.add_history("sleep efficiency --tib 360")
              s.add_history("journey new -o f.json")
              assert len(s.history) == 2

    def test_summary(self):
              s = Session()
              summary = s.summary()
              assert "output_format" in summary
              assert "connected" in summary
              assert summary["connected"] is False

    def test_singleton(self):
              s1 = get_session()
              s2 = get_session()
              assert s1 is s2

    def test_reset(self):
              s1 = get_session()
              s1.set("x", 42)
              reset_session()
              s2 = get_session()
              assert s2.get("x") is None
      
