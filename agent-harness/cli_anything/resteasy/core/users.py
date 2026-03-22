"""User profile queries — wrap Supabase user/profile tables."""

from __future__ import annotations
from typing import Optional


def get_user_profile(client, user_id: str) -> Optional[dict]:
      """Fetch user profile from Supabase."""
      resp = client.table("profiles").select("*").eq("id", user_id).single().execute()
      return resp.data


def list_users(client, limit: int = 50) -> list[dict]:
      """List user profiles."""
      resp = client.table("profiles").select("id, email, created_at, program_week, locale").limit(limit).execute()
      return resp.data or []


def get_user_sleep_entries(client, user_id: str, limit: int = 30) -> list[dict]:
      """Get recent sleep journal entries for a user."""
      resp = (
          client.table("sleep_entries")
          .select("*")
          .eq("user_id", user_id)
          .order("date", desc=True)
          .limit(limit)
          .execute()
      )
      return resp.data or []


def get_user_isi_scores(client, user_id: str) -> list[dict]:
      """Get all ISI scores for a user."""
      resp = (
          client.table("isi_scores")
          .select("*")
          .eq("user_id", user_id)
          .order("created_at", desc=False)
          .execute()
      )
      return resp.data or []


def get_user_streak(client, user_id: str) -> dict:
      """Get current streak info for a user."""
      resp = (
          client.table("profiles")
          .select("streak_current, streak_longest, last_entry_date")
          .eq("id", user_id)
          .single()
          .execute()
      )
      return resp.data or {}
  
