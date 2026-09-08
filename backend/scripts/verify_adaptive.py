import sys, random; sys.path.insert(0, "/home/claude/skillbridge/backend")
from fastapi.testclient import TestClient
from app.main import app
from app.services import adaptive

c = TestClient(app); bad = 0
def ok(l, cond, d=""):
    global bad
    print(("PASS  " if cond else "FAIL  ") + l + ((" — " + str(d)) if d else ""))
    if not cond: bad = 1

# --- the engine itself -----------------------------------------------------
R = adaptive.Response
strong = adaptive.estimate_ability([R(-1.0, True), R(0.0, True), R(1.1, True)])
weak   = adaptive.estimate_ability([R(-1.0, False), R(0.0, False), R(1.1, False)])
mixed  = adaptive.estimate_ability([R(-1.0, True), R(0.0, True), R(1.1, False)])
ok("ability separates strong / mixed / weak", strong.score > mixed.score > weak.score,
   f"{strong.score} > {mixed.score} > {weak.score}")
ok("uncertainty shrinks as evidence accumulates",
   adaptive.estimate_ability([R(0.0, True)]).standard_error >
   adaptive.estimate_ability([R(0.0, True), R(0.0, True), R(-1.0, True), R(1.1, False)]).standard_error)
ok("item selection targets the ability level",
   adaptive.select_next_item(1.0, [("easy", -1.0), ("hard", 1.1)]) == "hard")
ok("prior is neutral before any answers", adaptive.blank_ability().score == 50)

# --- a full adaptive session ----------------------------------------------
from app.database import SessionLocal as _SL
from app.models import Question as _Q
KEY = {q.id: q.correct_option for q in _SL().query(_Q).all()}

def run(student, skill_ability, seed):
    """skill_ability: skill -> probability of answering correctly."""
    rng = random.Random(seed)
    r = c.post("/tests/adaptive/start", json={"studentId": student}); s = r.json()
    assert r.status_code == 200, s
    order = []
    while not s["finished"] and s["question"]:
        q = s["question"]; order.append((q["skill"], q["difficulty"]))
        right = rng.random() < skill_ability.get(q["skill"], 0.5)
        pick = KEY[q["id"]] if right else next(o["id"] for o in q["options"] if o["id"] != KEY[q["id"]])
        s = c.post("/tests/adaptive/answer",
                   json={"attemptId": s["attemptId"], "questionId": q["id"], "selectedOption": pick}).json()
    return s, order

# A student strong in SQL/Python, weak in React — the STU001 shape.
profile = {"SQL":0.95,"Python":0.9,"React":0.1,"JavaScript":0.5,"DSA":0.6,
           "Communication":0.8,"Java":0.3,"Cloud":0.3}
state, order = run("STU003", profile, 7)
ok("session completes", state["finished"] and state["status"]=="completed",
   f'{state["asked"]} of {state["totalPool"]} questions asked')
ok("asks fewer questions than the fixed paper", state["asked"] < state["totalPool"],
   f'saved {state["savedQuestions"]} questions')
scores = {a["skill"]: a["score"] for a in state["abilities"] if a["itemsSeen"] > 0}
ok("recovers the simulated ability profile", scores.get("SQL",0) > scores.get("React",100),
   f'SQL {scores.get("SQL")} vs React {scores.get("React")}')
ok("every answered skill reports a confidence band",
   all(a["confidence"] in {"low","medium","high"} for a in state["abilities"]))
ok("scores written through to the skill profile",
   state["result"] is not None and len(state["result"]["skillProfile"]) == 8)
print("      order:", " ".join(f"{s}/{d[0]}" for s, d in order))
print("      per-skill:", {a["skill"]: f'{a["score"]}±{a["standardError"]}({a["confidence"]})'
                           for a in state["abilities"] if a["itemsSeen"]>0})

# A uniformly strong student should finish sooner than an erratic one.
s_strong, _ = run("STU005", {k: 0.95 for k in profile}, 11)
s_random, _ = run("STU009", {k: 0.5 for k in profile}, 11)
ok("confident students finish in fewer questions", s_strong["asked"] <= s_random["asked"],
   f'consistent {s_strong["asked"]} vs coin-flip {s_random["asked"]}')

# --- guards ---------------------------------------------------------------
r = c.post("/tests/adaptive/start", json={"studentId":"NOPE"}); ok("unknown student -> 404", r.status_code==404)
s2 = c.post("/tests/adaptive/start", json={"studentId":"STU004"}).json()
qid = s2["question"]["id"]
c.post("/tests/adaptive/answer", json={"attemptId":s2["attemptId"],"questionId":qid,"selectedOption":"a"})
r = c.post("/tests/adaptive/answer", json={"attemptId":s2["attemptId"],"questionId":qid,"selectedOption":"a"})
ok("same question cannot be answered twice -> 409", r.status_code==409, r.json()["detail"])
r = c.post("/tests/adaptive/answer", json={"attemptId":state["attemptId"],"questionId":"Q01","selectedOption":"a"})
ok("finished session rejects more answers -> 409", r.status_code==409, r.json()["detail"])

# --- the fixed paper still works ------------------------------------------
qs = c.get("/tests/questions", params={"studentId":"STU002"}).json()
r = c.post("/tests/submit", json={"studentId":"STU002",
    "answers":[{"questionId":q["id"],"selectedOption":KEY[q["id"]]} for q in qs]})
ok("original fixed assessment unaffected", r.status_code==200 and r.json()["correctCount"]==64)

r = c.get("/students/STU003/matches")
ok("matches still recompute after an adaptive test", r.status_code==200 and len(r.json()["matches"])>0,
   f'top: {r.json()["matches"][0]["jobTitle"]} {r.json()["matches"][0]["matchScore"]}%')

print("\n" + ("SOME CHECKS FAILED" if bad else "ALL ADAPTIVE CHECKS PASSED"))
sys.exit(bad)
