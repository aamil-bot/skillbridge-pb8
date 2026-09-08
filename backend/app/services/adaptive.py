"""
Adaptive assessment: Item Response Theory (Rasch / 1-parameter logistic).

Instead of asking every student all 24 questions, this estimates ability per
skill after each answer and picks the next question that will tell us the most.
A student who answers React correctly gets a harder React question; one who
misses it gets an easier one. The test stops per skill once the estimate is
confident enough.

What this actually buys, stated precisely:

  * Informative item selection. Which question you see next depends on how you
    have done so far, so the 24 items asked are the 24 most informative out of
    64 rather than an arbitrary subset.
  * Continuous scoring. Three fixed questions can only ever yield 0, 33, 67 or
    100. This yields a graded ability estimate on the 0-100 scale.
  * A stated confidence. Every skill comes back with a standard error, so a
    thin estimate can be shown as provisional instead of passed off as fact.

What it does not buy, in this configuration: variable test length. Under a
1PL model the posterior width is driven by how many items were asked and how
close their difficulty sat to the student's ability, not by whether the answers
agreed with each other. Every student therefore settles at about the same item
count. Genuinely variable length needs a 2PL model with a per-item
discrimination parameter, which needs response data across many students to
calibrate - data this project does not have yet.

Deliberately no training data and no dependencies. IRT is fitted per student
from their own answers, so there is nothing to train and nothing to overfit —
which matters here, because the seeded cohort is synthetic and any supervised
model trained on it would only learn the seed formula back.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

# Difficulty label -> IRT b parameter. Negative is easier than average.
DIFFICULTY_B: dict[str, float] = {"easy": -1.0, "medium": 0.0, "hard": 1.1}

# Ability grid used for the posterior. -3..3 covers everything in practice.
_GRID = [(-3.0 + index * 0.05) for index in range(121)]

# Prior belief about ability before any answers: average, with wide uncertainty.
PRIOR_MEAN = 0.0
PRIOR_SD = 1.0

# A skill is settled once the estimate is this precise, or this many items in.
# The threshold is set from measurement, not taste: with a Rasch model and a
# prior SD of 1.0 the posterior width falls roughly 0.92 -> 0.85 -> 0.81 -> 0.77
# over the first four items, so 0.80 settles a consistent student around item
# three and lets an erratic one run to the cap. Push it lower and nothing ever
# settles; raise it and every skill stops at the minimum.
TARGET_STANDARD_ERROR = 0.80
MAX_ITEMS_PER_SKILL = 6
MIN_ITEMS_PER_SKILL = 2


@dataclass
class Response:
    """One graded answer, reduced to what the model needs."""

    difficulty_b: float
    correct: bool


@dataclass
class Ability:
    theta: float
    standard_error: float
    score: int
    confidence: str
    items_seen: int


def difficulty_b(label: str) -> float:
    return DIFFICULTY_B.get(label.lower(), 0.0)


def probability_correct(theta: float, b: float) -> float:
    """Rasch model: chance a student of ability theta answers an item of difficulty b."""
    return 1.0 / (1.0 + math.exp(-(theta - b)))


def _log_prior(theta: float) -> float:
    return -((theta - PRIOR_MEAN) ** 2) / (2 * PRIOR_SD**2)


def estimate_ability(responses: list[Response]) -> Ability:
    """
    Posterior mean and standard deviation of ability, over a fixed grid.

    A grid beats Newton-Raphson here: it cannot fail to converge, it handles the
    all-correct and all-wrong cases (where the likelihood has no interior
    maximum) without special-casing, and 121 points is instant.
    """
    log_weights: list[float] = []

    for theta in _GRID:
        total = _log_prior(theta)
        for response in responses:
            p = probability_correct(theta, response.difficulty_b)
            p = min(max(p, 1e-9), 1 - 1e-9)
            total += math.log(p) if response.correct else math.log(1 - p)
        log_weights.append(total)

    peak = max(log_weights)
    weights = [math.exp(value - peak) for value in log_weights]
    total_weight = sum(weights)

    mean = sum(theta * w for theta, w in zip(_GRID, weights)) / total_weight
    variance = sum(((theta - mean) ** 2) * w for theta, w in zip(_GRID, weights)) / total_weight
    standard_error = math.sqrt(variance)

    return Ability(
        theta=round(mean, 3),
        standard_error=round(standard_error, 3),
        score=theta_to_score(mean),
        confidence=confidence_label(standard_error),
        items_seen=len(responses),
    )


def theta_to_score(theta: float) -> int:
    """Map ability onto the 0-100 scale the rest of the system already speaks."""
    return max(0, min(100, round(50 + 18 * theta)))


def confidence_label(standard_error: float) -> str:
    """
    Bands calibrated to what this model and bank actually produce, so the label
    means something. A 1PL posterior does not get below ~0.75 within six items;
    quoting "high" at 0.45 would have meant the API never reported anything but
    low confidence.
    """
    if standard_error <= 0.78:
        return "high"
    if standard_error <= 0.90:
        return "medium"
    return "low"


def information(theta: float, b: float) -> float:
    """Fisher information. Peaks where item difficulty matches ability."""
    p = probability_correct(theta, b)
    return p * (1 - p)


def select_next_item(
    theta: float, candidates: list[tuple[str, float]]
) -> str | None:
    """
    Pick the unasked question that will reduce uncertainty the most.

    `candidates` is (question_id, difficulty_b). For the Rasch model the most
    informative item is the one whose difficulty sits closest to the current
    ability estimate — a question the student has roughly a coin-flip chance on
    tells you far more than one they will certainly get right or wrong.
    """
    if not candidates:
        return None
    return max(candidates, key=lambda item: information(theta, item[1]))[0]


def is_skill_settled(ability: Ability) -> bool:
    if ability.items_seen >= MAX_ITEMS_PER_SKILL:
        return True
    if ability.items_seen < MIN_ITEMS_PER_SKILL:
        return False
    return ability.standard_error <= TARGET_STANDARD_ERROR


def choose_next_skill(
    abilities: dict[str, Ability], available: dict[str, list[tuple[str, float]]]
) -> str | None:
    """
    Whichever skill we are least sure about, provided it still has questions.

    Spending the next question where uncertainty is highest is what lets the
    test finish early overall rather than grinding through every skill equally.
    """
    open_skills = [
        skill
        for skill, items in available.items()
        if items and not is_skill_settled(abilities.get(skill, _blank_ability()))
    ]
    if not open_skills:
        return None
    return max(
        open_skills,
        key=lambda skill: abilities.get(skill, _blank_ability()).standard_error,
    )


def _blank_ability() -> Ability:
    return Ability(
        theta=PRIOR_MEAN,
        standard_error=PRIOR_SD,
        score=theta_to_score(PRIOR_MEAN),
        confidence=confidence_label(PRIOR_SD),
        items_seen=0,
    )


def blank_ability() -> Ability:
    """Ability before any evidence — the prior."""
    return _blank_ability()
