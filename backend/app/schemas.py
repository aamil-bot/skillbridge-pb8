"""Pydantic request and response models.

Everything the API emits is camelCase, because the consumer is a TypeScript
frontend. Inputs accept either casing.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

ApplicationStatusLiteral = Literal[
    "APPLIED", "SHORTLISTED", "INTERVIEW", "SELECTED", "REJECTED"
]


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, from_attributes=True
    )


# --------------------------------------------------------------------------- #
# Health & auth                                                                #
# --------------------------------------------------------------------------- #


class HealthOut(CamelModel):
    status: str = "ok"
    service: str = "skillbridge-api"
    version: str = "1.0.0"
    database: str


class AccountOut(CamelModel):
    id: str
    role: str
    name: str
    email: str
    detail: str


class LoginIn(CamelModel):
    role: str
    email: str
    password: str


class LoginOut(CamelModel):
    account: AccountOut
    token: str


# --------------------------------------------------------------------------- #
# Student                                                                      #
# --------------------------------------------------------------------------- #


class ProjectOut(CamelModel):
    id: str
    title: str
    description: str
    skills_text: str


class ProjectIn(CamelModel):
    id: str | None = None
    title: str
    description: str = ""
    skills_text: str = ""


class SkillScoreOut(CamelModel):
    skill: str
    category: str
    subject_score: float
    test_score: float
    project_score: float
    final_score: float
    level: str


class StudentOut(CamelModel):
    id: str
    name: str
    email: str
    registration_number: str
    college: str
    department: str
    semester: int
    cgpa: float
    preferred_city: str
    expected_stipend: int
    projects: list[ProjectOut] = []
    skills: list[SkillScoreOut] = []
    assessment_completed: bool = False
    last_assessment_at: datetime | None = None
    profile_completion: int = 0


class StudentProfileIn(CamelModel):
    preferred_city: str | None = None
    expected_stipend: int | None = Field(default=None, ge=0, le=500000)
    projects: list[ProjectIn] | None = None


class SkillProfileOut(CamelModel):
    student_id: str
    skills: list[SkillScoreOut]
    strongest: list[str]
    weakest: list[str]


# --------------------------------------------------------------------------- #
# Assessment                                                                   #
# --------------------------------------------------------------------------- #


class OptionOut(CamelModel):
    id: str
    text: str


class QuestionOut(CamelModel):
    """Delivered without the answer key — grading happens server side."""

    id: str
    skill: str
    question_text: str
    options: list[OptionOut]
    difficulty: str


class TestAnswerIn(CamelModel):
    question_id: str
    selected_option: str


class TestSubmitIn(CamelModel):
    student_id: str
    answers: list[TestAnswerIn]


class SkillResultOut(CamelModel):
    skill: str
    correct: int
    total: int
    test_score: float
    previous_final_score: float
    final_score: float
    delta: float


class TestResultOut(CamelModel):
    attempt_id: str
    student_id: str
    total_score: float
    correct_count: int
    total_questions: int
    completed_at: datetime
    skill_results: list[SkillResultOut]
    skill_profile: list[SkillScoreOut]


class AbilityOut(CamelModel):
    """What the model believes about one skill, and how sure it is."""

    skill: str
    theta: float
    standard_error: float
    score: int
    confidence: str
    items_seen: int
    settled: bool


class AdaptiveStartIn(CamelModel):
    student_id: str


class AdaptiveAnswerIn(CamelModel):
    attempt_id: str
    question_id: str
    selected_option: str


class AdaptiveStateOut(CamelModel):
    attempt_id: str
    student_id: str
    status: str
    asked: int
    total_pool: int
    question: QuestionOut | None = None
    abilities: list[AbilityOut]
    finished: bool = False
    result: "TestResultOut | None" = None
    saved_questions: int = 0


# --------------------------------------------------------------------------- #
# Jobs & matching                                                              #
# --------------------------------------------------------------------------- #


class JobSkillOut(CamelModel):
    skill: str
    required_score: float
    weight: float


class JobOut(CamelModel):
    id: str
    title: str
    company_id: str
    company: str
    location: str
    stipend: int
    min_cgpa: float
    description: str
    openings: int
    is_active: bool
    created_at: datetime
    required_skills: list[JobSkillOut]


class JobCreateIn(CamelModel):
    company_id: str
    title: str
    location: str
    stipend: int = Field(ge=0, le=500000)
    min_cgpa: float = Field(ge=0, le=10)
    description: str = ""
    openings: int = Field(default=1, ge=1, le=100)
    required_skills: list[JobSkillOut]


class SkillBreakdownOut(CamelModel):
    skill: str
    student_score: int
    required_score: int
    gap: int
    status: str
    weight: float


class MatchOut(CamelModel):
    job_id: str
    job_title: str
    company: str
    location: str
    stipend: int
    match_score: int
    eligible: bool
    reasons: list[str]
    skill_breakdown: list[SkillBreakdownOut]
    strengths: list[str]
    gaps: list[str]
    student_cgpa: float
    required_cgpa: float
    components: dict[str, float]
    applied: bool = False
    application_id: str | None = None
    application_status: ApplicationStatusLiteral | None = None


class MatchesOut(CamelModel):
    student_id: str
    matches: list[MatchOut]


class MatchedStudentOut(CamelModel):
    rank: int
    student_id: str
    name: str
    department: str
    semester: int
    cgpa: float
    college: str
    match_score: int
    eligible: bool
    reasons: list[str]
    skill_breakdown: list[SkillBreakdownOut]
    strengths: list[str]
    gaps: list[str]
    projects: list[ProjectOut]
    skills: list[SkillScoreOut]
    applied: bool
    application_id: str | None = None
    status: ApplicationStatusLiteral | None = None


class MatchedStudentsOut(CamelModel):
    job: JobOut
    candidates: list[MatchedStudentOut]


# --------------------------------------------------------------------------- #
# Applications                                                                 #
# --------------------------------------------------------------------------- #


class ApplicationOut(CamelModel):
    id: str
    student_id: str
    student_name: str
    job_id: str
    job_title: str
    company_id: str
    company: str
    location: str
    stipend: int
    status: ApplicationStatusLiteral
    match_score: int
    created_at: datetime
    updated_at: datetime


class ApplyIn(CamelModel):
    student_id: str


class StatusUpdateIn(CamelModel):
    status: ApplicationStatusLiteral


class MessageOut(CamelModel):
    message: str
    application: ApplicationOut | None = None


# --------------------------------------------------------------------------- #
# TPO                                                                          #
# --------------------------------------------------------------------------- #


class FunnelStageOut(CamelModel):
    stage: str
    count: int


class DepartmentStatOut(CamelModel):
    department: str
    students: int
    applications: int
    selected: int
    placement_rate: int


class TpoDashboardOut(CamelModel):
    total_students: int
    total_companies: int
    active_jobs: int
    applications: int
    shortlisted: int
    selected: int
    funnel: list[FunnelStageOut]
    departments: list[DepartmentStatOut]
    top_recruiters: list[dict]


class SkillGapOut(CamelModel):
    skill: str
    department: str
    company_demand: float
    student_average: float
    gap: float
    severity: str
    students_below_bar: int
    open_roles: int


class SkillGapStudentOut(CamelModel):
    student_id: str
    name: str
    department: str
    semester: int
    cgpa: float
    score: float
    target: float
    gap: float


class CompanyOut(CamelModel):
    id: str
    name: str
    location: str
    description: str
    email: str


class CompanyDashboardOut(CamelModel):
    company: CompanyOut
    active_jobs: int
    applications: int
    shortlisted: int
    selected: int
    jobs: list[JobOut]
    recent_applicants: list[ApplicationOut]
