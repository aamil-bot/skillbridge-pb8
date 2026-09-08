"""The matching engine.

One reusable service, used by the student match list, the company's ranked
candidate list, and the score stored on an application. The calculation is fixed
by the brief and is meant to be explainable line by line:

    Match Score = 60% weighted skill compatibility
                + 20% CGPA eligibility
                + 10% project signal
                + 10% location / preference fit
"""

from __future__ import annotations

from dataclasses import dataclass, field

from app.models import Job, Student

SKILL_WEIGHT = 0.60
CGPA_WEIGHT = 0.20
PROJECT_WEIGHT = 0.10
LOCATION_WEIGHT = 0.10

STATUS_STRENGTH = "Strength"
STATUS_GAP = "Gap"


@dataclass
class SkillBreakdown:
    skill: str
    studentScore: int
    requiredScore: int
    gap: int
    status: str
    weight: float


@dataclass
class MatchResult:
    matchScore: int
    eligible: bool
    reasons: list[str] = field(default_factory=list)
    skillBreakdown: list[SkillBreakdown] = field(default_factory=list)
    strengths: list[str] = field(default_factory=list)
    gaps: list[str] = field(default_factory=list)
    studentCgpa: float = 0.0
    requiredCgpa: float = 0.0
    components: dict[str, float] = field(default_factory=dict)


def _skill_scores(student: Student) -> dict[str, float]:
    return {link.skill.name: link.final_score for link in student.skills}


def _skill_compatibility(
    student_scores: dict[str, float], job: Job
) -> tuple[float, list[SkillBreakdown]]:
    """Weighted attainment against every required skill, 0.0–1.0."""
    breakdown: list[SkillBreakdown] = []
    total_weight = 0.0
    attained = 0.0

    for requirement in job.required_skills:
        name = requirement.skill.name
        student_score = student_scores.get(name, 0.0)
        required = requirement.required_score

        skill_fit = min(student_score / required, 1.0) if required > 0 else 1.0
        gap = max(required - student_score, 0.0)

        attained += skill_fit * requirement.weight
        total_weight += requirement.weight

        breakdown.append(
            SkillBreakdown(
                skill=name,
                studentScore=round(student_score),
                requiredScore=round(required),
                gap=round(gap),
                status=STATUS_GAP if gap > 0 else STATUS_STRENGTH,
                weight=requirement.weight,
            )
        )

    compatibility = attained / total_weight if total_weight else 0.0
    breakdown.sort(key=lambda row: (row.status != STATUS_GAP, -row.gap))
    return compatibility, breakdown


def _cgpa_component(student: Student, job: Job) -> tuple[float, bool]:
    """Full marks when the cut-off is met, tapering to zero two points below."""
    if job.min_cgpa <= 0:
        return 1.0, True
    if student.cgpa >= job.min_cgpa:
        return 1.0, True
    shortfall = job.min_cgpa - student.cgpa
    return max(0.0, 1.0 - shortfall / 2.0), False


def _project_component(student: Student, job: Job) -> tuple[float, int, int]:
    """How much of the job's skill list the student has actually built with."""
    required = [requirement.skill.name.lower() for requirement in job.required_skills]
    if not required:
        return 0.0, 0, 0

    evidence = " ".join(
        f"{project.skills_text} {project.title}".lower() for project in student.projects
    )
    matched = sum(1 for name in required if name in evidence)

    if matched:
        return matched / len(required), matched, len(required)
    # Having built anything at all is worth a little, even off-target.
    return (0.2 if student.projects else 0.0), 0, len(required)


def _location_component(student: Student, job: Job) -> tuple[float, str]:
    preferred = (student.preferred_city or "").strip().lower()
    location = (job.location or "").strip().lower()

    if not preferred:
        return 0.5, "No city preference set"
    if location in {"remote", "anywhere"}:
        return 1.0, "Role is remote"
    if preferred == location:
        return 1.0, f"Preferred city matches {job.location}"
    return 0.0, f"Prefers {student.preferred_city}, role is in {job.location}"


def match_student_to_job(student: Student, job: Job) -> MatchResult:
    """Score one student against one job and explain the result."""
    student_scores = _skill_scores(student)

    compatibility, breakdown = _skill_compatibility(student_scores, job)
    cgpa_fit, eligible = _cgpa_component(student, job)
    project_fit, matched_projects, required_count = _project_component(student, job)
    location_fit, location_reason = _location_component(student, job)

    score = (
        compatibility * SKILL_WEIGHT
        + cgpa_fit * CGPA_WEIGHT
        + project_fit * PROJECT_WEIGHT
        + location_fit * LOCATION_WEIGHT
    ) * 100

    strengths = [row.skill for row in breakdown if row.status == STATUS_STRENGTH]
    gaps = [row.skill for row in breakdown if row.status == STATUS_GAP]

    reasons: list[str] = []

    for row in sorted(
        (row for row in breakdown if row.status == STATUS_STRENGTH),
        key=lambda row: -row.studentScore,
    )[:2]:
        reasons.append(f"Strong {row.skill} score: {row.studentScore}/100")

    if eligible:
        reasons.append(
            f"Meets CGPA requirement: {student.cgpa} / {job.min_cgpa}"
        )
    else:
        reasons.append(
            f"Below CGPA requirement: {student.cgpa} / {job.min_cgpa}"
        )

    for row in sorted(
        (row for row in breakdown if row.status == STATUS_GAP), key=lambda row: -row.gap
    )[:2]:
        reasons.append(
            f"{row.skill} gap: required {row.requiredScore}, current score {row.studentScore}"
        )

    if required_count:
        if matched_projects:
            reasons.append(
                f"Projects evidence {matched_projects} of {required_count} required skills"
            )
        elif student.projects:
            reasons.append("Has projects on record, none matching the required skills")
        else:
            reasons.append("No projects on record")

    reasons.append(location_reason)

    return MatchResult(
        matchScore=round(score),
        eligible=eligible,
        reasons=reasons,
        skillBreakdown=breakdown,
        strengths=strengths,
        gaps=gaps,
        studentCgpa=student.cgpa,
        requiredCgpa=job.min_cgpa,
        components={
            "skillCompatibility": round(compatibility * 100, 1),
            "cgpaEligibility": round(cgpa_fit * 100, 1),
            "projectSignal": round(project_fit * 100, 1),
            "locationFit": round(location_fit * 100, 1),
        },
    )


def rank_students_for_job(students: list[Student], job: Job) -> list[tuple[Student, MatchResult]]:
    """Every student scored against one job, best first."""
    scored = [(student, match_student_to_job(student, job)) for student in students]
    scored.sort(key=lambda pair: (-pair[1].matchScore, -pair[0].cgpa))
    return scored


def rank_jobs_for_student(student: Student, jobs: list[Job]) -> list[tuple[Job, MatchResult]]:
    """Every job scored for one student, best first."""
    scored = [(job, match_student_to_job(student, job)) for job in jobs]
    scored.sort(key=lambda pair: -pair[1].matchScore)
    return scored
