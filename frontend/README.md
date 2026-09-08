# SkillBridge — Frontend

Next.js 14 (App Router) + TypeScript + Tailwind. Three roles — student, company, college TPO — sharing one record of verified student skills.

The whole demo runs with or without the FastAPI backend. Every screen goes through one API client that tries the real server first and falls back to typed mock data if it is unreachable.

---

## Run it

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Open http://localhost:3000. You land on the sign-in screen.

### Signing in

Every demo account uses the password **`demo1234`**. The sign-in screen lists all of them — click any account to sign in with one click, or type the credentials yourself.

| Role | Accounts | Example |
| --- | --- | --- |
| Student | 12 | `aarav.sharma@srit.edu.in` (STU001, CSE, CGPA 8.4) |
| Company | 3 | `hiring@technova.example.com` (TECHNOVA) |
| Placement office | 1 | `tpo@srit.edu.in` (TPO001) |

Signing in as a different student changes everything downstream — their skills, matches, applications and ranking position. Rohit Nair (CGPA 9.1) tops most rankings; Manav Chauhan (CGPA 7.4) sits at the bottom. That contrast is the fastest way to show the matching engine doing real work.

The session is held in `localStorage` and survives a reload. **Sign out** and **Switch account** are at the bottom of the sidebar. Visiting a dashboard for a role you are not signed in as bounces you back to sign-in.

`.env.local` holds two variables:

| Variable | Default | What it does |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8000` | Where the FastAPI backend lives |
| `NEXT_PUBLIC_USE_MOCKS` | `false` | Set to `true` to skip the network entirely and always use mocks |

`.env.local` is gitignored and is never committed — only `.env.local.example` is tracked.

Other scripts:

```bash
npm run build      # production build
npm run start      # serve the production build
npm run typecheck  # tsc --noEmit
npm run lint       # next lint
```

---

## Backend on or off

The header of every dashboard shows which one you are on:

- **Live API** — the backend answered `/health` and requests are going to it
- **Mock data** — the backend did not answer, so the app is serving typed mocks

The fallback is automatic. If the backend goes down mid-session the app keeps working; if it comes back, requests resume after a 30-second cool-off. Nothing in the pages changes between the two modes — swapping to the real backend means starting the server, nothing more.

Mock state (test results, applications, shortlist decisions, new job posts) persists in `localStorage` under `skillbridge.demo.v1`. **Reset demo data** in the sidebar clears it and returns everything to the seeded state.

---

## Routes

| Route | What it does |
| --- | --- |
| `/` | Landing page — pick a role to sign in |
| `/login` | Sign in as any student, company or the placement office |
| `/student/dashboard` | Readiness, CGPA, profile completion, top skills, recommended roles, recent applications |
| `/student/test` | 12-question assessment, then per-skill results with before/after scores |
| `/student/skill-profile` | Radar chart plus each skill against the bar the open roles set |
| `/student/matches` | All roles ranked by match, with strengths and gaps |
| `/student/matches/[jobId]` | Why the score is what it is, skill by skill — and **Apply now** |
| `/student/applications` | Every application with a live status timeline |
| `/student/profile` | Locked college record; editable projects, preferred city, expected stipend |
| `/company/dashboard` | Hiring KPIs, open roles, recent applicants |
| `/company/jobs/new` | Post a role and set the skill bar (required score + weight per skill) |
| `/company/jobs/[jobId]` | Candidates ranked against that role, filterable by department, status and minimum match |
| `/company/candidates/[studentId]` | Full candidate review and status control (accepts `?jobId=`) |
| `/tpo/dashboard` | Placement KPIs, funnel, department performance, top recruiters |
| `/tpo/skill-gaps` | Industry demand vs student average, ranked by shortfall, with per-student drill-down and CSV export |

---

## Demo script

1. Open `/login`, **Student** tab, click **Aarav Sharma** (STU001).
2. **Skill assessment** → answer the 12 questions → submit. Scores move: React 45→51, JavaScript 61→67, SQL 82→87, and so on.
3. **Skill profile** — the radar and the per-skill bars now reflect the assessment.
4. **Job matches** — every percentage has been recalculated. Frontend Developer Intern goes 74% → 81%.
5. Open a role → read the skill-by-skill breakdown → **Apply now**. Applying twice is blocked.
6. **Switch account** in the sidebar → **Company** tab → **TECHNOVA** → open the role. Aarav is in the ranked table; applicants' rows are highlighted.
7. Open him → **Shortlisted**.
8. Switch back to **Aarav** → Applications → the status is already `SHORTLISTED` with the timeline updated.
9. Switch to the **placement office** account → the funnel and KPIs include the new application; **Skill gaps** shows where the cohort is short, and the CSE React average has shifted because Aarav's score changed.

---

## How the architecture holds together

```
pages/components  →  src/lib/api.ts  →  FastAPI backend
                                     ↘  src/lib/mock-backend.ts (fallback)
```

- **No page calls `fetch`.** Everything goes through `src/lib/api.ts`.
- **All types live in `src/lib/types.ts`.** Nothing redeclares a shape locally.
- **All mock data lives in `src/lib/mock-data.ts`.** No page holds its own fixtures.
- **`src/lib/matching.ts` is pure.** Match scores, rankings and readiness are computed from current data every time, never stored stale — which is why the numbers actually move when the student's scores change.
- **Cross-role updates need no wiring.** `mock-backend.ts` publishes a revision on every mutation; `useResource` refetches on it. That is how a shortlist made in the company view appears in the student view.
- **State is React context only.** No Redux, Zustand or similar.

### Match score

Two terms:

- **Attainment (92%)** — each required skill compared against the bar, weighted by its importance (1–3), capped at the bar.
- **Margin (8%)** — small credit for exceeding the bar, so candidates who all clear every requirement do not bunch at 100%.

Below the posted minimum CGPA costs 12 points. The breakdown on the match detail page shows every input.

### Assessment scoring

Two questions per skill is too small a sample to replace a score outright, so a result moves the existing score rather than overwriting it: full marks always improves a skill, a miss always costs a little, and lower scores move further because they have more headroom.

---

## Assumptions and limits

- **`docs/api-contract.md` was not available**, so request and response shapes were inferred from the brief's endpoint list. If the real contract differs, `src/lib/api.ts` is the only file that needs changing.
- Six endpoints are **additive and not in the published contract**, marked as such in `api.ts`: `GET /jobs/{jobId}`, `GET /company/{companyId}/dashboard`, `GET /company/{companyId}`, `POST /auth/login`, `GET /accounts`, `GET /tpo/profile`. Candidate detail and single-match detail are derived from contracted list endpoints rather than new ones.
- Match percentages are **computed, not hardcoded**, so they differ from the illustrative figures in the brief.
- **Sign-in is not real authentication.** Credentials are checked against the seeded account list with one shared password, and the session is a `localStorage` entry — there is no token verification, no password hashing and no protected API. The frontend calls `POST /auth/login` and `GET /accounts`; both are additive routes the backend would need to implement for real. Route guarding is client-side only, so it shapes the demo rather than securing anything.
- Inter is loaded with a plain `<link>`; offline, the app falls back to the system sans stack.
- Resume upload, notifications and real interview scheduling are out of scope.
