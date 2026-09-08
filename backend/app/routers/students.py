"""Student profile, skill profile, matches and applications."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.serializers import (
    application_out,
    breakdown_out,
    project_out,
    skill_score_out,
    student_out,
)
from app.services.matching import rank_jobs_for_student
from app.services.scoring import compute_final_score, project_score_for

router = APIRouter(prefix="/students", tags=["student"])


def _require_student(db: Session, student_id: str) -> models.Student:
    student = db.get(models.Student, student_id)
    if student is None:
        raise HTTPException(status_code=404, detail=f"Student {student_id} not found")
    return student


@router.get("/{student_id}", response_model=schemas.StudentOut)
def get_student(student_id: str, db: Session = Depends(get_db)) -> schemas.StudentOut:
    return student_out(db, _require_student(db, student_id))


@router.patch("/{student_id}/profile", response_model=schemas.StudentOut)
def update_profile(
    student_id: str, payload: schemas.StudentProfileIn, db: Session = Depends(get_db)
) -> schemas.StudentOut:
    student = _require_student(db, student_id)

    if payload.preferred_city is not None:
        student.preferred_city = payload.preferred_city.strip()
    if payload.expected_stipend is not None:
        student.expected_stipend = payload.expected_stipend

    if payload.projects is not None:
        for project in list(student.projects):
            db.delete(project)
        db.flush()

        for index, incoming in enumerate(payload.projects, start=1):
            db.add(
                models.Project(
                    id=incoming.id or f"{student.id}_PRJ{index:02d}",
                    student_id=student.id,
                    title=incoming.title.strip(),
                    description=incoming.description.strip(),
                    skills_text=incoming.skills_text.strip(),
                )
            )
        db.flush()
        db.refresh(student)

        # Project evidence feeds the skill score, so recompute it.
        texts = [f"{p.skills_text} {p.title}" for p in student.projects]
        for link in student.skills:
            link.project_score = project_score_for(link.skill.name, texts)
            link.final_score = compute_final_score(
                link.subject_score, link.test_score, link.project_score
            )

    db.commit()
    db.refresh(student)
    return student_out(db, student)


@router.get("/{student_id}/skill-profile", response_model=schemas.SkillProfileOut)
def get_skill_profile(student_id: str, db: Session = Depends(get_db)) -> schemas.SkillProfileOut:
    student = _require_student(db, student_id)
    ranked = sorted(student.skills, key=lambda link: -link.final_score)

    return schemas.SkillProfileOut(
        student_id=student.id,
        skills=[skill_score_out(link) for link in ranked],
        strongest=[link.skill.name for link in ranked[:3]],
        weakest=[link.skill.name for link in ranked[-3:]][::-1],
    )


@router.get("/{student_id}/matches", response_model=schemas.MatchesOut)
def get_matches(student_id: str, db: Session = Depends(get_db)) -> schemas.MatchesOut:
    student = _require_student(db, student_id)
    jobs = db.query(models.Job).filter(models.Job.is_active.is_(True)).all()

    applications = {
        application.job_id: application
        for application in db.query(models.Application)
        .filter(models.Application.student_id == student.id)
        .all()
    }

    matches: list[schemas.MatchOut] = []
    for job, result in rank_jobs_for_student(student, jobs):
        application = applications.get(job.id)
        matches.append(
            schemas.MatchOut(
                job_id=job.id,
                job_title=job.title,
                company=job.company.name,
                location=job.location,
                stipend=job.stipend,
                match_score=result.matchScore,
                eligible=result.eligible,
                reasons=result.reasons,
                skill_breakdown=breakdown_out(result),
                strengths=result.strengths,
                gaps=result.gaps,
                student_cgpa=result.studentCgpa,
                required_cgpa=result.requiredCgpa,
                components=result.components,
                applied=application is not None,
                application_id=application.id if application else None,
                application_status=application.status if application else None,
            )
        )

    return schemas.MatchesOut(student_id=student.id, matches=matches)


@router.get("/{student_id}/applications", response_model=list[schemas.ApplicationOut])
def get_applications(
    student_id: str, db: Session = Depends(get_db)
) -> list[schemas.ApplicationOut]:
    student = _require_student(db, student_id)
    applications = (
        db.query(models.Application)
        .filter(models.Application.student_id == student.id)
        .order_by(models.Application.updated_at.desc())
        .all()
    )
    return [application_out(application) for application in applications]
