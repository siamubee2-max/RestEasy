"""Supabase CLI + Python client wrapper."""

from __future__ import annotations

import os
import subprocess
from typing import Optional


def get_supabase_client(url: Optional[str] = None, key: Optional[str] = None):
      """Create and return a Supabase client.

          Uses environment variables if url/key not provided:
              - SUPABASE_URL
                  - SUPABASE_ANON_KEY or SUPABASE_SERVICE_KEY
                      """
      try:
                from supabase import create_client, Client
except ImportError:
        raise ImportError("supabase package required: pip install supabase")

    supabase_url = url or os.environ.get("SUPABASE_URL") or os.environ.get("EXPO_PUBLIC_SUPABASE_URL")
    supabase_key = (
              key
              or os.environ.get("SUPABASE_SERVICE_KEY")
              or os.environ.get("SUPABASE_ANON_KEY")
              or os.environ.get("EXPO_PUBLIC_SUPABASE_ANON_KEY")
    )

    if not supabase_url or not supabase_key:
              raise ValueError(
                            "Supabase URL and key required. Set SUPABASE_URL and SUPABASE_SERVICE_KEY "
                            "environment variables or pass them explicitly."
              )

    return create_client(supabase_url, supabase_key)


def run_supabase_cli(*args: str, capture: bool = True) -> subprocess.CompletedProcess:
    """Run a supabase CLI command."""
    cmd = ["supabase", *args]
    result = subprocess.run(
              cmd,
              capture_output=capture,
              text=True,
    )
    return result


def list_migrations() -> list[str]:
      """List applied database migrations via supabase CLI."""
      result = run_supabase_cli("migration", "list")
      if result.returncode != 0:
                raise RuntimeError(f"supabase migration list failed: {result.stderr}")
            lines = result.stdout.strip().splitlines()
    return [line.strip() for line in lines if line.strip()]


def list_functions() -> list[str]:
      """List deployed Edge Functions via supabase CLI."""
    result = run_supabase_cli("functions", "list")
    if result.returncode != 0:
              raise RuntimeError(f"supabase functions list failed: {result.stderr}")
          lines = result.stdout.strip().splitlines()
    return [line.strip() for line in lines if line.strip()]


def check_connection(client) -> dict:
      """Test Supabase connection by querying server time."""
    try:
              resp = client.rpc("now").execute()
              return {"connected": True, "server_time": str(resp.data)}
except Exception as e:
        return {"connected": False, "error": str(e)}
