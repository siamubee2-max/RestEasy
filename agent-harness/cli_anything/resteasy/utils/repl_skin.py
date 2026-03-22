"""Unified REPL skin — consistent output formatting and prompts."""

from __future__ import annotations

import json
import sys
from typing import Any

try:
      from rich.console import Console
      from rich.syntax import Syntax
      from rich.panel import Panel
      from rich.table import Table
      _RICH_AVAILABLE = True
      _console = Console()
      _err_console = Console(stderr=True)
except ImportError:
      _RICH_AVAILABLE = False
      _console = None
      _err_console = None


RESTEASY_BANNER = """
╔══════════════════════════════════════╗
║   RestEasy CLI  v1.0   🌙            ║
║   TCC-I Agent Harness                ║
║   Type 'help' for commands           ║
╚══════════════════════════════════════╝
"""

RESTEASY_PROMPT = "resteasy> "


def print_banner():
      """Print the RestEasy REPL banner."""
      if _RICH_AVAILABLE:
                _console.print(Panel(
                              "[bold deep_sky_blue1]RestEasy CLI[/bold deep_sky_blue1] v1.0  🌙\n"
                              "[dim]TCC-I Agent Harness — Type [bold]help[/bold] for commands[/dim]",
                              border_style="blue",
                ))
else:
        print(RESTEASY_BANNER)


def print_output(data: Any, fmt: str = "json"):
      """Print data in the specified format."""
      if fmt == "json":
                formatted = json.dumps(data, indent=2, ensure_ascii=False, default=str)
                if _RICH_AVAILABLE:
                              syntax = Syntax(formatted, "json", theme="monokai", word_wrap=True)
                              _console.print(syntax)
      else:
                    print(formatted)
else:
        # Plain text / CSV
          print(str(data))


def print_error(message: str):
      """Print an error message."""
      if _RICH_AVAILABLE:
                _err_console.print(f"[bold red]Error:[/bold red] {message}")
else:
        print(f"Error: {message}", file=sys.stderr)


def print_success(message: str):
      """Print a success message."""
      if _RICH_AVAILABLE:
                _console.print(f"[bold green]✓[/bold green] {message}")
else:
        print(f"✓ {message}")


def print_warning(message: str):
      """Print a warning message."""
      if _RICH_AVAILABLE:
                _console.print(f"[bold yellow]⚠[/bold yellow] {message}")
else:
        print(f"⚠ {message}")


def make_help_table(commands: dict[str, str]) -> str:
      """Build a help string from a commands dict."""
      lines = []
      max_cmd = max(len(k) for k in commands)
      for cmd, desc in commands.items():
                lines.append(f"  {cmd:<{max_cmd + 2}}{desc}")
            return "\n".join(lines)
