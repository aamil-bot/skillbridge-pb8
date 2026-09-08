import sys; sys.path.insert(0, "/home/claude/skillbridge/backend")
from fastapi.testclient import TestClient
from app.main import app

c = TestClient(app)
bad = 0
def ok(label, cond, detail=""):
    global bad
    print(("PASS  " if cond else "FAIL  ") + label + ((" — " + str(detail)) if detail else ""))
    if not cond: bad = 1

r = c.get("/health"); ok("GET /health", r.status_code==200 and r.json()["database"]=="connected", r.json())

r = c.get("/accounts", params={"role":"student"}); accts = r.json()
ok("GET /accounts?role=student", r.status_code==200 and len(accts)==24, f"{len(accts)} student accounts")

r = c.post("/auth/login", json={"role":"student","email":"aarav.sharma@srit.edu.in","password":"demo1234"})
ok("POST /auth/login (valid)", r.status_code==200 and r.json()["account"]["id"]=="STU001", r.json()["account"]["name"])
r = c.post("/auth/login", json={"role":"student","email":"aarav.sharma@srit.edu.in","password":"x"})
ok("POST /auth/login (wrong password -> 401)", r.status_code==401, r.json()["detail"])

r = c.get("/students/STU001"); s = r.json()
ok("GET /students/STU001", r.status_code==200 and s["cgpa"]==8.1 and s["department"]=="CSE",
   f'{s["name"]}, CGPA {s["cgpa"]}, {len(s["projects"])} projects')
scores = {k["skill"]: k["finalScore"] for k in s["skills"]}
ok("mandated demo profile: SQL strength, React gap", scores["SQL"]>=85 and scores["React"]<=46,
   f'SQL {scores["SQL"]}, Python {scores["Python"]}, React {scores["React"]}')

r = c.patch("/students/STU001/profile", json={"preferredCity":"Bengaluru","expectedStipend":26000})
ok("PATCH /students/STU001/profile", r.status_code==200 and r.json()["expectedStipend"]==26000)

r = c.get("/students/STU001/skill-profile"); sp = r.json()
ok("GET /students/STU001/skill-profile", r.status_code==200 and len(sp["skills"])==8,
   f'strongest {sp["strongest"]}, weakest {sp["weakest"]}')

r = c.get("/students/STU001/matches"); m = r.json()
ok("GET /students/STU001/matches", r.status_code==200 and m["studentId"]=="STU001" and len(m["matches"])==6)
fi = next(x for x in m["matches"] if x["jobId"]=="job_frontend_01")
ok("contract shape present", all(k in fi for k in
   ["jobId","jobTitle","company","location","stipend","matchScore","eligible","reasons","skillBreakdown"]))
react = next(b for b in fi["skillBreakdown"] if b["skill"]=="React")
sql = next(b for b in fi["skillBreakdown"] if b["skill"]=="SQL")
ok("React shows as a gap of 25", react["gap"]==25 and react["status"]=="Gap", react)
ok("SQL shows as a strength at 86", sql["studentScore"]==86 and sql["status"]=="Strength", sql)
print("      Frontend Intern match:", fi["matchScore"], "| components:", fi["components"])
print("      reasons:", " / ".join(fi["reasons"][:4]))

r = c.get("/tests/questions", params={"studentId":"STU001"}); qs = r.json()
ok("GET /tests/questions", r.status_code==200 and len(qs)==64)
ok("answer key not exposed", all("correctOption" not in q for q in qs))

from app.database import SessionLocal as _SL
from app.models import Question as _Q
KEY = {q.id: q.correct_option for q in _SL().query(_Q).all()}
r = c.post("/tests/submit", json={"studentId":"STU001",
    "answers":[{"questionId":q["id"],"selectedOption":KEY[q["id"]]} for q in qs]})
tr = r.json()
ok("POST /tests/submit", r.status_code==200 and tr["correctCount"]==64, f'{tr["correctCount"]}/64, total {tr["totalScore"]}')
deltas = {x["skill"]: x["delta"] for x in tr["skillResults"]}
ok("skill scores updated by the test", any(v>0 for v in deltas.values()), deltas)
ok("updated skill profile returned", len(tr["skillProfile"])==8)

r = c.get("/students/STU001/matches"); after = next(x for x in r.json()["matches"] if x["jobId"]=="job_frontend_01")
ok("match recalculated after the test", after["matchScore"] != fi["matchScore"],
   f'{fi["matchScore"]}% -> {after["matchScore"]}%')

r = c.post("/jobs/job_frontend_01/apply", json={"studentId":"STU001"})
ok("POST /jobs/{id}/apply", r.status_code==201 and r.json()["application"]["status"]=="APPLIED", r.json()["message"])
app_id = r.json()["application"]["id"]
r2 = c.post("/jobs/job_frontend_01/apply", json={"studentId":"STU001"})
ok("duplicate application prevented", r2.json()["application"]["id"]==app_id, r2.json()["message"])

r = c.get("/students/STU001/applications")
ok("GET /students/STU001/applications", r.status_code==200 and len(r.json())==1)

r = c.get("/company/jobs/job_frontend_01/matched-students"); ms = r.json()
ok("GET /company/jobs/{id}/matched-students", r.status_code==200 and len(ms["candidates"])==24)
aarav = next(x for x in ms["candidates"] if x["studentId"]=="STU001")
ok("STU001 appears ranked with reasons", aarav["applied"] and len(aarav["reasons"])>0,
   f'rank #{aarav["rank"]} at {aarav["matchScore"]}%')
ok("ranking is ordered", all(ms["candidates"][i]["matchScore"] >= ms["candidates"][i+1]["matchScore"]
   for i in range(len(ms["candidates"])-1)))

r = c.patch(f"/applications/{app_id}/status", json={"status":"SHORTLISTED"})
ok("PATCH /applications/{id}/status", r.status_code==200 and r.json()["application"]["status"]=="SHORTLISTED", r.json()["message"])
r = c.get("/students/STU001/applications")
ok("student sees SHORTLISTED", r.json()[0]["status"]=="SHORTLISTED")

r = c.post("/company/jobs", json={"companyId":"CMP001","title":"Platform Engineering Intern",
    "location":"Bengaluru","stipend":27000,"minCgpa":7.5,"description":"Internal tooling.","openings":2,
    "requiredSkills":[{"skill":"Python","requiredScore":70,"weight":3},{"skill":"Cloud","requiredScore":55,"weight":2}]})
ok("POST /company/jobs", r.status_code==201, r.json()["id"])
r = c.get("/students/STU001/matches")
ok("new job reaches student matches", len(r.json()["matches"])==7)

r = c.get("/company/CMP001/dashboard"); cd = r.json()
ok("GET /company/{id}/dashboard", r.status_code==200, f'{cd["activeJobs"]} jobs, {cd["applications"]} applications')

r = c.get("/tpo/dashboard"); d = r.json()
ok("GET /tpo/dashboard", r.status_code==200 and d["totalStudents"]==24 and d["totalCompanies"]==4,
   f'{d["totalStudents"]} students, {d["applications"]} apps, {d["shortlisted"]} shortlisted, {d["selected"]} selected')
counts = [f["count"] for f in d["funnel"]]
ok("funnel is monotonically decreasing", all(counts[i]>=counts[i+1] for i in range(len(counts)-1)),
   " > ".join(f'{f["stage"]} {f["count"]}' for f in d["funnel"]))

r = c.get("/tpo/skill-gaps"); g = r.json()
ok("GET /tpo/skill-gaps", r.status_code==200 and g[0]["gap"]>=g[-1]["gap"],
   f'worst: {g[0]["skill"]} in {g[0]["department"]} — demand {g[0]["companyDemand"]} vs avg {g[0]["studentAverage"]}')
ok("severities spread across bands", len({x["severity"] for x in g})>=2, sorted({x["severity"] for x in g}))
r = c.get("/tpo/skill-gaps", params={"department":"ECE"})
ok("skill-gaps filterable by department", all(x["department"]=="ECE" for x in r.json()))

r = c.get("/tpo/skill-gaps/React/students"); st = r.json()
ok("GET /tpo/skill-gaps/{skill}/students", r.status_code==200 and len(st)>0 and st[0]["gap"]>=st[-1]["gap"],
   f'{len(st)} students below the React bar')

r = c.get("/openapi.json")
ok("OpenAPI schema builds (powers /docs)", r.status_code==200 and len(r.json()["paths"])>=16,
   f'{len(r.json()["paths"])} documented paths')

print("\n" + ("SOME CHECKS FAILED" if bad else "ALL API CHECKS PASSED"))
sys.exit(bad)
