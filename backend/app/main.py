"""SkillBridge API."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import applications, auth, company, health, jobs, students, tests

settings = get_settings()

app = FastAPI(
    title="SkillBridge API",
    version="1.0.0",
    description=(
        "Verified student skills, explainable job matching and placement analytics "
        "for students, companies and the college placement office."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for router in (health, auth, students, tests, jobs, applications, company):
    app.include_router(router.router)

from app.routers import tpo  # noqa: E402  (kept last for router ordering)

app.include_router(tpo.router)


@app.get("/", include_in_schema=False)
def root() -> dict[str, str]:
    return {"service": "skillbridge-api", "docs": "/docs"}
