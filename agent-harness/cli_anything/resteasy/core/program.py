"""6-week TCC-I program state and module definitions."""

from __future__ import annotations
from typing import Optional

# ── TCC-I Module definitions ────────────────────────────────────────────────────
MODULES = [
      {
                "id": "s1_sleep_education",
                "week": 1,
                "title": "Sleep Education",
                "title_fr": "Éducation au sommeil",
                "description": "Understanding sleep architecture and the two-process model",
                "description_fr": "Comprendre l'architecture du sommeil et le modèle à deux processus",
                "techniques": ["sleep_restriction", "stimulus_control"],
      },
      {
                "id": "s2_stimulus_control",
                "week": 2,
                "title": "Stimulus Control",
                "title_fr": "Contrôle des stimuli",
                "description": "Reconditioning the bed-sleep association",
                "description_fr": "Reconditionner l'association lit-sommeil",
                "techniques": ["stimulus_control", "sleep_restriction"],
      },
      {
                "id": "s3_cognitive_restructuring",
                "week": 3,
                "title": "Cognitive Restructuring",
                "title_fr": "Restructuration cognitive",
                "description": "Identifying and transforming negative sleep thoughts",
                "description_fr": "Identifier et transformer les pensées négatives sur le sommeil",
                "techniques": ["cognitive_restructuring"],
      },
      {
                "id": "s4_relaxation",
                "week": 4,
                "title": "Relaxation Techniques",
                "title_fr": "Techniques de relaxation",
                "description": "Progressive muscle relaxation and breathing exercises",
                "description_fr": "Relaxation musculaire progressive et exercices de respiration",
                "techniques": ["relaxation", "breathing"],
      },
      {
                "id": "s5_sleep_hygiene",
                "week": 5,
                "title": "Sleep Hygiene",
                "title_fr": "Hygiène du sommeil",
                "description": "Environmental and behavioral factors affecting sleep",
                "description_fr": "Facteurs environnementaux et comportementaux affectant le sommeil",
                "techniques": ["sleep_hygiene"],
      },
      {
                "id": "s6_relapse_prevention",
                "week": 6,
                "title": "Relapse Prevention",
                "title_fr": "Prévention des rechutes",
                "description": "Maintaining gains and managing future sleep disruptions",
                "description_fr": "Maintenir les acquis et gérer les futures perturbations du sommeil",
                "techniques": ["relapse_prevention"],
      },
]


def get_module(module_id: str) -> Optional[dict]:
      """Return module definition by ID."""
      return next((m for m in MODULES if m["id"] == module_id), None)


def get_week_module(week: int) -> Optional[dict]:
      """Return module for a given week (1-6)."""
      return next((m for m in MODULES if m["week"] == week), None)


def list_modules() -> list[dict]:
      """Return all module definitions."""
      return MODULES


def program_progress(completed_module_ids: list[str]) -> dict:
      """Compute program progress from completed module IDs."""
      completed = set(completed_module_ids)
      total = len(MODULES)
      done = sum(1 for m in MODULES if m["id"] in completed)
      return {
          "completed": done,
          "total": total,
          "percentage": round(done / total * 100, 1) if total > 0 else 0,
          "completed_ids": list(completed),
          "remaining": [m["id"] for m in MODULES if m["id"] not in completed],
      }
  
