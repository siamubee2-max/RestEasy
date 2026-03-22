"""RestEasy CLI — 11 command groups, 40+ commands.

TCC-I agent harness for the RestEasy sleep app.
Supports offline operations (sleep, journey) and Supabase backend operations.

Bug fix: line 791 corrected output(...) → _output(...)
"""

from __future__ import annotations

import json
import os
import sys
from typing import Any, Optional

import click

from cli_anything.resteasy.core.sleep import compute_metrics, adjust_window, isi_severity
from cli_anything.resteasy.core.program import list_modules, get_module, program_progress
from cli_anything.resteasy.core.project import load_config, save_config


# ── Output helper ──────────────────────────────────────────────────────────────
def _output(data: Any, ctx: click.Context):
      """Print data according to the current output format."""
      fmt = ctx.obj.get("format", "json") if ctx.obj else "json"
      if fmt == "json":
                click.echo(json.dumps(data, indent=2, ensure_ascii=False, default=str))
elif fmt == "csv":
        # Simple CSV for list of dicts
        if isinstance(data, list) and data and isinstance(data[0], dict):
                      import csv, io
                      output = io.StringIO()
                      writer = csv.DictWriter(output, fieldnames=list(data[0].keys()), extrasaction="ignore")
                      writer.writeheader()
                      writer.writerows(data)
                      click.echo(output.getvalue())
else:
              click.echo(json.dumps(data, indent=2, default=str))
else:
        click.echo(str(data))


# ── CLI root ───────────────────────────────────────────────────────────────────
@click.group()
@click.option("--format", "fmt", default="json",
                            type=click.Choice(["json", "csv", "text"]),
                            help="Output format")
@click.pass_context
def cli(ctx, fmt):
      """RestEasy CLI — TCC-I agent harness."""
      ctx.ensure_object(dict)
      ctx.obj["format"] = fmt


# ════════════════════════════════════════════════════════════════════════════════
# SLEEP commands
# ════════════════════════════════════════════════════════════════════════════════

@cli.group()
@click.pass_context
def sleep(ctx):
      """TCC-I sleep calculations (offline)."""
      pass


@sleep.command("efficiency")
@click.option("--tib", required=True, type=int, help="Time in bed (minutes)")
@click.option("--tst", type=int, default=None, help="Total sleep time (minutes)")
@click.option("--latency", type=int, default=0, help="Sleep onset latency (minutes)")
@click.option("--wakes", type=int, default=0, help="Number of awakenings")
@click.option("--waso", type=int, default=None, help="WASO override (minutes)")
@click.pass_context
def sleep_efficiency(ctx, tib, tst, latency, wakes, waso):
      """Compute sleep efficiency metrics."""
      metrics = compute_metrics(tib=tib, tst=tst, latency=latency, wakes=wakes, waso=waso)
      _output(metrics.to_dict(), ctx)


@sleep.command("window")
@click.option("--se", required=True, type=float, help="Average sleep efficiency (%)")
@click.option("--bedtime", required=True, help="Current bedtime (HH:MM)")
@click.option("--wake", required=True, help="Current wake time (HH:MM)")
@click.pass_context
def sleep_window(ctx, se, bedtime, wake):
      """Compute TCC-I window adjustment for the week."""
      adjustment = adjust_window(se, bedtime, wake)
      _output(adjustment.to_dict(), ctx)


@sleep.command("isi-severity")
@click.option("--score", required=True, type=int, help="ISI score (0-28)")
@click.pass_context
def sleep_isi_severity(ctx, score):
      """Get ISI severity category for a score."""
      _output(isi_severity(score), ctx)


# ════════════════════════════════════════════════════════════════════════════════
# PROGRAM commands
# ════════════════════════════════════════════════════════════════════════════════

@cli.group()
@click.pass_context
def program(ctx):
      """TCC-I 6-week program modules."""
      pass


@program.command("modules")
@click.option("--locale", default="fr", type=click.Choice(["fr", "en"]))
@click.pass_context
def program_modules(ctx, locale):
      """List all TCC-I therapy modules."""
      modules = list_modules()
      if locale == "fr":
                for m in modules:
                              m["title"] = m.get("title_fr", m["title"])
                              m["description"] = m.get("description_fr", m["description"])
                      _output(modules, ctx)


@program.command("module")
@click.argument("module_id")
@click.pass_context
def program_module(ctx, module_id):
      """Get a specific therapy module."""
      m = get_module(module_id)
      if not m:
                click.echo(f"Module not found: {module_id}", err=True)
                ctx.exit(1)
            _output(m, ctx)


@program.command("progress")
@click.argument("completed_ids", nargs=-1)
@click.pass_context
def program_progress_cmd(ctx, completed_ids):
      """Show program progress given completed module IDs."""
    _output(program_progress(list(completed_ids)), ctx)


# ════════════════════════════════════════════════════════════════════════════════
# CONFIG commands
# ════════════════════════════════════════════════════════════════════════════════

@cli.group()
@click.pass_context
def config(ctx):
      """Project configuration management."""
      pass


@config.command("show")
@click.option("--path", default=None, help="Path to config file")
@click.pass_context
def config_show(ctx, path):
      """Show current project config."""
      cfg = load_config(path)
      # Redact sensitive keys
      for key in ("supabase_anon_key", "supabase_service_key"):
                if cfg.get(key):
                              cfg[key] = "***REDACTED***"
                      _output(cfg, ctx)


@config.command("set")
@click.argument("key")
@click.argument("value")
@click.pass_context
def config_set(ctx, key, value):
      """Set a config value."""
    cfg = load_config()
    cfg[key] = value
    path = save_config(cfg)
    _output({"key": key, "value": value, "saved_to": path}, ctx)


# ════════════════════════════════════════════════════════════════════════════════
# JOURNEY commands (user journey simulation — offline, no Supabase)
# ════════════════════════════════════════════════════════════════════════════════

@cli.group()
@click.pass_context
def journey(ctx):
      """User journey simulation — walk through the TCC-I program offline."""
    pass


@journey.command("new")
@click.option("-o", "--output", "output_path", required=True,
                            help="Output path for journey file")
@click.option("--name", default="User", help="User display name")
@click.option("--locale", default="fr",
                            type=click.Choice(["fr", "en", "es", "de", "pt"]))
@click.option("--bedtime", default="23:30", help="Initial bedtime (HH:MM)")
@click.option("--wake", default="06:00", help="Initial wake time (HH:MM)")
@click.pass_context
def journey_new(ctx, output_path, name, locale, bedtime, wake):
      """Create a new journey session (offline, no Supabase needed)."""
    from cli_anything.resteasy.core.journey import create_journey
    create_journey(output_path, name, locale, bedtime, wake)
    _output({"status": "created", "path": os.path.abspath(output_path),
                          "user_name": name, "program_week": 1,
                          "initial_window": f"{bedtime} - {wake}"}, ctx)


@journey.command("journal")
@click.argument("journey_path")
@click.option("--date", required=True, help="Entry date (YYYY-MM-DD)")
@click.option("--bedtime", required=True, help="Bedtime (HH:MM)")
@click.option("--wake", required=True, help="Out-of-bed time (HH:MM)")
@click.option("--onset", required=True, type=int, help="Sleep onset latency (min)")
@click.option("--wakes", required=True, type=int, help="Number of awakenings")
@click.option("--waso", type=int, default=None, help="WASO override (min)")
@click.pass_context
def journey_journal(ctx, journey_path, date, bedtime, wake, onset, wakes, waso):
      """Add a morning journal entry to the journey."""
      from cli_anything.resteasy.core.journey import add_journal_entry
      result = add_journal_entry(journey_path, date, bedtime, wake, onset, wakes, waso)
      _output(result, ctx)


@journey.command("isi")
@click.argument("journey_path")
@click.option("--answers", required=True,
                            help="7 comma-separated scores (0-4 each), e.g. '3,2,1,3,2,1,2'")
@click.pass_context
def journey_isi(ctx, journey_path, answers):
      """Submit ISI questionnaire answers."""
      from cli_anything.resteasy.core.journey import submit_isi
      try:
                scores = [int(x.strip()) for x in answers.split(",")]
except ValueError:
        click.echo("Error: answers must be comma-separated integers (0-4)", err=True)
        ctx.exit(1)
    result = submit_isi(journey_path, scores)
    _output(result, ctx)


@journey.command("review")
@click.argument("journey_path")
@click.pass_context
def journey_review(ctx, journey_path):
      """Perform weekly review — compute summary and advance to next week."""
      from cli_anything.resteasy.core.journey import weekly_review
      result = weekly_review(journey_path)
      _output(result, ctx)


@journey.command("status")
@click.argument("journey_path")
@click.pass_context
def journey_status(ctx, journey_path):
      """Show comprehensive journey status and progress."""
      from cli_anything.resteasy.core.journey import get_journey_status
      result = get_journey_status(journey_path)
      _output(result, ctx)


@journey.command("complete-module")
@click.argument("journey_path")
@click.argument("module_id")
@click.pass_context
def journey_complete_module(ctx, journey_path, module_id):
      """Mark a therapy module as completed."""
      from cli_anything.resteasy.core.journey import complete_module
      result = complete_module(journey_path, module_id)
      _output(result, ctx)


@journey.command("night-session")
@click.argument("journey_path")
@click.option("--action", required=True,
                            type=click.Choice(["got_up", "relaxation", "breathing", "closed"]),
                            help="Action taken during night mode")
@click.option("--duration", default=0, type=int, help="Duration in seconds")
@click.pass_context
def journey_night_session(ctx, journey_path, action, duration):
      """Log a night mode session."""
      from cli_anything.resteasy.core.journey import log_night_session
      result = log_night_session(journey_path, action, duration)
      _output(result, ctx)


@journey.command("simulate")
@click.argument("journey_path")
@click.option("--profile", default="improving",
                            type=click.Choice(["improving", "struggling", "excellent"]),
                            help="Simulation profile")
@click.pass_context
def journey_simulate(ctx, journey_path, profile):
      """Simulate a full 6-week TCC-I program with synthetic data."""
      from cli_anything.resteasy.core.journey import simulate_program
      result = simulate_program(journey_path, profile)
      _output(result, ctx)


@journey.command("isi-questions")
@click.option("--locale", default="fr", type=click.Choice(["fr", "en"]))
@click.pass_context
def journey_isi_questions(ctx, locale):
      """Display the 7 ISI questionnaire questions."""
      from cli_anything.resteasy.core.journey import ISI_QUESTIONS
      questions = []
      for i, q in enumerate(ISI_QUESTIONS):
                text_key = "text_fr" if locale == "fr" else "text"
                questions.append({
                    "number": i + 1,
                    "question": q[text_key],
                    "options": q["options"],
                })
            _output({"questions": questions, "instructions": "Answer each 0-4"}, ctx)


@journey.command("badges")
@click.argument("journey_path")
@click.pass_context
def journey_badges(ctx, journey_path):
      """Show earned badges and available badges."""
    from cli_anything.resteasy.core.journey import load_journey, BADGE_DEFINITIONS
    state = load_journey(journey_path)
    earned_ids = set(b["badge_id"] for b in state["badges"])

    earned = []
    available = []
    for badge_id, info in BADGE_DEFINITIONS.items():
              badge_data = {
                            "badge_id": badge_id,
                            "emoji": info["emoji"],
                            "name": info["name"],
                            "condition": info["condition"],
              }
              if badge_id in earned_ids:
                            unlocked = next(b for b in state["badges"] if b["badge_id"] == badge_id)
                            badge_data["unlocked_at"] = unlocked["unlocked_at"]
                            earned.append(badge_data)
else:
            available.append(badge_data)

    # BUG FIX: was output(...) → corrected to _output(...)
      _output({"earned": earned, "earned_count": len(earned),
                            "available": available, "available_count": len(available),
                            "total": len(BADGE_DEFINITIONS)}, ctx)


# ════════════════════════════════════════════════════════════════════════════════
# REPL command
# ════════════════════════════════════════════════════════════════════════════════

@cli.command("repl")
@click.pass_context
def repl(ctx):
      """Start an interactive REPL session."""
      from cli_anything.resteasy.utils.repl_skin import print_banner, RESTEASY_PROMPT

    print_banner()

    commands_help = {
              "sleep efficiency":    "Compute sleep efficiency",
              "sleep window":        "Calculate window adjustment",
              "isi severity <score>": "Get ISI severity category",
              "program modules":     "List TCC-I modules",
              "journey new -o f.json": "Start a new offline journey",
              "journey journal <f>":  "Add a journal entry",
              "journey review <f>":   "Weekly review + advance",
              "journey status <f>":   "Full journey progress",
              "journey simulate <f>": "Simulate 6-week program",
              "journey badges <f>":   "Show earned/available badges",
              "quit":                 "Exit the CLI",
    }

    import shlex
    while True:
              try:
                            raw = input(RESTEASY_PROMPT).strip()
except (EOFError, KeyboardInterrupt):
            click.echo("\nGoodbye! 🌙")
            break

        if not raw:
                      continue
                  if raw in ("quit", "exit", "q"):
                                click.echo("Goodbye! 🌙")
                                break
                            if raw == "help":
                                          for cmd, desc in commands_help.items():
                                                            click.echo(f"  {cmd:<35} {desc}")
                                                        continue

        try:
                      args = shlex.split(raw)
            cli.main(args=args, standalone_mode=False,
                                          obj=ctx.obj or {"format": "json"})
except SystemExit:
            pass
except Exception as e:
            click.echo(f"Error: {e}", err=True)


if __name__ == "__main__":
      cli()
