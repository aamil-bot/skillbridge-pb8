"""Demo sign-in.

Not real authentication: credentials are checked against `users.demo_password`
and the token is opaque and unverified. It exists so the three role dashboards
can be entered separately. Replace with hashing plus real tokens before this
goes anywhere near production.
"""

import secrets

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.serializers import account_out

router = APIRouter(tags=["auth"])


@router.get("/accounts", response_model=list[schemas.AccountOut])
def list_accounts(
    role: str | None = Query(default=None), db: Session = Depends(get_db)
) -> list[schemas.AccountOut]:
    """Every sign-in identity, for the account picker on the login screen."""
    query = db.query(models.User)
    if role:
        query = query.filter(models.User.role == role)
    users = query.order_by(models.User.role, models.User.id).all()
    return [account_out(user, db) for user in users]


@router.post("/auth/login", response_model=schemas.LoginOut)
def login(payload: schemas.LoginIn, db: Session = Depends(get_db)) -> schemas.LoginOut:
    user = (
        db.query(models.User)
        .filter(
            models.User.role == payload.role,
            models.User.email == payload.email.strip().lower(),
        )
        .first()
    )
    if user is None:
        raise HTTPException(
            status_code=401,
            detail="No account found with that email address for this role.",
        )
    if payload.password != user.demo_password:
        raise HTTPException(status_code=401, detail="That password is incorrect.")

    return schemas.LoginOut(
        account=account_out(user, db), token=f"demo-{user.id}-{secrets.token_hex(8)}"
    )
