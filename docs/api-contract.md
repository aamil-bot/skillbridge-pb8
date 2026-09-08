# SkillBridge API contract

Base URL `http://localhost:8000`. Interactive docs at `/docs`.

Every response body is camelCase. Request bodies accept camelCase or snake_case.
All example payloads below were captured from a live server against the seeded
database, so they reflect what the API actually returns rather than what it was
meant to return. Long arrays are truncated to one or two entries.

## Conventions

| Concern | Rule |
| --- | --- |
| Identifiers | Readable strings: `STU001`, `CMP001`, `job_frontend_01`, `APP0001` |
| Application status | `APPLIED`, `SHORTLISTED`, `INTERVIEW`, `SELECTED`, `REJECTED` |
| Skill status in a breakdown | `Strength` when the score meets or beats the bar, `Gap` when it falls short |
| Scores | 0–100 floats for skills, 0–100 integer for `matchScore` |
| Errors | FastAPI default: `{"detail": "..."}` with `400`, `401`, `404` or `409` |
| CORS | Only the origins in `CORS_ORIGINS` (default `http://localhost:3000`) |

## How a score is built

A skill score has three components, blended once and used everywhere:

```
finalScore = 45% testScore + 35% subjectScore + 20% projectScore
```

`subjectScore` comes from the subject-to-skill map for the student's department,
`projectScore` from what they have actually built, `testScore` from the
assessment. A match score then combines four weighted parts:

```
matchScore = 60% weighted skill compatibility
           + 20% CGPA eligibility
           + 10% project signal
           + 10% location fit

skill_fit = min(studentFinalScore / requiredScore, 1.0)
gap       = max(requiredScore - studentFinalScore, 0)
```

Every match response carries `components` with those four numbers, and `reasons`
with the same conclusion in plain language.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Liveness and database check |
| GET | `/accounts` | Sign-in identities (additive) |
| POST | `/auth/login` | Demo sign-in (additive) |
| GET | `/students/{studentId}` | Student record |
| PATCH | `/students/{studentId}/profile` | Update editable profile fields |
| GET | `/students/{studentId}/skill-profile` | Ranked skill scores |
| GET | `/students/{studentId}/matches` | Jobs scored for this student |
| GET | `/students/{studentId}/applications` | This student's applications |
| GET | `/tests/questions` | Assessment paper (no answer key) |
| POST | `/tests/submit` | Grade, store, update scores |
| GET | `/jobs` | Job list (additive) |
| GET | `/jobs/{jobId}` | One job (additive) |
| POST | `/jobs/{jobId}/apply` | Student applies |
| POST | `/company/jobs` | Post a role |
| GET | `/company/jobs/{jobId}/matched-students` | Ranked candidates |
| GET | `/company/{companyId}/dashboard` | Company hiring totals (additive) |
| PATCH | `/applications/{applicationId}/status` | Move an application |
| GET | `/tpo/dashboard` | Placement KPIs and funnel |
| GET | `/tpo/skill-gaps` | Demand vs student average |
| GET | `/tpo/skill-gaps/{skillName}/students` | Who is below the bar |

Endpoints marked additive were not in the original brief's endpoint list. They
exist because the frontend needs them; they follow the same conventions.

---

### `GET /health`

Liveness plus a database round-trip.

Response `200`

```json
{
  "status": "ok",
  "service": "skillbridge-api",
  "version": "1.0.0",
  "database": "connected"
}
```

---

### `GET /accounts?role=student`

Sign-in identities for the account picker. `role` is optional: `student`, `company` or `tpo`. **Additive — not in the original endpoint list.**

Response `200`

```json
[
  {
    "id": "STU001",
    "role": "student",
    "name": "Aarav Sharma",
    "email": "aarav.sharma@srit.edu.in",
    "detail": "CSE \u00b7 Semester 6 \u00b7 CGPA 8.1"
  },
  {
    "id": "STU002",
    "role": "student",
    "name": "Riya Mehta",
    "email": "riya.mehta@srit.edu.in",
    "detail": "IT \u00b7 Semester 6 \u00b7 CGPA 8.9"
  }
]
```

---

### `POST /auth/login`

Demo sign-in. Returns `401` for an unknown email or a wrong password. **Additive — not real authentication, see Limitations.**

Request

```json
{
  "role": "student",
  "email": "aarav.sharma@srit.edu.in",
  "password": "demo1234"
}
```

Response `200`

```json
{
  "account": {
    "id": "STU001",
    "role": "student",
    "name": "Aarav Sharma",
    "email": "aarav.sharma@srit.edu.in",
    "detail": "CSE \u00b7 Semester 6 \u00b7 CGPA 8.1"
  },
  "token": "demo-USR_STU001-f3171fba851b1832"
}
```

---

### `GET /students/STU001`

Full student record: academics, preferences, projects and every skill score with its three components.

Response `200`

```json
{
  "id": "STU001",
  "name": "Aarav Sharma",
  "email": "aarav.sharma@srit.edu.in",
  "registrationNumber": "SRIT/CSE/2023/001",
  "college": "Sri Ramanujan Institute of Technology",
  "department": "CSE",
  "semester": 6,
  "cgpa": 8.1,
  "preferredCity": "Bengaluru",
  "expectedStipend": 26000,
  "projects": [
    {
      "id": "STU001_PRJ01",
      "title": "Campus Placement Tracker",
      "description": "Tracks drives, eligibility and offers for 400+ students.",
      "skillsText": "Python SQL Flask"
    },
    {
      "id": "STU001_PRJ02",
      "title": "Library Recommendation Engine",
      "description": "Collaborative filtering over three years of borrowing history.",
      "skillsText": "Python SQL Pandas"
    }
  ],
  "skills": [
    {
      "skill": "SQL",
      "category": "Data",
      "subjectScore": 81.0,
      "testScore": 100.0,
      "projectScore": 85.0,
      "finalScore": 90.3,
      "level": "Advanced"
    },
    {
      "skill": "Python",
      "category": "Programming",
      "subjectScore": 81.0,
      "testScore": 100.0,
      "projectScore": 85.0,
      "finalScore": 90.3,
      "level": "Advanced"
    }
  ],
  "assessmentCompleted": true,
  "lastAssessmentAt": "2026-09-08T14:11:55.543854Z",
  "profileCompletion": 100
}
```

---

### `PATCH /students/STU001/profile`

Student-editable fields only. Sending `projects` replaces the list and recomputes every `projectScore` and `finalScore`.

Request

```json
{
  "preferredCity": "Bengaluru",
  "expectedStipend": 26000
}
```

Response `200`

```json
{
  "id": "STU001",
  "name": "Aarav Sharma",
  "email": "aarav.sharma@srit.edu.in",
  "registrationNumber": "SRIT/CSE/2023/001",
  "college": "Sri Ramanujan Institute of Technology",
  "department": "CSE",
  "semester": 6,
  "cgpa": 8.1,
  "preferredCity": "Bengaluru",
  "expectedStipend": 26000,
  "projects": [
    {
      "id": "STU001_PRJ01",
      "title": "Campus Placement Tracker",
      "description": "Tracks drives, eligibility and offers for 400+ students.",
      "skillsText": "Python SQL Flask"
    },
    {
      "id": "STU001_PRJ02",
      "title": "Library Recommendation Engine",
      "description": "Collaborative filtering over three years of borrowing history.",
      "skillsText": "Python SQL Pandas"
    }
  ],
  "skills": [
    {
      "skill": "SQL",
      "category": "Data",
      "subjectScore": 81.0,
      "testScore": 100.0,
      "projectScore": 85.0,
      "finalScore": 90.3,
      "level": "Advanced"
    },
    {
      "skill": "Python",
      "category": "Programming",
      "subjectScore": 81.0,
      "testScore": 100.0,
      "projectScore": 85.0,
      "finalScore": 90.3,
      "level": "Advanced"
    }
  ],
  "assessmentCompleted": true,
  "lastAssessmentAt": "2026-09-08T14:11:55.543854Z",
  "profileCompletion": 100
}
```

---

### `GET /students/STU001/skill-profile`

Skill scores ranked, plus the three strongest and three weakest.

Response `200`

```json
{
  "studentId": "STU001",
  "skills": [
    {
      "skill": "SQL",
      "category": "Data",
      "subjectScore": 81.0,
      "testScore": 100.0,
      "projectScore": 85.0,
      "finalScore": 90.3,
      "level": "Advanced"
    },
    {
      "skill": "Python",
      "category": "Programming",
      "subjectScore": 81.0,
      "testScore": 100.0,
      "projectScore": 85.0,
      "finalScore": 90.3,
      "level": "Advanced"
    }
  ],
  "strongest": [
    "SQL",
    "Python"
  ],
  "weakest": [
    "React",
    "Communication"
  ]
}
```

---

### `GET /students/STU001/matches`

Every active job scored for this student, best first. `skillBreakdown` explains the score skill by skill; `components` shows the four weighted parts.

Response `200`

```json
{
  "studentId": "STU001",
  "matches": [
    {
      "jobId": "job_platform_engineering_intern_5cbf41",
      "jobTitle": "Platform Engineering Intern",
      "company": "TECHNOVA",
      "location": "Bengaluru",
      "stipend": 27000,
      "matchScore": 100,
      "eligible": true,
      "reasons": [
        "Strong Python score: 90/100"
      ],
      "skillBreakdown": [
        {
          "skill": "Python",
          "studentScore": 90,
          "requiredScore": 70,
          "gap": 0,
          "status": "Strength",
          "weight": 3.0
        }
      ],
      "strengths": [
        "Python"
      ],
      "gaps": [],
      "studentCgpa": 8.1,
      "requiredCgpa": 7.5,
      "components": {
        "skillCompatibility": 100.0,
        "cgpaEligibility": 100.0,
        "projectSignal": 100.0,
        "locationFit": 100.0
      },
      "applied": false,
      "applicationId": null,
      "applicationStatus": null
    }
  ]
}
```

---

### `GET /tests/questions?studentId=STU001`

24 questions, three per skill. The correct answer is never sent to the client — grading happens server side.

Response `200`

```json
[
  {
    "id": "Q01",
    "skill": "SQL",
    "questionText": "Which clause filters rows after GROUP BY has aggregated them?",
    "options": [
      {
        "id": "a",
        "text": "WHERE"
      },
      {
        "id": "b",
        "text": "HAVING"
      }
    ],
    "difficulty": "easy"
  },
  {
    "id": "Q02",
    "skill": "SQL",
    "questionText": "What does an INNER JOIN return?",
    "options": [
      {
        "id": "a",
        "text": "Every row from the left table"
      },
      {
        "id": "b",
        "text": "Only rows with a matching key in both tables"
      }
    ],
    "difficulty": "easy"
  }
]
```

---

### `POST /tests/submit`

Grades the submission, stores the attempt and every answer, updates `testScore` and `finalScore` per skill, and returns the refreshed profile.

Request

```json
{
  "studentId": "STU002",
  "answers": [
    {
      "questionId": "Q01",
      "selectedOption": "b"
    },
    {
      "questionId": "Q02",
      "selectedOption": "a"
    }
  ]
}
```

Response `200`

```json
{
  "attemptId": "ATT6C8513E7D6",
  "studentId": "STU002",
  "totalScore": 70.83,
  "correctCount": 17,
  "totalQuestions": 24,
  "completedAt": "2026-09-08T14:12:40.325830Z",
  "skillResults": [
    {
      "skill": "SQL",
      "correct": 3,
      "total": 3,
      "testScore": 100.0,
      "previousFinalScore": 60.0,
      "finalScore": 75.4,
      "delta": 15.4
    },
    {
      "skill": "React",
      "correct": 2,
      "total": 3,
      "testScore": 66.67,
      "previousFinalScore": 73.4,
      "finalScore": 75.2,
      "delta": 1.8
    }
  ],
  "skillProfile": [
    {
      "skill": "SQL",
      "category": "Data",
      "subjectScore": 86.9,
      "testScore": 100.0,
      "projectScore": 0.0,
      "finalScore": 75.4,
      "level": "Proficient"
    },
    {
      "skill": "React",
      "category": "Frontend",
      "subjectScore": 80.6,
      "testScore": 66.7,
      "projectScore": 85.0,
      "finalScore": 75.2,
      "level": "Proficient"
    }
  ]
}
```

---

### `POST /jobs/job_qa_01/apply`

Creates an application with the match score frozen at apply time. Applying twice returns the existing application instead of erroring.

Request

```json
{
  "studentId": "STU004"
}
```

Response `201`

```json
{
  "message": "Applied to QA Automation Intern at TECHNOVA.",
  "application": {
    "id": "APPF89A3DFDC0",
    "studentId": "STU004",
    "studentName": "Neha Verma",
    "jobId": "job_qa_01",
    "jobTitle": "QA Automation Intern",
    "companyId": "CMP001",
    "company": "TECHNOVA",
    "location": "Bengaluru",
    "stipend": 18000,
    "status": "APPLIED",
    "matchScore": 89,
    "createdAt": "2026-09-08T14:12:40.361158Z",
    "updatedAt": "2026-09-08T14:12:40.361158Z"
  }
}
```

---

### `GET /students/STU001/applications`

Newest first.

Response `200`

```json
[
  {
    "id": "APP0C2B558EED",
    "studentId": "STU001",
    "studentName": "Aarav Sharma",
    "jobId": "job_frontend_01",
    "jobTitle": "Frontend Intern",
    "companyId": "CMP001",
    "company": "TECHNOVA",
    "location": "Bengaluru",
    "stipend": 25000,
    "status": "SHORTLISTED",
    "matchScore": 92,
    "createdAt": "2026-09-08T14:11:55.595493Z",
    "updatedAt": "2026-09-08T14:11:55.682483Z"
  }
]
```

---

### `POST /company/jobs`

Skill names must already exist in the `skills` table; unknown names return `400`.

Request

```json
{
  "companyId": "CMP001",
  "title": "Platform Intern",
  "location": "Bengaluru",
  "stipend": 27000,
  "minCgpa": 7.5,
  "description": "Internal tooling.",
  "openings": 2,
  "requiredSkills": [
    {
      "skill": "Python",
      "requiredScore": 70,
      "weight": 3
    }
  ]
}
```

Response `201`

```json
{
  "id": "job_platform_intern_19c0b2",
  "title": "Platform Intern",
  "companyId": "CMP001",
  "company": "TECHNOVA",
  "location": "Bengaluru",
  "stipend": 27000,
  "minCgpa": 7.5,
  "description": "Internal tooling.",
  "openings": 2,
  "isActive": true,
  "createdAt": "2026-09-08T14:12:40.391088Z",
  "requiredSkills": [
    {
      "skill": "Python",
      "requiredScore": 70.0,
      "weight": 3.0
    }
  ]
}
```

---

### `GET /company/jobs/job_frontend_01/matched-students`

Every student ranked against one job. Same engine as the student-side match, so the two views never disagree.

Response `200`

```json
{
  "job": {
    "id": "job_frontend_01",
    "title": "Frontend Intern",
    "companyId": "CMP001",
    "company": "TECHNOVA",
    "location": "Bengaluru",
    "stipend": 25000,
    "minCgpa": 7.0,
    "description": "Work on the customer-facing order tracking app alongside two senior engineers. You will own small features end to end, from component to release.",
    "openings": 4,
    "isActive": true,
    "createdAt": "2026-08-09T14:11:54.022142Z",
    "requiredSkills": [
      {
        "skill": "React",
        "requiredScore": 70.0,
        "weight": 3.0
      }
    ]
  },
  "candidates": [
    {
      "rank": 1,
      "studentId": "STU008",
      "name": "Ananya Iyer",
      "department": "IT",
      "semester": 6,
      "cgpa": 8.6,
      "college": "Sri Ramanujan Institute of Technology",
      "matchScore": 97,
      "eligible": true,
      "reasons": [
        "Strong SQL score: 85/100"
      ],
      "skillBreakdown": [
        {
          "skill": "Communication",
          "studentScore": 54,
          "requiredScore": 55,
          "gap": 1,
          "status": "Gap",
          "weight": 1.0
        }
      ],
      "strengths": [
        "React"
      ],
      "gaps": [
        "Communication"
      ],
      "projects": [
        {
          "id": "STU008_PRJ01",
          "title": "Hostel Mess Feedback App",
          "description": "Daily meal ratings with a weekly summary for the mess committee.",
          "skillsText": "JavaScript React Firebase"
        }
      ],
      "skills": [
        {
          "skill": "SQL",
          "category": "Data",
          "subjectScore": 88.7,
          "testScore": 93.9,
          "projectScore": 60.0,
          "finalScore": 85.3,
          "level": "Advanced"
        }
      ],
      "applied": false,
      "applicationId": null,
      "status": null
    }
  ]
}
```

---

### `PATCH /applications/{applicationId}/status`

Statuses: `APPLIED`, `SHORTLISTED`, `INTERVIEW`, `SELECTED`, `REJECTED`.

Request

```json
{
  "status": "SHORTLISTED"
}
```

Response `200`

```json
{
  "message": "Aarav Sharma is already marked shortlisted.",
  "application": {
    "id": "APP0C2B558EED",
    "studentId": "STU001",
    "studentName": "Aarav Sharma",
    "jobId": "job_frontend_01",
    "jobTitle": "Frontend Intern",
    "companyId": "CMP001",
    "company": "TECHNOVA",
    "location": "Bengaluru",
    "stipend": 25000,
    "status": "SHORTLISTED",
    "matchScore": 92,
    "createdAt": "2026-09-08T14:11:55.595493Z",
    "updatedAt": "2026-09-08T14:11:55.682483Z"
  }
}
```

---

### `GET /company/CMP001/dashboard`

Hiring totals and recent activity for one company. **Additive — not in the original endpoint list.**

Response `200`

```json
{
  "company": {
    "id": "CMP001",
    "name": "TECHNOVA",
    "location": "Bengaluru",
    "description": "Product engineering for logistics and retail. Hires 40-60 interns a year.",
    "email": "hiring@technova.example.com"
  },
  "activeJobs": 5,
  "applications": 9,
  "shortlisted": 4,
  "selected": 0,
  "jobs": [
    {
      "id": "job_platform_intern_19c0b2",
      "title": "Platform Intern",
      "companyId": "CMP001",
      "company": "TECHNOVA",
      "location": "Bengaluru",
      "stipend": 27000,
      "minCgpa": 7.5,
      "description": "Internal tooling.",
      "openings": 2,
      "isActive": true,
      "createdAt": "2026-09-08T14:12:40.391088Z",
      "requiredSkills": [
        {
          "skill": "Python",
          "requiredScore": 70.0,
          "weight": 3.0
        }
      ]
    }
  ],
  "recentApplicants": [
    {
      "id": "APPF89A3DFDC0",
      "studentId": "STU004",
      "studentName": "Neha Verma",
      "jobId": "job_qa_01",
      "jobTitle": "QA Automation Intern",
      "companyId": "CMP001",
      "company": "TECHNOVA",
      "location": "Bengaluru",
      "stipend": 18000,
      "status": "APPLIED",
      "matchScore": 89,
      "createdAt": "2026-09-08T14:12:40.361158Z",
      "updatedAt": "2026-09-08T14:12:40.361158Z"
    }
  ]
}
```

---

### `GET /tpo/dashboard`

College-wide KPIs, the placement funnel, per-department performance and recruiters by offers.

Response `200`

```json
{
  "totalStudents": 24,
  "totalCompanies": 4,
  "activeJobs": 8,
  "applications": 14,
  "shortlisted": 7,
  "selected": 2,
  "funnel": [
    {
      "stage": "Students",
      "count": 24
    },
    {
      "stage": "Applications",
      "count": 14
    },
    {
      "stage": "Shortlisted",
      "count": 7
    }
  ],
  "departments": [
    {
      "department": "CSE",
      "students": 10,
      "applications": 7,
      "selected": 1,
      "placementRate": 10
    },
    {
      "department": "ECE",
      "students": 6,
      "applications": 2,
      "selected": 0,
      "placementRate": 0
    },
    {
      "department": "IT",
      "students": 8,
      "applications": 5,
      "selected": 1,
      "placementRate": 12
    }
  ],
  "topRecruiters": [
    {
      "company": "NEURASOFT",
      "selected": 1
    },
    {
      "company": "CLOUDNEST",
      "selected": 1
    },
    {
      "company": "TECHNOVA",
      "selected": 0
    }
  ]
}
```

---

### `GET /tpo/skill-gaps`

Company demand against student average, per department, ranked by shortfall. Optional `?department=CSE`.

Response `200`

```json
[
  {
    "skill": "Python",
    "department": "ECE",
    "companyDemand": 73.4,
    "studentAverage": 61.0,
    "gap": 12.4,
    "severity": "MODERATE",
    "studentsBelowBar": 5,
    "openRoles": 5
  },
  {
    "skill": "React",
    "department": "CSE",
    "companyDemand": 70.0,
    "studentAverage": 59.0,
    "gap": 11.0,
    "severity": "MODERATE",
    "studentsBelowBar": 9,
    "openRoles": 1
  }
]
```

---

### `GET /tpo/skill-gaps/React/students`

Students below the demand bar for one skill, worst first. Optional `?department=`.

Response `200`

```json
[
  {
    "studentId": "STU003",
    "name": "Karan Singh",
    "department": "CSE",
    "semester": 6,
    "cgpa": 7.6,
    "score": 42.0,
    "target": 70.0,
    "gap": 28.0
  },
  {
    "studentId": "STU019",
    "name": "Rahul Deshmukh",
    "department": "CSE",
    "semester": 6,
    "cgpa": 7.1,
    "score": 46.5,
    "target": 70.0,
    "gap": 23.5
  }
]
```


---

## Limitations

- `POST /auth/login` is **not real authentication**. Credentials are compared
  against `users.demo_password` in plain text and the returned token is opaque
  and never verified on subsequent requests. No endpoint is protected. Replace
  with password hashing and signed tokens before any real deployment.
- Applications store only their current `status`. There is no event history
  table, so a client cannot render a status timeline from this API yet. Adding
  an `ApplicationEvent` table is the smallest change that would enable it.
- `projectScore` is inferred by matching skill names against a free-text
  `skills_text` field. It is a coarse signal, not parsing.
- Match scores are recomputed on every read, so they always reflect current skill
  scores. The `matchScore` stored on an application is deliberately frozen at the
  moment of applying.

---

## Adaptive assessment (added after the initial contract)

Two endpoints run an Item Response Theory session as an alternative to the fixed
paper. `POST /tests/submit` is unchanged and still works.

### `POST /tests/adaptive/start`

Request `{"studentId": "STU001"}`. Opens a session, abandons any half-finished
one for that student, and returns the first question plus the prior ability
estimate for every skill.

### `POST /tests/adaptive/answer`

Request `{"attemptId": "ADP...", "questionId": "Q07", "selectedOption": "c"}`.

Grades the answer, re-estimates ability for that skill, and returns either the
next question or — when every skill has settled — `finished: true` with the same
`TestResultOut` body the fixed paper returns. Scores are written through to
`StudentSkill.test_score` and `final_score`, so matches recompute immediately.

Each response carries an `abilities` array:

```json
{
  "skill": "React",
  "theta": -0.28,
  "standardError": 0.777,
  "score": 45,
  "confidence": "high",
  "itemsSeen": 3,
  "settled": true
}
```

`theta` is ability on the logit scale, `score` is that mapped onto 0-100,
`standardError` is the posterior width. Errors: `404` unknown student, attempt or
question; `409` for a finished session or a question answered twice.

**What it does and does not do.** Item selection is genuinely adaptive — the next
question is the unasked one whose difficulty sits closest to the current ability
estimate, so a session covers the 24 most informative items out of 64. Test
*length* is effectively fixed, because under a 1PL model the posterior width
depends on how many items were asked rather than on whether the answers agreed.
Variable length needs a 2PL model with per-item discrimination, which has to be
calibrated from real response data across many students.
