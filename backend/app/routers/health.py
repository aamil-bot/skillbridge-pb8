from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app import schemas
from app.database import get_db

router = APIRouter(tags=["health"])


@router.get("/health", response_model=schemas.HealthOut)
def health(db: Session = Depends(get_db)) -> schemas.HealthOut:
    try:
        db.execute(text("SELECT 1"))
        database = "connected"
    except Exception:  # pragma: no cover - only hit when the DB is down
        database = "unavailable"
    return schemas.HealthOut(database=database)
