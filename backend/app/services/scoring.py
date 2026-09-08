"""Skill score composition.

A student's score in a skill comes from three sources, blended by the weights
the brief fixes:

    final_score = 45% test + 35% subject + 20% project
"""

from __future__ import annotations

TEST_WEIGHT = 0.45
SUBJECT_WEIGHT = 0.35
PROJECT_WEIGHT = 0.20


def clamp(value: float, low: float = 0.0, high: float = 100.0) -> float:
    return max(low, min(high, value))


def compute_final_score(subject_score: float, test_score: float, project_score: float) -> float:
    """Blend the three components into the score everything else reads."""
    blended = (
        test_score * TEST_WEIGHT
        + subject_score * SUBJECT_WEIGHT
        + project_score * PROJECT_WEIGHT
    )
    return round(clamp(blended), 2)


def project_score_for(skill_name: str, project_skill_texts: list[str]) -> float:
    """
    A rough evidence signal: how many of the student's projects name this skill.

    One project mentioning the skill is worth 60, two or more is worth 85. It is
    deliberately coarse — the point is that building something counts for
    something, not that it can be measured precisely from a text field.
    """
    needle = skill_name.lower()
    hits = sum(1 for text in project_skill_texts if needle in text.lower())
    if hits == 0:
        return 0.0
    if hits == 1:
        return 60.0
    return 85.0
