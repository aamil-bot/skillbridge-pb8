"""Model -> schema conversion shared by the routers."""

from __future__ import annotations

import json

from sqlalchemy.orm import Session

from app import models, schemas
from app.services.matching import MatchResult


def level_for(score: float) -> str:
    if score >= 80:
        return "Advanced"
    if score >= 65:
        return "Proficient"
    if score >= 45:
        return "Developing"
    return "Beginner"


def skill_score_out(link: models.StudentSkill) -> schemas.SkillScoreOut:
    return schemas.SkillScoreOut(
        skill=link.skill.name,
        category=link.skill.category,
        subject_score=round(link.subject_score, 1),
        test_score=round(link.test_score, 1),
        project_score=round(link.project_score, 1),
        final_score=round(link.final_score, 1),
        level=level_for(link.final_score),
    )


def project_out(project: models.Project) -> schemas.ProjectOut:
    return schemas.ProjectOut(
        id=project.id,
        title=project.title,
        description=project.description,
        skills_text=project.skills_text,
    )


def profile_completion(student: models.Student, has_attempt: bool) -> int:
    filled = 4  # name, registration, department and CGPA come from the college
    if student.projects:
        filled += 1
    if student.preferred_city:
        filled += 1
    if student.expected_stipend:
        filled += 1
    if has_attempt:
        filled += 1
    return round(filled / 8 * 100)


def student_out(db: Session, student: models.Student) -> schemas.StudentOut:
    latest = (
        db.query(models.TestAttempt)
        .filter(models.TestAttempt.student_id == student.id)
        .order_by(models.TestAttempt.completed_at.desc())
        .first()
    )
    skills = sorted(student.skills, key=lambda link: -link.final_score)

    return schemas.StudentOut(
        id=student.id,
        name=student.name,
        email=student.user.email,
        registration_number=student.registration_number,
        college=student.college,
        department=student.department,
        semester=student.semester,
        cgpa=student.cgpa,
        preferred_city=student.preferred_city,
        expected_stipend=student.expected_stipend,
        projects=[project_out(project) for project in student.projects],
        skills=[skill_score_out(link) for link in skills],
        assessment_completed=latest is not None,
        last_assessment_at=latest.completed_at if latest else None,
        profile_completion=profile_completion(student, latest is not None),
    )


def job_out(job: models.Job) -> schemas.JobOut:
    return schemas.JobOut(
        id=job.id,
        title=job.title,
        company_id=job.company_id,
        company=job.company.name,
        location=job.location,
        stipend=job.stipend,
        min_cgpa=job.min_cgpa,
        description=job.description,
        openings=job.openings,
        is_active=job.is_active,
        created_at=job.created_at,
        required_skills=[
            schemas.JobSkillOut(
                skill=requirement.skill.name,
                required_score=requirement.required_score,
                weight=requirement.weight,
            )
            for requirement in job.required_skills
        ],
    )


def breakdown_out(result: MatchResult) -> list[schemas.SkillBreakdownOut]:
    return [
        schemas.SkillBreakdownOut(
            skill=row.skill,
            student_score=row.studentScore,
            required_score=row.requiredScore,
            gap=row.gap,
            status=row.status,
            weight=row.weight,
        )
        for row in result.skillBreakdown
    ]


def application_out(application: models.Application) -> schemas.ApplicationOut:
    return schemas.ApplicationOut(
        id=application.id,
        student_id=application.student_id,
        student_name=application.student.name,
        job_id=application.job_id,
        job_title=application.job.title,
        company_id=application.job.company_id,
        company=application.job.company.name,
        location=application.job.location,
        stipend=application.job.stipend,
        status=application.status,
        match_score=round(application.match_score),
        created_at=application.created_at,
        updated_at=application.updated_at,
    )


def question_out(question: models.Question) -> schemas.QuestionOut:
    options = json.loads(question.options_json)
    return schemas.QuestionOut(
        id=question.id,
        skill=question.skill.name,
        question_text=question.question_text,
        options=[schemas.OptionOut(**option) for option in options],
        difficulty=question.difficulty,
    )


def account_out(user: models.User, db: Session) -> schemas.AccountOut:
    detail = ""
    if user.role == models.Role.STUDENT.value and user.student:
        student = user.student
        detail = (
            f"{student.department} · Semester {student.semester} · CGPA {student.cgpa:.1f}"
        )
    elif user.role == models.Role.COMPANY.value and user.company:
        detail = f"{user.company.description[:60]} · {user.company.location}".strip(" ·")
    else:
        detail = "Training & Placement Office"

    account_id = user.id
    if user.student:
        account_id = user.student.id
    elif user.company:
        account_id = user.company.id

    return schemas.AccountOut(
        id=account_id,
        role=user.role,
        name=user.display_name,
        email=user.email,
        detail=detail,
    )
