"""Placement-office analytics: KPIs, funnel, and department skill gaps."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db

router = APIRouter(prefix="/tpo", tags=["tpo"])

# Once a student reaches a stage they count for it, whatever happened next.
AFTER_SHORTLIST = {"SHORTLISTED", "INTERVIEW", "SELECTED"}
AFTER_INTERVIEW = {"INTERVIEW", "SELECTED"}
SELECTED = {"SELECTED"}


def _severity(gap: float) -> str:
    if gap >= 20:
        return "CRITICAL"
    if gap >= 8:
        return "MODERATE"
    return "HEALTHY"


@router.get("/dashboard", response_model=schemas.TpoDashboardOut)
def dashboard(db: Session = Depends(get_db)) -> schemas.TpoDashboardOut:
    students = db.query(models.Student).all()
    companies = db.query(models.Company).all()
    jobs = db.query(models.Job).filter(models.Job.is_active.is_(True)).all()
    applications = db.query(models.Application).all()

    shortlisted = sum(1 for a in applications if a.status in AFTER_SHORTLIST)
    interviewed = sum(1 for a in applications if a.status in AFTER_INTERVIEW)
    selected = sum(1 for a in applications if a.status in SELECTED)

    departments: list[schemas.DepartmentStatOut] = []
    for department in sorted({student.department for student in students}):
        cohort = {s.id for s in students if s.department == department}
        cohort_applications = [a for a in applications if a.student_id in cohort]
        placed = {a.student_id for a in cohort_applications if a.status in SELECTED}
        departments.append(
            schemas.DepartmentStatOut(
                department=department,
                students=len(cohort),
                applications=len(cohort_applications),
                selected=len(placed),
                placement_rate=round(len(placed) / len(cohort) * 100) if cohort else 0,
            )
        )

    recruiters = []
    for company in companies:
        job_ids = {job.id for job in company.jobs}
        count = sum(1 for a in applications if a.job_id in job_ids and a.status in SELECTED)
        recruiters.append({"company": company.name, "selected": count})
    recruiters.sort(key=lambda row: -row["selected"])

    return schemas.TpoDashboardOut(
        total_students=len(students),
        total_companies=len(companies),
        active_jobs=len(jobs),
        applications=len(applications),
        shortlisted=shortlisted,
        selected=selected,
        funnel=[
            schemas.FunnelStageOut(stage="Students", count=len(students)),
            schemas.FunnelStageOut(stage="Applications", count=len(applications)),
            schemas.FunnelStageOut(stage="Shortlisted", count=shortlisted),
            schemas.FunnelStageOut(stage="Interview", count=interviewed),
            schemas.FunnelStageOut(stage="Selected", count=selected),
        ],
        departments=departments,
        top_recruiters=recruiters,
    )


def _demand_by_skill(db: Session) -> dict[str, float]:
    """What the open roles are actually asking for, averaged per skill."""
    rows = (
        db.query(models.JobSkill)
        .join(models.Job)
        .filter(models.Job.is_active.is_(True))
        .all()
    )
    totals: dict[str, list[float]] = {}
    for row in rows:
        totals.setdefault(row.skill.name, []).append(row.required_score)
    return {name: sum(scores) / len(scores) for name, scores in totals.items()}


@router.get("/skill-gaps", response_model=list[schemas.SkillGapOut])
def skill_gaps(
    department: str | None = Query(default=None), db: Session = Depends(get_db)
) -> list[schemas.SkillGapOut]:
    demand = _demand_by_skill(db)
    students = db.query(models.Student).all()
    if department and department.upper() != "ALL":
        students = [s for s in students if s.department == department]

    open_roles: dict[str, int] = {}
    for row in db.query(models.JobSkill).join(models.Job).filter(models.Job.is_active.is_(True)):
        open_roles[row.skill.name] = open_roles.get(row.skill.name, 0) + 1

    rows: list[schemas.SkillGapOut] = []
    for dept in sorted({s.department for s in students}):
        cohort = [s for s in students if s.department == dept]
        for skill_name, required in demand.items():
            scores = [
                link.final_score
                for student in cohort
                for link in student.skills
                if link.skill.name == skill_name
            ]
            if not scores:
                continue
            average = sum(scores) / len(scores)
            gap = max(0.0, required - average)
            rows.append(
                schemas.SkillGapOut(
                    skill=skill_name,
                    department=dept,
                    company_demand=round(required, 1),
                    student_average=round(average, 1),
                    gap=round(gap, 1),
                    severity=_severity(gap),
                    students_below_bar=sum(1 for score in scores if score < required),
                    open_roles=open_roles.get(skill_name, 0),
                )
            )

    rows.sort(key=lambda row: -row.gap)
    return rows


@router.get("/skill-gaps/{skill_name}/students", response_model=list[schemas.SkillGapStudentOut])
def skill_gap_students(
    skill_name: str,
    department: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[schemas.SkillGapStudentOut]:
    skill = db.query(models.Skill).filter(models.Skill.name.ilike(skill_name)).first()
    if skill is None:
        raise HTTPException(status_code=404, detail=f"Skill {skill_name} not found")

    target = _demand_by_skill(db).get(skill.name)
    if target is None:
        raise HTTPException(
            status_code=404, detail=f"No active job currently requires {skill.name}"
        )

    students = db.query(models.Student).all()
    if department and department.upper() != "ALL":
        students = [s for s in students if s.department == department]

    rows: list[schemas.SkillGapStudentOut] = []
    for student in students:
        score = next(
            (link.final_score for link in student.skills if link.skill_id == skill.id), 0.0
        )
        gap = target - score
        if gap <= 0:
            continue
        rows.append(
            schemas.SkillGapStudentOut(
                student_id=student.id,
                name=student.name,
                department=student.department,
                semester=student.semester,
                cgpa=student.cgpa,
                score=round(score, 1),
                target=round(target, 1),
                gap=round(gap, 1),
            )
        )

    rows.sort(key=lambda row: -row.gap)
    return rows
