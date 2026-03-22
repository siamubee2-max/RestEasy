# RestEasy CLI — Test Plan & Results

## Summary

**87/87 tests passed** in 3.13s (pytest 8.4.2, Python 3.9.6, macOS)

```
==================== 87 passed in 3.13s ====================
```

## Test Files

| File | Tests | Coverage |
|------|-------|----------|
| `test_core.py` | 41 | sleep.py, program.py, project.py, export.py, session.py |
| `test_full_e2e.py` | 14 | CLI subprocess tests (resteasy_cli.py) |
| `test_journey.py` | 32 | journey.py — offline journey simulation |

## Run Tests

```bash
cd agent-harness
pip install -e ".[dev]"
pytest cli_anything/resteasy/tests/ -v
```

## Test Categories

### Unit Tests (test_core.py — 41 tests)
- `test_sleep_efficiency_*` — SE calculation edge cases
- `test_window_adjust_extend/maintain/restrict` — TCC-I window algorithm
- `test_isi_severity_*` — ISI score categorization (0-28)
- `test_program_modules_*` — Module definitions and progress
- `test_project_config_*` — Config load/save
- `test_export_*` — JSON/CSV export
- `test_session_*` — Session state management

### E2E Tests (test_full_e2e.py — 14 tests)
- `test_cli_sleep_efficiency` — subprocess: `resteasy sleep efficiency`
- `test_cli_sleep_window` — subprocess: `resteasy sleep window`
- `test_cli_sleep_isi_severity` — subprocess: `resteasy sleep isi-severity`
- `test_cli_program_modules` — subprocess: `resteasy program modules`
- `test_cli_help` — `resteasy --help`
- `test_cli_journey_new` — subprocess: `resteasy journey new`
- `test_cli_journey_journal` — subprocess: `resteasy journey journal`
- `test_cli_journey_isi` — subprocess: `resteasy journey isi`
- `test_cli_journey_review` — subprocess: `resteasy journey review`
- `test_cli_journey_status` — subprocess: `resteasy journey status`
- `test_cli_journey_simulate_improving` — subprocess: `resteasy journey simulate`
- `test_cli_journey_badges` — subprocess: `resteasy journey badges`
- `test_cli_format_json` — `--format json` output validation
- `test_cli_format_csv` — `--format csv` output validation

### Journey Tests (test_journey.py — 32 tests)
- `test_create_journey` — Journey file creation
- `test_add_journal_entry_*` — Entry addition, SE calculation
- `test_streak_*` — Streak tracking, breaks, longest streak
- `test_badge_*` — Badge award conditions (12 badges)
- `test_submit_isi_*` — ISI submission, validation
- `test_weekly_review_*` — Review computation, window adjustment
- `test_simulate_*` — 6-week simulation (all 3 profiles)
- `test_journey_status` — Status aggregation
- `test_complete_module` — Module completion tracking
- `test_log_night_session` — Night session logging

## Simulation Results

### Profile: improving
```
ISI: 22 → 18 → 16 → 13 → 10 → 7  (severe → none)
SE:  72% → 78% → 82% → 87% → 91% → 93%
Badges: 9/12
Streak: 42 days
```

### Profile: struggling
```
ISI: 24 → 22 → 20 → 18 → 16 → 14  (severe → moderate)
SE:  68% → 72% → 75% → 80% → 82% → 84%
Badges: 7/12
Streak: 42 days
```

### Profile: excellent
```
ISI: 18 → 14 → 10 → 7 → 5 → 3  (moderate → none)
SE:  80% → 88% → 92% → 94% → 95% → 96%
Badges: 11/12
Streak: 42 days
```
