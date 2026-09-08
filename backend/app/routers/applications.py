"""Recruiter-side status changes on an application."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.serializers import application_out

router = APIRouter(prefix="/applications", tags=["applications"])


@router.patch("/{application_id}/status", response_model=schemas.MessageOut)
def update_status(
    application_id: str, payload: schemas.StatusUpdateIn, db: Session = Depends(get_db)
) -> schemas.MessageOut:
    application = db.get(models.Application, application_id)
    if application is None:
        raise HTTPException(status_code=404, detail=f"Application {application_id} not found")

    if application.status == payload.status:
        return schemas.MessageOut(
            message=f"{application.student.name} is already marked {payload.status.lower()}.",
            application=application_out(application),
        )

    application.status = payload.status
    db.commit()
    db.refresh(application)

    return schemas.MessageOut(
        message=f"{application.student.name} moved to {payload.status.lower()}.",
        application=application_out(application),
    )
