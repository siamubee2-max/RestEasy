"""Project config management — load/save .resteasy.json project config."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Optional


DEFAULT_CONFIG = {
      "version": "1.0",
      "supabase_url": "",
      "supabase_anon_key": "",
      "supabase_service_key": "",
      "project_ref": "",
      "environment": "development",
      "output_format": "json",
}

CONFIG_FILENAME = ".resteasy.json"


def find_config_path(start: Optional[str] = None) -> Optional[Path]:
      """Walk up directory tree to find .resteasy.json."""
      current = Path(start or os.getcwd())
      for parent in [current, *current.parents]:
                candidate = parent / CONFIG_FILENAME
                if candidate.exists():
                              return candidate
                      return None


def load_config(path: Optional[str] = None) -> dict:
      """Load project config from file or environment variables."""
      config = DEFAULT_CONFIG.copy()

    # Try file first
      config_path = Path(path) if path else find_config_path()
      if config_path and config_path.exists():
                with open(config_path, "r") as f:
                              file_config = json.load(f)
                          config.update(file_config)

      # Override with env vars
      env_map = {
          "SUPABASE_URL": "supabase_url",
          "SUPABASE_ANON_KEY": "supabase_anon_key",
          "SUPABASE_SERVICE_KEY": "supabase_service_key",
          "RESTEASY_ENV": "environment",
          "RESTEASY_FORMAT": "output_format",
      }
      for env_key, config_key in env_map.items():
                val = os.environ.get(env_key)
                if val:
                              config[config_key] = val

            return config


def save_config(config: dict, path: Optional[str] = None) -> str:
      """Save config to file. Returns path written."""
    config_path = Path(path) if path else Path.cwd() / CONFIG_FILENAME
    with open(config_path, "w") as f:
              json.dump(config, f, indent=2)
          return str(config_path)


def get_setting(key: str, config: Optional[dict] = None) -> Optional[str]:
      """Get a single config value."""
    c = config or load_config()
    return c.get(key)
