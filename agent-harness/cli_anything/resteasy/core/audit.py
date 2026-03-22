"""HIPAA audit log — query audit_log table from Supabase."""

from __future__ import annotations
from datetime import datetime
from typing import Optional


def get_audit_log(client, user_id: Optional[str] = None, limit: int = 100) -> list[dict]:
      """Fetch HIPAA audit log entries."""
      query = client.table("audit_log").select("*").order("created_at", desc=True).limit(limit)
      if user_id:
                query = query.eq("user_id", user_id)
            resp = query.execute()
    return resp.data or []


def log_event(client, user_id: str, action: str, resource: str, details: Optional[dict] = None) -> dict:
      """Write an audit log entry."""
    record = {
              "user_id": user_id,
              "action": action,
              "resource": resource,
              "details": details or {},
              "created_at": datetime.utcnow().isoformat(),
              "ip_address": "cli",
              "user_agent": "resteasy-cli/1.0",
    }
    resp = client.table("audit_log").insert(record).execute()
    return resp.data[0] if resp.data else record


def get_audit_summary(client, user_id: str) -> dict:
      """Get audit summary for a user."""
    entries = get_audit_log(client, user_id=user_id)
    actions = {}
    for e in entries:
              action = e.get("action", "unknown")
              actions[action] = actions.get(action, 0) + 1
          return {
                    "user_id": user_id,
                    "total_events": len(entries),
                    "actions_summary": actions,
                    "first_event": entries[-1].get("created_at") if entries else None,
                    "last_event": entries[0].get("created_at") if entries else None,
          }
