"""Job lookup and the student apply action."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.serializers import application_out, job_out
from app.services.matching import match_student_to_job

router = APIRouter(tags=["jobs"])


@router.get("/jobs", response_model=list[schemas.JobOut])
def list_jobs(
    companyId: str | None = None, activeOnly: bool = True, db: Session = Depends(get_db)
) -> list[schemas.JobOut]:
    query = db.query(models.Job)
    if companyId:
        query = query.filter(models.Job.company_id == companyId)
    if activeOnly:
        query = query.filter(models.Job.is_active.is_(True))
    return [job_out(job) for job in query.order_by(models.Job.created_at.desc()).all()]


@router.get("/jobs/{job_id}", response_model=schemas.JobOut)
def get_job(job_id: str, db: Session = Depends(get_db)) -> schemas.JobOut:
    job = db.get(models.Job, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    return job_out(job)


@router.post("/jobs/{job_id}/apply", response_model=schemas.MessageOut, status_code=201)
def apply_to_job(
    job_id: str, payload: schemas.ApplyIn, db: Session = Depends(get_db)
) -> schemas.MessageOut:
    job = db.get(models.Job, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    if not job.is_active:
        raise HTTPException(status_code=409, detail="This role is no longer accepting applications")

    student = db.get(models.Student, payload.student_id)
    if student is None:
        raise HTTPException(status_code=404, detail=f"Student {payload.student_id} not found")

    existing = (
        db.query(models.Application)
        .filter(
            models.Application.student_id == student.id,
            models.Application.job_id == job.id,
        )
        .first()
    )
    if existing is not None:
        return schemas.MessageOut(
            message=f"You already applied to {job.title}.",
            application=application_out(existing),
        )

    result = match_student_to_job(student, job)
    application = models.Application(
        id=f"APP{uuid.uuid4().hex[:10].upper()}",
        student_id=student.id,
        job_id=job.id,
        status=models.ApplicationStatus.APPLIED.value,
        match_score=result.matchScore,
    )
    db.add(application)
    db.commit()
    db.refresh(application)

    return schemas.MessageOut(
        message=f"Applied to {job.title} at {job.company.name}.",
        application=application_out(application),
    )
