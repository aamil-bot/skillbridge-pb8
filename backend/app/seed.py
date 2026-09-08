"""
Idempotent seed for the SkillBridge demo.

Run it as many times as you like: every record is keyed by a stable id and is
inserted only when missing, then refreshed in place. Nothing is duplicated.

    python -m app.seed

Skill scores are not typed in directly. Each student's `subject_score` is derived
from the subject-to-skill map for their department, `project_score` from what
they have actually built, and `final_score` from the 45/35/20 blend. Only the
test component is seeded as a number, so the scores you see are the same
calculation the API performs after a real submission.
"""

from __future__ import annotations

import json
import random
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import (
    Application,
    ApplicationStatus,
    Company,
    Job,
    JobSkill,
    Project,
    Question,
    Role,
    Skill,
    Student,
    StudentSkill,
    SubjectSkillMap,
    User,
)
from app.services.scoring import (
    PROJECT_WEIGHT,
    SUBJECT_WEIGHT,
    TEST_WEIGHT,
    clamp,
    compute_final_score,
    project_score_for,
)

DEMO_PASSWORD = "demo1234"
COLLEGE = "Sri Ramanujan Institute of Technology"

# --------------------------------------------------------------------------- #
# Reference data                                                              #
# --------------------------------------------------------------------------- #

SKILLS = [
    ("skill_sql", "SQL", "Data"),
    ("skill_python", "Python", "Programming"),
    ("skill_react", "React", "Frontend"),
    ("skill_javascript", "JavaScript", "Frontend"),
    ("skill_dsa", "DSA", "Fundamentals"),
    ("skill_communication", "Communication", "Professional"),
    ("skill_java", "Java", "Programming"),
    ("skill_cloud", "Cloud", "Infrastructure"),
]

# department, subject, skill id, how much the subject contributes (0–1)
SUBJECT_MAP = [
    ("CSE", "Database Management Systems", "skill_sql", 1.0),
    ("CSE", "Database Design", "skill_sql", 0.8),
    ("CSE", "Programming in Python", "skill_python", 1.0),
    ("CSE", "Web Technologies", "skill_javascript", 0.9),
    ("CSE", "Web Technologies", "skill_react", 0.6),
    ("CSE", "Data Structures", "skill_dsa", 1.0),
    ("CSE", "Design and Analysis of Algorithms", "skill_dsa", 0.9),
    ("CSE", "Technical Communication", "skill_communication", 0.8),
    ("CSE", "Object Oriented Programming", "skill_java", 0.9),
    ("CSE", "Cloud Computing", "skill_cloud", 0.7),
    ("IT", "Database Management Systems", "skill_sql", 1.0),
    ("IT", "Web Application Development", "skill_react", 0.9),
    ("IT", "Web Application Development", "skill_javascript", 1.0),
    ("IT", "Python Programming", "skill_python", 0.9),
    ("IT", "Data Structures", "skill_dsa", 0.8),
    ("IT", "Professional Communication", "skill_communication", 0.9),
    ("IT", "Java Programming", "skill_java", 1.0),
    ("IT", "Cloud Infrastructure", "skill_cloud", 0.9),
    ("ECE", "Database Management Systems", "skill_sql", 0.6),
    ("ECE", "Signals and Systems", "skill_python", 0.6),
    ("ECE", "Microprocessors and Microcontrollers", "skill_dsa", 0.6),
    ("ECE", "Embedded C", "skill_java", 0.4),
    ("ECE", "Technical Communication", "skill_communication", 0.9),
    ("ECE", "IoT and Cloud Systems", "skill_cloud", 0.7),
    ("ECE", "Web Basics", "skill_javascript", 0.5),
    ("ECE", "Web Basics", "skill_react", 0.35),
]

COMPANIES = [
    (
        "CMP001",
        "TECHNOVA",
        "Bengaluru",
        "Product engineering for logistics and retail. Hires 40-60 interns a year.",
        "hiring@technova.example.com",
    ),
    (
        "CMP002",
        "NEURASOFT",
        "Hyderabad",
        "Applied machine learning studio working on document and vision pipelines.",
        "campus@neurasoft.example.com",
    ),
    (
        "CMP003",
        "CLOUDNEST",
        "Pune",
        "Managed cloud platform and developer tooling for regulated industries.",
        "talent@cloudnest.example.com",
    ),
    (
        "CMP004",
        "FINEDGE",
        "Mumbai",
        "Core banking and payments software for cooperative banks.",
        "careers@finedge.example.com",
    ),
]

# id, company, title, location, stipend, min cgpa, openings, description, [(skill, required, weight)]
JOBS = [
    (
        "job_frontend_01",
        "CMP001",
        "Frontend Intern",
        "Bengaluru",
        25000,
        7.0,
        4,
        "Work on the customer-facing order tracking app alongside two senior engineers. "
        "You will own small features end to end, from component to release.",
        [
            ("skill_react", 70, 3),
            ("skill_javascript", 65, 3),
            ("skill_sql", 50, 1),
            ("skill_communication", 55, 1),
        ],
    ),
    (
        "job_data_analyst_01",
        "CMP001",
        "Data Analyst Intern",
        "Bengaluru",
        22000,
        7.5,
        3,
        "Support the retail analytics team with SQL models, weekly reporting and ad-hoc "
        "analysis for category managers.",
        [("skill_sql", 75, 3), ("skill_python", 72, 3), ("skill_communication", 60, 2)],
    ),
    (
        "job_qa_01",
        "CMP001",
        "QA Automation Intern",
        "Bengaluru",
        18000,
        6.5,
        2,
        "Write and maintain the regression suite for the merchant dashboard, and triage "
        "failures with the release team.",
        [
            ("skill_javascript", 60, 3),
            ("skill_communication", 65, 2),
            ("skill_sql", 55, 2),
            ("skill_dsa", 50, 1),
        ],
    ),
    (
        "job_ml_01",
        "CMP002",
        "AI/ML Engineering Intern",
        "Hyderabad",
        30000,
        8.0,
        2,
        "Train and evaluate document extraction models, then help ship them behind a "
        "serving API.",
        [
            ("skill_python", 80, 3),
            ("skill_dsa", 72, 2),
            ("skill_sql", 60, 1),
            ("skill_cloud", 55, 1),
        ],
    ),
    (
        "job_backend_01",
        "CMP003",
        "Backend Developer Intern",
        "Pune",
        26000,
        7.0,
        3,
        "Build and operate internal APIs on the managed platform team, including on-call "
        "shadowing in the final month.",
        [
            ("skill_python", 75, 3),
            ("skill_sql", 70, 2),
            ("skill_dsa", 68, 2),
            ("skill_cloud", 55, 2),
        ],
    ),
    (
        "job_java_01",
        "CMP004",
        "Java Developer Intern",
        "Mumbai",
        24000,
        7.2,
        3,
        "Maintain and extend the core ledger service used by 40 cooperative banks.",
        [
            ("skill_java", 70, 3),
            ("skill_dsa", 65, 2),
            ("skill_sql", 60, 2),
            ("skill_communication", 58, 1),
        ],
    ),
]

# name, department, semester, cgpa, city, stipend, test-score profile per skill
# The first entry is the mandated demo student.
STUDENTS: list[tuple] = [
    ("Aarav Sharma", "CSE", 6, 8.1, "Bengaluru", 25000),
    ("Riya Mehta", "IT", 6, 8.9, "Pune", 28000),
    ("Karan Singh", "CSE", 6, 7.6, "Hyderabad", 20000),
    ("Neha Verma", "ECE", 6, 8.2, "Bengaluru", 22000),
    ("Rohit Nair", "CSE", 8, 9.1, "Bengaluru", 35000),
    ("Ishita Rao", "IT", 6, 7.9, "Chennai", 21000),
    ("Devansh Gupta", "CSE", 6, 8.0, "Noida", 24000),
    ("Ananya Iyer", "IT", 6, 8.6, "Bengaluru", 27000),
    ("Manav Chauhan", "ECE", 6, 7.4, "Jaipur", 18000),
    ("Sneha Pillai", "CSE", 8, 8.8, "Bengaluru", 32000),
    ("Aditya Rane", "IT", 6, 7.2, "Mumbai", 18000),
    ("Pooja Nanda", "ECE", 6, 8.5, "Bengaluru", 23000),
    ("Vikram Reddy", "CSE", 6, 7.8, "Hyderabad", 22000),
    ("Tanvi Joshi", "IT", 8, 8.4, "Pune", 26000),
    ("Harsh Patel", "CSE", 6, 6.9, "Ahmedabad", 16000),
    ("Meera Krishnan", "ECE", 8, 8.7, "Chennai", 25000),
    ("Siddharth Bose", "CSE", 8, 8.3, "Kolkata", 27000),
    ("Kavya Menon", "IT", 6, 7.7, "Bengaluru", 21000),
    ("Rahul Deshmukh", "CSE", 6, 7.1, "Pune", 19000),
    ("Divya Agarwal", "IT", 8, 9.0, "Bengaluru", 33000),
    ("Arjun Malhotra", "ECE", 6, 7.0, "Delhi", 17000),
    ("Nikita Shah", "CSE", 6, 8.6, "Mumbai", 29000),
    ("Farhan Ali", "IT", 6, 7.5, "Hyderabad", 20000),
    ("Lakshmi Suresh", "ECE", 8, 8.1, "Bengaluru", 24000),
]

PROJECT_TEMPLATES = [
    ("Campus Placement Tracker", "Tracks drives, eligibility and offers for 400+ students.", "Python SQL Flask"),
    ("Library Recommendation Engine", "Collaborative filtering over three years of borrowing history.", "Python SQL Pandas"),
    ("Hostel Mess Feedback App", "Daily meal ratings with a weekly summary for the mess committee.", "JavaScript React Firebase"),
    ("Expense Splitter", "Group settlement with a minimal-transaction algorithm.", "React JavaScript Node"),
    ("Attendance QR System", "Rotating-QR attendance with a proxy check.", "JavaScript SQL Express"),
    ("Air Quality Monitor", "ESP32 sensor node streaming AQI over MQTT.", "Python IoT Cloud"),
    ("Distributed Job Queue", "Redis-backed worker pool with retries and metrics.", "Python Cloud DSA"),
    ("Pathfinding Visualiser", "Animates BFS, Dijkstra and A* on an editable grid.", "JavaScript React DSA"),
    ("Retail Sales Warehouse", "Star-schema warehouse with scheduled loads.", "SQL Python Cloud"),
    ("Core Banking Ledger Clone", "Double-entry ledger with statement generation.", "Java SQL DSA"),
    ("Smart Streetlight Controller", "Ambient-light driven dimming with a usage log.", "Java IoT"),
    ("Design System Kit", "Accessible component library used across three projects.", "React JavaScript"),
]

QUESTIONS = [
    ("Q01", "skill_sql", "Which clause filters rows after GROUP BY has aggregated them?",
     ["WHERE", "HAVING", "ORDER BY", "DISTINCT"], "b", "easy"),
    ("Q02", "skill_sql", "What does an INNER JOIN return?",
     ["Every row from the left table", "Only rows with a matching key in both tables",
      "Every row from both tables", "Rows in one table but not the other"], "b", "easy"),
    ("Q03", "skill_sql", "Which index is most useful for a range query on a date column?",
     ["Hash index", "B-tree index", "Bitmap index", "No index helps"], "b", "medium"),
    ("Q04", "skill_python", 'What is the value of len({"a": 1, "b": 2, "a": 3})?',
     ["1", "2", "3", "It raises a KeyError"], "b", "medium"),
    ("Q05", "skill_python", "Which built-in type can be modified after creation?",
     ["tuple", "str", "list", "frozenset"], "c", "easy"),
    ("Q06", "skill_python", "What does a generator function return when called?",
     ["A list", "A generator object", "The first yielded value", "None"], "b", "medium"),
    ("Q07", "skill_react", "Which hook holds state that persists between renders?",
     ["useEffect", "useMemo", "useState", "useContext"], "c", "easy"),
    ("Q08", "skill_react", "Why does React ask for a key on each item in a list?",
     ["To sort the list", "To identify which items changed between renders",
      "To make items focusable", "To cache items locally"], "b", "medium"),
    ("Q09", "skill_react", "When does useEffect with an empty dependency array run?",
     ["On every render", "Once after the first render", "Never", "Only on unmount"], "b", "medium"),
    ("Q10", "skill_javascript", "What does typeof null evaluate to?",
     ['"null"', '"undefined"', '"object"', '"boolean"'], "c", "medium"),
    ("Q11", "skill_javascript", "How does let differ from var?",
     ["let is block scoped, var is function scoped", "let cannot be reassigned",
      "let only works in modules", "There is no difference"], "a", "easy"),
    ("Q12", "skill_javascript", "What does Promise.all reject with?",
     ["An array of all errors", "The first rejection it encounters",
      "Nothing, it always resolves", "A timeout error"], "b", "hard"),
    ("Q13", "skill_dsa", "Average time complexity of binary search on a sorted array?",
     ["O(1)", "O(log n)", "O(n)", "O(n log n)"], "b", "easy"),
    ("Q14", "skill_dsa", "Which structure removes elements in the order they were added?",
     ["Stack", "Queue", "Binary heap", "Hash table"], "b", "easy"),
    ("Q15", "skill_dsa", "Worst-case time complexity of quicksort?",
     ["O(n)", "O(n log n)", "O(n^2)", "O(log n)"], "c", "medium"),
    ("Q16", "skill_communication", "You will miss a deadline in two days. What do you say first?",
     ["Nothing until the deadline passes", "The revised date, the reason, and what you need",
      "A log of everything you worked on", "That it is on track"], "b", "easy"),
    ("Q17", "skill_communication", "What makes a standup update useful to the team?",
     ["A walkthrough of your code", "What you finished, what is next, what is blocking you",
      "Hours spent", "Only the problems"], "b", "easy"),
    ("Q18", "skill_communication", "A stakeholder disagrees with your approach in a review. Best response?",
     ["Defend the decision firmly", "Ask what outcome they are worried about",
      "Escalate to your manager", "Agree and change it immediately"], "b", "medium"),
    ("Q19", "skill_java", "What is the default value of an uninitialised int field?",
     ["null", "0", "undefined", "It will not compile"], "b", "easy"),
    ("Q20", "skill_java", "Which collection guarantees insertion order?",
     ["HashSet", "TreeSet", "LinkedHashSet", "HashMap"], "c", "medium"),
    ("Q21", "skill_java", "What does the final keyword on a method mean?",
     ["It cannot be overridden", "It cannot be called twice",
      "It must be static", "It returns a constant"], "a", "medium"),
    ("Q22", "skill_cloud", "What is the main benefit of horizontal scaling?",
     ["Bigger machines", "More machines sharing the load",
      "Lower storage cost", "Fewer deployments"], "b", "easy"),
    ("Q23", "skill_cloud", "What does an object store like S3 give you that a filesystem does not?",
     ["POSIX semantics", "Durable, virtually unlimited capacity behind an HTTP API",
      "Faster random writes", "Automatic schema validation"], "b", "medium"),
    ("Q24", "skill_cloud", "Why put a service behind a load balancer?",
     ["To reduce code size", "To distribute traffic and survive instance failure",
      "To encrypt the database", "To version the API"], "b", "easy"),
    ("Q25", "skill_sql", "Which statement removes every row but keeps the table structure?",
     ["DROP TABLE", "TRUNCATE TABLE", "DELETE DATABASE", "ALTER TABLE"], "b", "easy"),
    ("Q26", "skill_sql", "In a LEFT JOIN, what appears for rows with no match on the right?",
     ["The row is skipped", "NULLs in the right-hand columns", "Zeroes", "An error"], "b", "medium"),
    ("Q27", "skill_sql", "Which is always true of a PRIMARY KEY column?",
     ["It is unique and not null", "It is an integer", "It is indexed but may repeat",
      "It allows one null"], "a", "medium"),
    ("Q28", "skill_sql", "An indexed column is still scanned sequentially. Most likely reason?",
     ["Indexes never help", "The column has low selectivity so the planner prefers a scan",
      "The table is too small to index", "The index is on the wrong database"], "b", "hard"),
    ("Q29", "skill_sql", "Which isolation level prevents phantom reads?",
     ["READ UNCOMMITTED", "READ COMMITTED", "REPEATABLE READ", "SERIALIZABLE"], "d", "hard"),
    ("Q30", "skill_python", "What does range(5) produce?",
     ["1 through 5", "0 through 4", "0 through 5", "A list of five empty slots"], "b", "easy"),
    ("Q31", "skill_python", "Which keyword defines an anonymous function?",
     ["def", "func", "lambda", "anon"], "c", "easy"),
    ("Q32", "skill_python", "What does a list comprehension evaluate to?",
     ["A generator", "A new list", "The original list, modified", "None"], "b", "medium"),
    ("Q33", "skill_python", "Why is a mutable default argument a common bug?",
     ["It cannot be passed", "It is recreated every call",
      "It is created once and shared across every call", "It raises a TypeError"], "c", "medium"),
    ("Q34", "skill_python", "What does the GIL prevent?",
     ["Any use of threads", "Two threads executing Python bytecode at the same time",
      "Multiprocessing", "Garbage collection"], "b", "hard"),
    ("Q35", "skill_react", "What is JSX?",
     ["A templating language run in the browser", "Syntax that compiles to function calls",
      "A CSS preprocessor", "A build tool"], "b", "easy"),
    ("Q36", "skill_react", "How does a parent pass data to a child component?",
     ["Through props", "Through global variables", "Through the DOM", "It cannot"], "a", "easy"),
    ("Q37", "skill_react", "What commonly causes an infinite render loop with useEffect?",
     ["Returning a cleanup function", "Setting state inside it without correct dependencies",
      "Using it more than once", "Calling it conditionally"], "b", "medium"),
    ("Q38", "skill_react", "What does useMemo do?",
     ["Stores state", "Caches a computed value between renders",
      "Replaces useEffect", "Memoises the whole component"], "b", "medium"),
    ("Q39", "skill_react", "Why does mutating state directly fail to update the UI?",
     ["Mutation is forbidden by JavaScript", "React compares references, so it sees no change",
      "It updates but only after a reload", "It throws an error"], "b", "hard"),
    ("Q40", "skill_javascript", "How does === differ from ==?",
     ["It is faster", "It performs no type coercion", "It compares objects deeply",
      "There is no difference"], "b", "easy"),
    ("Q41", "skill_javascript", "What does Array.prototype.map return?",
     ["The original array", "A new array of the same length", "undefined",
      "The number of items"], "b", "easy"),
    ("Q42", "skill_javascript", "What is a closure?",
     ["A function that has finished running",
      "A function that keeps access to the scope it was defined in",
      "A way to close a browser tab", "A private class field"], "b", "medium"),
    ("Q43", "skill_javascript", "What does calling an async function return?",
     ["The resolved value", "A Promise", "undefined until awaited", "A callback"], "b", "medium"),
    ("Q44", "skill_javascript", "Which runs first: a resolved Promise callback or setTimeout(fn, 0)?",
     ["setTimeout, because 0ms", "The Promise, because microtasks run before timers",
      "Whichever was written first", "They run simultaneously"], "b", "hard"),
    ("Q45", "skill_dsa", "Which structure is last-in, first-out?",
     ["Queue", "Stack", "Linked list", "Trie"], "b", "easy"),
    ("Q46", "skill_dsa", "Average lookup time in a hash table?",
     ["O(1)", "O(log n)", "O(n)", "O(n log n)"], "a", "medium"),
    ("Q47", "skill_dsa", "Which binary tree traversal visits the root between the two subtrees?",
     ["Pre-order", "In-order", "Post-order", "Level-order"], "b", "medium"),
    ("Q48", "skill_dsa", "Auxiliary space complexity of standard merge sort?",
     ["O(1)", "O(log n)", "O(n)", "O(n^2)"], "c", "hard"),
    ("Q49", "skill_dsa", "Which shortest-path algorithm handles negative edge weights?",
     ["Dijkstra", "Bellman-Ford", "Breadth-first search", "Kruskal"], "b", "hard"),
    ("Q50", "skill_communication", "Which subject line serves a status email best?",
     ["Update", "Quick question", "Payments API: launch slipping to 12 March, need one decision",
      "Please read"], "c", "easy"),
    ("Q51", "skill_communication", "A teammate's pull request has a design flaw. Best first move?",
     ["Approve it and fix it later", "Ask what constraint led to the approach, then propose an alternative",
      "Reject it without comment", "Rewrite it yourself"], "b", "medium"),
    ("Q52", "skill_communication", "You do not understand a requirement you were handed. What do you do?",
     ["Start building and adjust later", "Ask early with a concrete example of your reading",
      "Ask a teammate to interpret it", "Wait for the next meeting"], "b", "medium"),
    ("Q53", "skill_communication", "Presenting to non-technical stakeholders, you should lead with:",
     ["The architecture diagram", "The impact and the decision you need",
      "The libraries chosen", "The test coverage"], "b", "medium"),
    ("Q54", "skill_communication", "Two senior engineers disagree in your design review. Best move?",
     ["Pick the more senior one", "Name the trade-off and ask which risk matters more here",
      "Postpone the project", "Implement both"], "b", "hard"),
    ("Q55", "skill_java", "Which keyword makes one class inherit another?",
     ["implements", "extends", "inherits", "super"], "b", "easy"),
    ("Q56", "skill_java", "What is the entry point of a Java application?",
     ["start()", "public static void main(String[] args)", "init()", "run()"], "b", "easy"),
    ("Q57", "skill_java", "For two Strings, how does == differ from .equals()?",
     ["No difference", "== compares references, .equals() compares contents",
      "== compares contents, .equals() compares references", "== is faster and safer"], "b", "medium"),
    ("Q58", "skill_java", "What does an interface define?",
     ["A partial implementation", "A contract of method signatures",
      "A singleton", "A package"], "b", "medium"),
    ("Q59", "skill_java", "What does try-with-resources guarantee?",
     ["The block never throws", "Resources are closed automatically when the block exits",
      "The code retries on failure", "Exceptions are swallowed"], "b", "hard"),
    ("Q60", "skill_cloud", "What does Infrastructure as a Service give you?",
     ["A fully managed application", "Raw compute and storage you configure yourself",
      "A database only", "A CI pipeline"], "b", "easy"),
    ("Q61", "skill_cloud", "What does autoscaling respond to?",
     ["The calendar", "Observed load metrics such as CPU or queue depth",
      "Manual approval", "Code commits"], "b", "medium"),
    ("Q62", "skill_cloud", "Why pass secrets through environment variables rather than committing them?",
     ["They load faster", "They stay out of the image and the repository",
      "They are encrypted automatically", "It is required by HTTP"], "b", "medium"),
    ("Q63", "skill_cloud", "What does eventual consistency mean?",
     ["Writes are lost", "Replicas converge on the same value given time",
      "Reads always block", "Consistency is never reached"], "b", "hard"),
    ("Q64", "skill_cloud", "Why is a stateless service easier to scale horizontally?",
     ["It uses less memory", "Any instance can serve any request, so instances are interchangeable",
      "It needs no database", "It cannot fail"], "b", "hard"),
]

# STU001 is the mandated demo student: strong SQL and Python, a clear React gap.
# These are the final scores the demo needs to show. The subject and project
# components are computed like everyone else's; only the test component is then
# solved for, so the stored numbers still satisfy final = 45/35/20.
STU001_TARGET_FINALS = {
    "skill_sql": 86.0,
    "skill_python": 82.0,
    "skill_react": 45.0,
    "skill_javascript": 58.0,
    "skill_dsa": 62.0,
    "skill_communication": 65.0,
    "skill_java": 42.0,
    "skill_cloud": 40.0,
}

# Fixed so the React gap is real: nothing he has built involves React.
STU001_PROJECTS = [
    ("Campus Placement Tracker",
     "Tracks drives, eligibility and offers for 400+ students.", "Python SQL Flask"),
    ("Library Recommendation Engine",
     "Collaborative filtering over three years of borrowing history.", "Python SQL Pandas"),
    ("Retail Sales Warehouse",
     "Star-schema warehouse with scheduled loads.", "SQL Python Cloud"),
]

SEED_APPLICATIONS = [
    ("STU005", "job_backend_01", "SELECTED"),
    ("STU002", "job_frontend_01", "INTERVIEW"),
    ("STU008", "job_data_analyst_01", "SHORTLISTED"),
    ("STU010", "job_frontend_01", "SHORTLISTED"),
    ("STU003", "job_qa_01", "APPLIED"),
    ("STU007", "job_backend_01", "APPLIED"),
    ("STU006", "job_data_analyst_01", "REJECTED"),
    ("STU014", "job_java_01", "APPLIED"),
    ("STU020", "job_ml_01", "SELECTED"),
    ("STU012", "job_qa_01", "APPLIED"),
    ("STU017", "job_java_01", "SHORTLISTED"),
    ("STU022", "job_frontend_01", "REJECTED"),
]


# --------------------------------------------------------------------------- #
# Helpers                                                                     #
# --------------------------------------------------------------------------- #


def upsert(db: Session, model, pk, **fields):
    """Insert when missing, refresh in place when present."""
    instance = db.get(model, pk)
    if instance is None:
        instance = model(id=pk, **fields)
        db.add(instance)
    else:
        for key, value in fields.items():
            setattr(instance, key, value)
    return instance


def email_for(name: str) -> str:
    first, _, last = name.partition(" ")
    return f"{first}.{last}".lower().replace(" ", "") + "@srit.edu.in"


def subject_contribution(department: str, skill_id: str) -> float:
    """How strongly this department's syllabus covers a skill, 0–1."""
    values = [
        contribution
        for dept, _subject, mapped_skill, contribution in SUBJECT_MAP
        if dept == department and mapped_skill == skill_id
    ]
    if not values:
        return 0.3
    # Best-covered subject dominates, extra subjects add a little.
    return min(1.0, max(values) + 0.05 * (len(values) - 1))


def subject_score_for(cgpa: float, department: str, skill_id: str, jitter: float) -> float:
    """Academic performance, shaped by how much the syllabus covers the skill."""
    base = cgpa * 10
    coverage = subject_contribution(department, skill_id)
    return round(clamp(base * (0.55 + 0.45 * coverage) + jitter), 2)


# --------------------------------------------------------------------------- #
# Seed                                                                        #
# --------------------------------------------------------------------------- #


def seed(db: Session) -> None:
    rng = random.Random(20260908)

    for skill_id, name, category in SKILLS:
        upsert(db, Skill, skill_id, name=name, category=category)
    db.flush()

    existing_map = {
        (row.department, row.subject_name, row.skill_id)
        for row in db.query(SubjectSkillMap).all()
    }
    for department, subject, skill_id, contribution in SUBJECT_MAP:
        if (department, subject, skill_id) not in existing_map:
            db.add(
                SubjectSkillMap(
                    department=department,
                    subject_name=subject,
                    skill_id=skill_id,
                    contribution_score=contribution,
                )
            )
    db.flush()

    for question_id, skill_id, text, options, correct, difficulty in QUESTIONS:
        upsert(
            db,
            Question,
            question_id,
            skill_id=skill_id,
            question_text=text,
            options_json=json.dumps(
                [{"id": letter, "text": option} for letter, option in zip("abcd", options)]
            ),
            correct_option=correct,
            difficulty=difficulty,
        )
    db.flush()

    # --- companies ---------------------------------------------------------
    for company_id, name, location, description, email in COMPANIES:
        user_id = f"USR_{company_id}"
        upsert(
            db, User, user_id,
            role=Role.COMPANY.value, email=email,
            demo_password=DEMO_PASSWORD, display_name=name,
        )
        db.flush()
        upsert(
            db, Company, company_id,
            user_id=user_id, name=name, location=location, description=description,
        )
    db.flush()

    # --- placement office --------------------------------------------------
    upsert(
        db, User, "TPO001",
        role=Role.TPO.value, email="tpo@srit.edu.in",
        demo_password=DEMO_PASSWORD, display_name="Placement Office",
    )
    db.flush()

    # --- jobs --------------------------------------------------------------
    posted = datetime.now(timezone.utc) - timedelta(days=30)
    for index, (job_id, company_id, title, location, stipend, min_cgpa, openings, desc, skills) in enumerate(JOBS):
        job = upsert(
            db, Job, job_id,
            company_id=company_id, title=title, location=location, stipend=stipend,
            min_cgpa=min_cgpa, description=desc, openings=openings, is_active=True,
        )
        if job.created_at is None:
            job.created_at = posted + timedelta(days=index * 2)
        db.flush()

        existing_skills = {row.skill_id: row for row in job.required_skills}
        for skill_id, required, weight in skills:
            row = existing_skills.get(skill_id)
            if row is None:
                db.add(
                    JobSkill(job_id=job.id, skill_id=skill_id,
                             required_score=required, weight=weight)
                )
            else:
                row.required_score = required
                row.weight = weight
    db.flush()

    # --- students ----------------------------------------------------------
    for index, (name, department, semester, cgpa, city, stipend) in enumerate(STUDENTS, start=1):
        student_id = f"STU{index:03d}"
        user_id = f"USR_{student_id}"

        upsert(
            db, User, user_id,
            role=Role.STUDENT.value, email=email_for(name),
            demo_password=DEMO_PASSWORD, display_name=name,
        )
        db.flush()

        student = upsert(
            db, Student, student_id,
            user_id=user_id,
            registration_number=f"SRIT/{department}/2023/{index:03d}",
            name=name, college=COLLEGE, department=department, semester=semester,
            cgpa=cgpa, preferred_city=city, expected_stipend=stipend,
        )
        db.flush()

        # projects: fixed for the demo student, deterministic for everyone else
        if not student.projects:
            picks = (
                STU001_PROJECTS if student_id == "STU001" else rng.sample(PROJECT_TEMPLATES, 2)
            )
            for slot, (title, description, skills_text) in enumerate(picks, start=1):
                db.add(
                    Project(
                        id=f"{student_id}_PRJ{slot:02d}",
                        student_id=student_id,
                        title=title,
                        description=description,
                        skills_text=skills_text,
                    )
                )
            db.flush()
            db.refresh(student)

        project_texts = [f"{p.skills_text} {p.title}" for p in student.projects]
        existing_links = {link.skill_id: link for link in student.skills}

        for skill_id, skill_name, _category in SKILLS:
            jitter = 0.0 if student_id == "STU001" else rng.uniform(-7, 7)
            subject_score = subject_score_for(cgpa, department, skill_id, jitter)
            project_score = project_score_for(skill_name, project_texts)

            if student_id == "STU001":
                # Solve the test component so the final score is the demo target.
                target = STU001_TARGET_FINALS[skill_id]
                test_score = round(
                    clamp(
                        (target - SUBJECT_WEIGHT * subject_score - PROJECT_WEIGHT * project_score)
                        / TEST_WEIGHT
                    ),
                    2,
                )
            else:
                test_score = round(clamp(cgpa * 9 + rng.uniform(-22, 18)), 2)

            final_score = compute_final_score(subject_score, test_score, project_score)

            link = existing_links.get(skill_id)
            if link is None:
                db.add(
                    StudentSkill(
                        student_id=student_id, skill_id=skill_id,
                        subject_score=subject_score, test_score=test_score,
                        project_score=project_score, final_score=final_score,
                    )
                )
            else:
                link.subject_score = subject_score
                link.test_score = test_score
                link.project_score = project_score
                link.final_score = final_score
    db.flush()

    # --- applications ------------------------------------------------------
    from app.services.matching import match_student_to_job

    for order, (student_id, job_id, status) in enumerate(SEED_APPLICATIONS, start=1):
        student = db.get(Student, student_id)
        job = db.get(Job, job_id)
        if student is None or job is None:
            continue

        application_id = f"APP{order:04d}"
        result = match_student_to_job(student, job)
        upsert(
            db, Application, application_id,
            student_id=student_id, job_id=job_id,
            status=ApplicationStatus(status).value, match_score=result.matchScore,
        )

    db.commit()


def main() -> None:
    # Schema is owned by Alembic. Run `alembic upgrade head` before seeding.
    db = SessionLocal()
    try:
        seed(db)

        students = db.query(Student).count()
        companies = db.query(Company).count()
        jobs = db.query(Job).count()
        questions = db.query(Question).count()
        applications = db.query(Application).count()

        print(
            f"Seeded: {students} students, {companies} companies, {jobs} jobs, "
            f"{questions} questions, {applications} applications."
        )

        aarav = db.get(Student, "STU001")
        if aarav:
            scores = {link.skill.name: round(link.final_score) for link in aarav.skills}
            print(f"STU001 {aarav.name} (CGPA {aarav.cgpa}) final scores: {scores}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
