"""Company: post a role, review ranked candidates, dashboard totals."""

from __future__ import annotations

import re
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.serializers import application_out, breakdown_out, job_out, project_out, skill_score_out
from app.services.matching import rank_students_for_job

router = APIRouter(prefix="/company", tags=["company"])

REACHED = {
    "SHORTLISTED": {"SHORTLISTED", "INTERVIEW", "SELECTED"},
    "INTERVIEW": {"INTERVIEW", "SELECTED"},
    "SELECTED": {"SELECTED"},
}


def _slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", value.lower()).strip("_")[:28] or "job"


@router.get("/{company_id}/dashboard", response_model=schemas.CompanyDashboardOut)
def company_dashboard(company_id: str, db: Session = Depends(get_db)) -> schemas.CompanyDashboardOut:
    company = db.get(models.Company, company_id)
    if company is None:
        raise HTTPException(status_code=404, detail=f"Company {company_id} not found")

    jobs = sorted(company.jobs, key=lambda job: job.created_at, reverse=True)
    job_ids = {job.id for job in jobs}
    applications = (
        db.query(models.Application)
        .filter(models.Application.job_id.in_(job_ids or {""}))
        .order_by(models.Application.updated_at.desc())
        .all()
    )

    return schemas.CompanyDashboardOut(
        company=schemas.CompanyOut(
            id=company.id,
            name=company.name,
            location=company.location,
            description=company.description,
            email=company.user.email,
        ),
        active_jobs=sum(1 for job in jobs if job.is_active),
        applications=len(applications),
        shortlisted=sum(1 for a in applications if a.status in REACHED["SHORTLISTED"]),
        selected=sum(1 for a in applications if a.status in REACHED["SELECTED"]),
        jobs=[job_out(job) for job in jobs],
        recent_applicants=[application_out(a) for a in applications[:8]],
    )


@router.post("/jobs", response_model=schemas.JobOut, status_code=201)
def create_job(payload: schemas.JobCreateIn, db: Session = Depends(get_db)) -> schemas.JobOut:
    company = db.get(models.Company, payload.company_id)
    if company is None:
        raise HTTPException(status_code=404, detail=f"Company {payload.company_id} not found")
    if not payload.required_skills:
        raise HTTPException(status_code=400, detail="A job needs at least one required skill")

    skills_by_name = {skill.name.lower(): skill for skill in db.query(models.Skill).all()}
    unknown = [
        requirement.skill
        for requirement in payload.required_skills
        if requirement.skill.lower() not in skills_by_name
    ]
    if unknown:
        raise HTTPException(status_code=400, detail=f"Unknown skills: {unknown}")

    job = models.Job(
        id=f"job_{_slug(payload.title)}_{uuid.uuid4().hex[:6]}",
        company_id=company.id,
        title=payload.title.strip(),
        location=payload.location.strip(),
        stipend=payload.stipend,
        min_cgpa=payload.min_cgpa,
        description=payload.description.strip(),
        openings=payload.openings,
        is_active=True,
    )
    db.add(job)
    db.flush()

    for requirement in payload.required_skills:
        db.add(
            models.JobSkill(
                job_id=job.id,
                skill_id=skills_by_name[requirement.skill.lower()].id,
                required_score=requirement.required_score,
                weight=requirement.weight,
            )
        )

    db.commit()
    db.refresh(job)
    return job_out(job)


@router.get("/jobs/{job_id}/matched-students", response_model=schemas.MatchedStudentsOut)
def matched_students(job_id: str, db: Session = Depends(get_db)) -> schemas.MatchedStudentsOut:
    job = db.get(models.Job, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    students = db.query(models.Student).all()
    applications = {
        application.student_id: application
        for application in db.query(models.Application)
        .filter(models.Application.job_id == job.id)
        .all()
    }

    candidates: list[schemas.MatchedStudentOut] = []
    for rank, (student, result) in enumerate(rank_students_for_job(students, job), start=1):
        application = applications.get(student.id)
        candidates.append(
            schemas.MatchedStudentOut(
                rank=rank,
                student_id=student.id,
                name=student.name,
                department=student.department,
                semester=student.semester,
                cgpa=student.cgpa,
                college=student.college,
                match_score=result.matchScore,
                eligible=result.eligible,
                reasons=result.reasons,
                skill_breakdown=breakdown_out(result),
                strengths=result.strengths,
                gaps=result.gaps,
                projects=[project_out(project) for project in student.projects],
                skills=[
                    skill_score_out(link)
                    for link in sorted(student.skills, key=lambda link: -link.final_score)
                ],
                applied=application is not None,
                application_id=application.id if application else None,
                status=application.status if application else None,
            )
        )

    return schemas.MatchedStudentsOut(job=job_out(job), candidates=candidates)
