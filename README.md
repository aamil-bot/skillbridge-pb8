# SkillBridge

A placement portal built around one shared record of what a student can actually
do. Students take a skill assessment and see where they stand against real job
requirements. Companies post roles with a skill bar and review candidates ranked
against it. The placement office sees the funnel and the skill gaps holding the
cohort back.

```
frontend/   Next.js 14 · TypeScript · Tailwind · Recharts
backend/    FastAPI · SQLAlchemy 2 · PostgreSQL · Alembic
docs/       api-contract.md
```

---

## Backend

### Requirements

- Python 3.11+
- PostgreSQL 14+ running and reachable

### Setup

```bash
cd backend
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env          # then edit DATABASE_URL
```

`.env` needs two variables:

```text
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST:PORT/DATABASE
CORS_ORIGINS=http://localhost:3000
```

Create the database if it does not exist:

```bash
createdb skillbridge
```

### Migrate, seed, run

```bash
alembic upgrade head     # creates the schema
python -m app.seed       # idempotent — safe to run repeatedly
uvicorn app.main:app --reload --port 8000
```

Swagger UI: **http://localhost:8000/docs**

The seed prints what it created and the demo student's profile:

```text
Seeded: 24 students, 4 companies, 6 jobs, 24 questions, 12 applications.
STU001 Aarav Sharma (CGPA 8.1) final scores:
  {'SQL': 86, 'Python': 82, 'React': 45, 'JavaScript': 58,
   'DSA': 62, 'Communication': 65, 'Java': 42, 'Cloud': 40}
```

That profile is the point of the demo: SQL and Python are clear strengths, React
is a 25-point gap against the Frontend Intern role, and the API says so in plain
language rather than just as a number.

### What the seed creates

| | |
| --- | --- |
| Departments | CSE, IT, ECE |
| Skills | SQL, Python, React, JavaScript, DSA, Communication, Java, Cloud |
| Students | 24, spread across the three departments |
| Companies | TECHNOVA, NEURASOFT, CLOUDNEST, FINEDGE |
| Jobs | 6 active, including the mandated Frontend Intern at TECHNOVA |
| Questions | 64 multiple-choice, eight per skill, mixed difficulty |
| Applications | 12, spread across all five statuses |
| Subject map | 26 subject-to-skill rows, e.g. DBMS → SQL |

Skill scores are not typed in. Each student's `subjectScore` is derived from the
subject-to-skill map for their department, `projectScore` from what they have
built, and `finalScore` from the 45/35/20 blend — the same calculation the API
runs after a real submission.

### Adaptive assessment

Two endpoints run an Item Response Theory (Rasch) session as an alternative to
the fixed paper, in `app/services/adaptive.py`:

```
POST /tests/adaptive/start     -> first question + prior ability per skill
POST /tests/adaptive/answer    -> grade, re-estimate, next question or finish
```

After each answer it re-estimates ability per skill over a 121-point grid with a
normal prior, then picks the unasked question whose difficulty sits closest to
that estimate — the item that will tell it the most. A session covers the 24 most
informative questions out of 64 and returns a graded score with a standard error
attached, instead of the 0/33/67/100 a three-question fixed paper can produce.

No training data and no new dependencies. Ability is fitted per student from
their own answers, so there is nothing to train and nothing to overfit — which
matters, because the seeded cohort is synthetic and any supervised model trained
on it would only learn the seed formula back.

Test *length* is effectively fixed. Under a 1PL model the posterior width depends
on how many items were asked, not on whether the answers agreed, so every student
settles at roughly the same count. Variable length needs a 2PL model with
per-item discrimination, calibrated from real responses across many students.

### How scoring works

```
finalScore = 45% testScore + 35% subjectScore + 20% projectScore

matchScore = 60% weighted skill compatibility
           + 20% CGPA eligibility
           + 10% project signal
           + 10% location fit
```

All of it lives in `app/services/` — `scoring.py` for skill scores, `matching.py`
for the match engine. Both are pure functions over model objects, used by the
student match list, the company candidate ranking and the score frozen onto an
application, so those three views can never disagree.

Full endpoint list and real example responses: **[`docs/api-contract.md`](docs/api-contract.md)**.

---

## Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Open **http://localhost:3000**. Every demo account uses the password `demo1234`;
the sign-in screen lists them all and one click signs you in.

The frontend runs with or without the backend. If the API is unreachable it falls
back to typed mock data and the header shows a grey "Mock data" pill instead of a
green "Live API" one.

> **Not yet connected.** The frontend currently reads its own mock data, not this
> API. The two were built to different response shapes and need an adapter before
> they talk to each other — see *Known gaps* below.

---

## Demo journey

1. Sign in as **Aarav Sharma** (STU001).
2. Take the **skill assessment** — 24 questions, three per skill.
3. Skill scores update; the **skill profile** reflects the new numbers.
4. **Job matches** recalculate. Frontend Intern shows a React gap of 25 points
   against a required 70, with SQL at 86 as a strength.
5. **Apply** to Frontend Intern. Applying twice returns the existing application.
6. Sign in as **TECHNOVA** → open the role → Aarav appears in the ranked list
   with his reasons and gaps → **Shortlist** him.
7. Back as Aarav: the application already reads `SHORTLISTED`.
8. Sign in as the **placement office**: KPIs, the funnel, and skill gaps by
   department with a per-student drill-down.

---

## Known gaps

Honest list of what is not done.

**The frontend and backend do not share a contract yet.** They were built against
different specs and their response shapes differ — nested vs flat student
records, `STRENGTH`/`MET`/`GAP` vs `Strength`/`Gap`, different skill sets, and
different job identifiers. Pointing `NEXT_PUBLIC_API_BASE_URL` at the running
backend will return `200`s with shapes the frontend cannot read. The fix is an
adapter inside `frontend/src/lib/api.ts`, which is already the single place every
request goes through.

**No authentication worth the name.** `POST /auth/login` compares a plain-text
`demo_password` and hands back a token nothing verifies. No endpoint is
protected; route guarding is client-side only.

**No application history.** Applications store a current status but no event
trail, so a status timeline cannot be rendered from the API. An
`ApplicationEvent` table is the smallest change that would fix it.

**No automated test suite committed.** Endpoints were verified with end-to-end
scripts against a live database, not with a `pytest` suite in the repo. Those
scripts also mutate state, so they assume a freshly seeded database.

**No supervised ML.** The adaptive assessment is a statistical model fitted per
student, not a trained one. Learning the scoring weights from outcomes would need
placement labels; there are two `SELECTED` records across 24 synthetic students,
so any model fitted on that would only recover the seed formula. The honest path
is to treat recruiter shortlist and reject decisions as the training signal once
real volume exists — which is why weights should move out of Python constants and
into a table before that point.

**Not packaged for deployment.** No Dockerfile, no compose file, no CI.
