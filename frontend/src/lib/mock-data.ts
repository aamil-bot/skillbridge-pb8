/**
 * SkillBridge — seeded demo dataset.
 *
 * This is the only place mock data is defined. Pages never declare their own.
 * Everything derived (match scores, KPIs, funnels, department averages) is
 * computed from these seeds at read time so the numbers stay consistent as the
 * demo mutates state.
 */

import { levelFor, profileCompletionFor, computeReadiness } from "./matching";
import type {
  Application,
  ApplicationEvent,
  ApplicationStatus,
  AssessedSkill,
  Company,
  Job,
  Project,
  SkillName,
  SkillScore,
  Student,
  TestOption,
  TpoProfile,
} from "./types";
import { ASSESSED_SKILLS } from "./types";

export const PRIMARY_STUDENT_ID = "STU001";
export const PRIMARY_COMPANY_ID = "CMP001";
export const PRIMARY_TPO_ID = "TPO001";
export const COLLEGE_NAME = "Sri Ramanujan Institute of Technology";

/** Skills tracked for analytics beyond the six assessed ones. */
export const EXTRA_SKILLS: SkillName[] = ["Cloud", "Machine Learning"];
export const TRACKED_SKILLS: SkillName[] = [...ASSESSED_SKILLS, ...EXTRA_SKILLS];

const SEED_DATE = "2026-08-14T09:30:00.000Z";

/* ------------------------------------------------------------------ */
/* Students                                                            */
/* ------------------------------------------------------------------ */

interface StudentSeed {
  id: string;
  name: string;
  email: string;
  phone: string;
  registrationNumber: string;
  department: "CSE" | "IT" | "ECE";
  semester: number;
  cgpa: number;
  batch: string;
  backlogs: number;
  preferredCity: string;
  expectedStipend: number;
  scores: Record<SkillName, number>;
  projects: Project[];
}

const STUDENT_SEEDS: StudentSeed[] = [
  {
    id: "STU001",
    name: "Aarav Sharma",
    email: "aarav.sharma@srit.edu.in",
    phone: "+91 98765 43210",
    registrationNumber: "SRIT/CSE/2023/001",
    department: "CSE",
    semester: 6,
    cgpa: 8.4,
    batch: "2023–2027",
    backlogs: 0,
    preferredCity: "Bengaluru",
    expectedStipend: 25000,
    scores: {
      Python: 78,
      SQL: 82,
      React: 45,
      JavaScript: 61,
      DSA: 70,
      Communication: 75,
      Cloud: 32,
      "Machine Learning": 28,
    },
    projects: [
      {
        id: "PRJ001",
        title: "Campus Placement Tracker",
        description:
          "A dashboard that tracks placement drives, eligibility and offer status for 400+ students. Reduced manual coordination for the TPO office.",
        techStack: ["Python", "Flask", "PostgreSQL"],
      },
      {
        id: "PRJ002",
        title: "Library Recommendation Engine",
        description:
          "Collaborative-filtering recommender over three years of borrowing history, served through a small REST API.",
        techStack: ["Python", "Pandas", "SQL"],
      },
      {
        id: "PRJ003",
        title: "Hostel Mess Feedback App",
        description:
          "Daily meal rating app used by two hostel blocks, with a weekly summary for the mess committee.",
        techStack: ["JavaScript", "React", "Firebase"],
      },
    ],
  },
  {
    id: "STU002",
    name: "Riya Mehta",
    email: "riya.mehta@srit.edu.in",
    phone: "+91 98765 43211",
    registrationNumber: "SRIT/IT/2023/014",
    department: "IT",
    semester: 6,
    cgpa: 8.9,
    batch: "2023–2027",
    backlogs: 0,
    preferredCity: "Pune",
    expectedStipend: 28000,
    scores: {
      Python: 72,
      SQL: 74,
      React: 54,
      JavaScript: 70,
      DSA: 66,
      Communication: 81,
      Cloud: 48,
      "Machine Learning": 35,
    },
    projects: [
      {
        id: "PRJ011",
        title: "Expense Splitter",
        description: "Group expense settlement app with a minimal-transaction settlement algorithm.",
        techStack: ["React", "Node.js", "MongoDB"],
      },
    ],
  },
  {
    id: "STU003",
    name: "Karan Singh",
    email: "karan.singh@srit.edu.in",
    phone: "+91 98765 43212",
    registrationNumber: "SRIT/CSE/2023/027",
    department: "CSE",
    semester: 6,
    cgpa: 7.6,
    batch: "2023–2027",
    backlogs: 1,
    preferredCity: "Hyderabad",
    expectedStipend: 20000,
    scores: {
      Python: 64,
      SQL: 58,
      React: 49,
      JavaScript: 66,
      DSA: 61,
      Communication: 62,
      Cloud: 30,
      "Machine Learning": 22,
    },
    projects: [
      {
        id: "PRJ021",
        title: "Attendance QR System",
        description: "Rotating-QR classroom attendance with a proxy-attendance check.",
        techStack: ["JavaScript", "Express", "SQLite"],
      },
    ],
  },
  {
    id: "STU004",
    name: "Neha Verma",
    email: "neha.verma@srit.edu.in",
    phone: "+91 98765 43213",
    registrationNumber: "SRIT/ECE/2023/008",
    department: "ECE",
    semester: 6,
    cgpa: 8.2,
    batch: "2023–2027",
    backlogs: 0,
    preferredCity: "Bengaluru",
    expectedStipend: 22000,
    scores: {
      Python: 70,
      SQL: 62,
      React: 38,
      JavaScript: 52,
      DSA: 74,
      Communication: 79,
      Cloud: 41,
      "Machine Learning": 55,
    },
    projects: [
      {
        id: "PRJ031",
        title: "Air Quality Monitor",
        description: "ESP32 sensor node streaming AQI readings to a live chart over MQTT.",
        techStack: ["Python", "MQTT", "ESP32"],
      },
    ],
  },
  {
    id: "STU005",
    name: "Rohit Nair",
    email: "rohit.nair@srit.edu.in",
    phone: "+91 98765 43214",
    registrationNumber: "SRIT/CSE/2022/003",
    department: "CSE",
    semester: 8,
    cgpa: 9.1,
    batch: "2022–2026",
    backlogs: 0,
    preferredCity: "Bengaluru",
    expectedStipend: 35000,
    scores: {
      Python: 88,
      SQL: 79,
      React: 76,
      JavaScript: 84,
      DSA: 86,
      Communication: 72,
      Cloud: 58,
      "Machine Learning": 62,
    },
    projects: [
      {
        id: "PRJ041",
        title: "Distributed Job Queue",
        description: "Redis-backed worker pool with retries, dead-letter handling and a metrics endpoint.",
        techStack: ["Python", "Redis", "Docker"],
      },
      {
        id: "PRJ042",
        title: "Code Review Assistant",
        description: "Static-analysis bot that comments on pull requests with complexity warnings.",
        techStack: ["Python", "GitHub API"],
      },
    ],
  },
  {
    id: "STU006",
    name: "Ishita Rao",
    email: "ishita.rao@srit.edu.in",
    phone: "+91 98765 43215",
    registrationNumber: "SRIT/IT/2023/019",
    department: "IT",
    semester: 6,
    cgpa: 7.9,
    batch: "2023–2027",
    backlogs: 0,
    preferredCity: "Chennai",
    expectedStipend: 21000,
    scores: {
      Python: 61,
      SQL: 80,
      React: 67,
      JavaScript: 63,
      DSA: 55,
      Communication: 84,
      Cloud: 44,
      "Machine Learning": 30,
    },
    projects: [
      {
        id: "PRJ051",
        title: "Alumni Directory",
        description: "Searchable alumni database with batch and company filters.",
        techStack: ["React", "SQL", "Node.js"],
      },
    ],
  },
  {
    id: "STU007",
    name: "Devansh Gupta",
    email: "devansh.gupta@srit.edu.in",
    phone: "+91 98765 43216",
    registrationNumber: "SRIT/CSE/2023/041",
    department: "CSE",
    semester: 6,
    cgpa: 8.0,
    batch: "2023–2027",
    backlogs: 0,
    preferredCity: "Noida",
    expectedStipend: 24000,
    scores: {
      Python: 75,
      SQL: 68,
      React: 58,
      JavaScript: 72,
      DSA: 77,
      Communication: 66,
      Cloud: 39,
      "Machine Learning": 47,
    },
    projects: [
      {
        id: "PRJ061",
        title: "Pathfinding Visualiser",
        description: "Side-by-side animation of BFS, Dijkstra and A* on a editable grid.",
        techStack: ["JavaScript", "React"],
      },
    ],
  },
  {
    id: "STU008",
    name: "Ananya Iyer",
    email: "ananya.iyer@srit.edu.in",
    phone: "+91 98765 43217",
    registrationNumber: "SRIT/IT/2023/006",
    department: "IT",
    semester: 6,
    cgpa: 8.6,
    batch: "2023–2027",
    backlogs: 0,
    preferredCity: "Bengaluru",
    expectedStipend: 27000,
    scores: {
      Python: 69,
      SQL: 85,
      React: 62,
      JavaScript: 68,
      DSA: 64,
      Communication: 88,
      Cloud: 52,
      "Machine Learning": 33,
    },
    projects: [
      {
        id: "PRJ071",
        title: "Retail Sales Warehouse",
        description: "Star-schema warehouse over two years of retail transactions with scheduled loads.",
        techStack: ["SQL", "Python", "Airflow"],
      },
    ],
  },
  {
    id: "STU009",
    name: "Manav Chauhan",
    email: "manav.chauhan@srit.edu.in",
    phone: "+91 98765 43218",
    registrationNumber: "SRIT/ECE/2023/022",
    department: "ECE",
    semester: 6,
    cgpa: 7.4,
    batch: "2023–2027",
    backlogs: 2,
    preferredCity: "Jaipur",
    expectedStipend: 18000,
    scores: {
      Python: 58,
      SQL: 54,
      React: 33,
      JavaScript: 47,
      DSA: 63,
      Communication: 70,
      Cloud: 28,
      "Machine Learning": 38,
    },
    projects: [
      {
        id: "PRJ081",
        title: "Smart Streetlight Controller",
        description: "Ambient-light driven streetlight dimming with a usage log.",
        techStack: ["C", "Arduino"],
      },
    ],
  },
  {
    id: "STU010",
    name: "Sneha Pillai",
    email: "sneha.pillai@srit.edu.in",
    phone: "+91 98765 43219",
    registrationNumber: "SRIT/CSE/2022/017",
    department: "CSE",
    semester: 8,
    cgpa: 8.8,
    batch: "2022–2026",
    backlogs: 0,
    preferredCity: "Bengaluru",
    expectedStipend: 32000,
    scores: {
      Python: 82,
      SQL: 77,
      React: 71,
      JavaScript: 79,
      DSA: 81,
      Communication: 76,
      Cloud: 55,
      "Machine Learning": 49,
    },
    projects: [
      {
        id: "PRJ091",
        title: "Design System Kit",
        description: "Accessible component library used across three department projects.",
        techStack: ["React", "TypeScript", "Storybook"],
      },
    ],
  },
  {
    id: "STU011",
    name: "Aditya Rane",
    email: "aditya.rane@srit.edu.in",
    phone: "+91 98765 43220",
    registrationNumber: "SRIT/IT/2023/033",
    department: "IT",
    semester: 6,
    cgpa: 7.2,
    batch: "2023–2027",
    backlogs: 1,
    preferredCity: "Mumbai",
    expectedStipend: 18000,
    scores: {
      Python: 56,
      SQL: 63,
      React: 45,
      JavaScript: 59,
      DSA: 52,
      Communication: 68,
      Cloud: 36,
      "Machine Learning": 25,
    },
    projects: [
      {
        id: "PRJ101",
        title: "Canteen Pre-order",
        description: "Slot-based food pre-ordering to cut the lunch queue.",
        techStack: ["JavaScript", "Firebase"],
      },
    ],
  },
  {
    id: "STU012",
    name: "Pooja Nanda",
    email: "pooja.nanda@srit.edu.in",
    phone: "+91 98765 43221",
    registrationNumber: "SRIT/ECE/2023/011",
    department: "ECE",
    semester: 6,
    cgpa: 8.5,
    batch: "2023–2027",
    backlogs: 0,
    preferredCity: "Bengaluru",
    expectedStipend: 23000,
    scores: {
      Python: 73,
      SQL: 66,
      React: 41,
      JavaScript: 55,
      DSA: 72,
      Communication: 82,
      Cloud: 47,
      "Machine Learning": 58,
    },
    projects: [
      {
        id: "PRJ111",
        title: "Gesture Controlled Robot",
        description: "Accelerometer glove driving a differential-drive robot over RF.",
        techStack: ["Python", "OpenCV", "Arduino"],
      },
    ],
  },
];

function buildSkills(scores: Record<SkillName, number>): SkillScore[] {
  return Object.entries(scores).map(([skill, score]) => ({
    skill,
    score,
    level: levelFor(score),
    source: (ASSESSED_SKILLS as SkillName[]).includes(skill)
      ? "College record"
      : "Self reported",
    updatedAt: SEED_DATE,
  }));
}

function buildStudent(seed: StudentSeed): Student {
  const skills = buildSkills(seed.scores);
  const profile = {
    projects: seed.projects,
    preferredCity: seed.preferredCity,
    expectedStipend: seed.expectedStipend,
  };
  const profileCompletion = profileCompletionFor({
    profile,
    skills,
    assessmentCompleted: false,
  });

  return {
    id: seed.id,
    name: seed.name,
    email: seed.email,
    phone: seed.phone,
    academics: {
      registrationNumber: seed.registrationNumber,
      department: seed.department,
      semester: seed.semester,
      cgpa: seed.cgpa,
      college: COLLEGE_NAME,
      batch: seed.batch,
      backlogs: seed.backlogs,
    },
    profile,
    skills,
    profileCompletion,
    assessmentCompleted: false,
    lastAssessmentAt: null,
    readiness: computeReadiness(skills, seed.cgpa, false, profileCompletion),
  };
}

export function seedStudents(): Student[] {
  return STUDENT_SEEDS.map(buildStudent);
}

/* ------------------------------------------------------------------ */
/* Companies                                                           */
/* ------------------------------------------------------------------ */

export function seedCompanies(): Company[] {
  return [
    {
      id: "CMP001",
      name: "TECHNOVA",
      industry: "Product engineering",
      location: "Bengaluru",
      about:
        "Builds logistics and retail software for mid-market Indian businesses. Hires 40–60 interns a year, mostly into product teams.",
      website: "technova.example.com",
      email: "hiring@technova.example.com",
    },
    {
      id: "CMP002",
      name: "NEURASOFT",
      industry: "Applied AI",
      location: "Hyderabad",
      about: "Applied machine learning studio working on document and vision pipelines.",
      website: "neurasoft.example.com",
      email: "campus@neurasoft.example.com",
    },
    {
      id: "CMP003",
      name: "CLOUDNEST",
      industry: "Cloud infrastructure",
      location: "Pune",
      about: "Managed cloud platform and developer tooling for regulated industries.",
      website: "cloudnest.example.com",
      email: "talent@cloudnest.example.com",
    },
  ];
}

/* ------------------------------------------------------------------ */
/* Jobs                                                                */
/* ------------------------------------------------------------------ */

export function seedJobs(): Job[] {
  return [
    {
      id: "JOB001",
      title: "Frontend Developer Intern",
      companyId: "CMP001",
      companyName: "TECHNOVA",
      location: "Bengaluru",
      stipend: 25000,
      minCgpa: 7.0,
      description:
        "Work on the customer-facing order tracking app alongside two senior engineers. You will own small features end to end, from component to release.",
      requiredSkills: [
        { skill: "React", requiredScore: 70, weight: 3 },
        { skill: "JavaScript", requiredScore: 68, weight: 3 },
        { skill: "Communication", requiredScore: 55, weight: 1 },
        { skill: "Cloud", requiredScore: 40, weight: 1 },
      ],
      openings: 4,
      postedAt: "2026-08-02T06:00:00.000Z",
      active: true,
    },
    {
      id: "JOB002",
      title: "Data Analyst Intern",
      companyId: "CMP001",
      companyName: "TECHNOVA",
      location: "Bengaluru",
      stipend: 22000,
      minCgpa: 7.5,
      description:
        "Support the retail analytics team with SQL models, weekly reporting and ad-hoc analysis for category managers.",
      requiredSkills: [
        { skill: "SQL", requiredScore: 80, weight: 3 },
        { skill: "Python", requiredScore: 78, weight: 3 },
        { skill: "Communication", requiredScore: 62, weight: 2 },
        { skill: "Machine Learning", requiredScore: 60, weight: 2 },
      ],
      openings: 3,
      postedAt: "2026-08-05T06:00:00.000Z",
      active: true,
    },
    {
      id: "JOB003",
      title: "Software Engineer Intern",
      companyId: "CMP001",
      companyName: "TECHNOVA",
      location: "Bengaluru",
      stipend: 28000,
      minCgpa: 7.5,
      description:
        "Backend-leaning generalist role on the fulfilment platform. Expect data structures, service work and a lot of code review.",
      requiredSkills: [
        { skill: "DSA", requiredScore: 82, weight: 3 },
        { skill: "Python", requiredScore: 75, weight: 2 },
        { skill: "JavaScript", requiredScore: 72, weight: 2 },
        { skill: "SQL", requiredScore: 60, weight: 1 },
        { skill: "Communication", requiredScore: 65, weight: 1 },
      ],
      openings: 5,
      postedAt: "2026-07-28T06:00:00.000Z",
      active: true,
    },
    {
      id: "JOB004",
      title: "AI/ML Engineering Intern",
      companyId: "CMP002",
      companyName: "NEURASOFT",
      location: "Hyderabad",
      stipend: 30000,
      minCgpa: 8.0,
      description:
        "Train and evaluate document extraction models, then help ship them behind a serving API.",
      requiredSkills: [
        { skill: "Python", requiredScore: 82, weight: 3 },
        { skill: "Machine Learning", requiredScore: 70, weight: 3 },
        { skill: "DSA", requiredScore: 72, weight: 2 },
        { skill: "SQL", requiredScore: 60, weight: 1 },
        { skill: "Cloud", requiredScore: 55, weight: 1 },
      ],
      openings: 2,
      postedAt: "2026-08-08T06:00:00.000Z",
      active: true,
    },
    {
      id: "JOB005",
      title: "Backend Developer Intern",
      companyId: "CMP003",
      companyName: "CLOUDNEST",
      location: "Pune",
      stipend: 26000,
      minCgpa: 7.0,
      description:
        "Build and operate internal APIs on the managed platform team, including on-call shadowing in the final month.",
      requiredSkills: [
        { skill: "Python", requiredScore: 80, weight: 3 },
        { skill: "SQL", requiredScore: 72, weight: 2 },
        { skill: "DSA", requiredScore: 72, weight: 2 },
        { skill: "Cloud", requiredScore: 60, weight: 2 },
        { skill: "Communication", requiredScore: 55, weight: 1 },
      ],
      openings: 3,
      postedAt: "2026-08-01T06:00:00.000Z",
      active: true,
    },
    {
      id: "JOB006",
      title: "QA Automation Intern",
      companyId: "CMP001",
      companyName: "TECHNOVA",
      location: "Bengaluru",
      stipend: 18000,
      minCgpa: 6.5,
      description:
        "Write and maintain the regression suite for the merchant dashboard, and triage failures with the release team.",
      requiredSkills: [
        { skill: "JavaScript", requiredScore: 68, weight: 3 },
        { skill: "Communication", requiredScore: 72, weight: 2 },
        { skill: "SQL", requiredScore: 62, weight: 2 },
        { skill: "DSA", requiredScore: 58, weight: 1 },
      ],
      openings: 2,
      postedAt: "2026-08-10T06:00:00.000Z",
      active: true,
    },
  ];
}

/* ------------------------------------------------------------------ */
/* Assessment                                                          */
/* ------------------------------------------------------------------ */

export interface SeededQuestion {
  id: string;
  skill: AssessedSkill;
  prompt: string;
  options: TestOption[];
  correctOptionId: string;
}

/** 12 questions, two per assessed skill. The answer key never leaves this module. */
export const TEST_QUESTIONS: SeededQuestion[] = [
  {
    id: "Q01",
    skill: "SQL",
    prompt: "Which clause filters rows after GROUP BY has aggregated them?",
    options: [
      { id: "a", text: "WHERE" },
      { id: "b", text: "HAVING" },
      { id: "c", text: "ORDER BY" },
      { id: "d", text: "DISTINCT" },
    ],
    correctOptionId: "b",
  },
  {
    id: "Q02",
    skill: "SQL",
    prompt: "What does an INNER JOIN return?",
    options: [
      { id: "a", text: "Every row from the left table, matched or not" },
      { id: "b", text: "Only rows with a matching key in both tables" },
      { id: "c", text: "Every row from both tables" },
      { id: "d", text: "Rows that exist in one table but not the other" },
    ],
    correctOptionId: "b",
  },
  {
    id: "Q03",
    skill: "Python",
    prompt: 'What is the value of len({"a": 1, "b": 2, "a": 3})?',
    options: [
      { id: "a", text: "1" },
      { id: "b", text: "2" },
      { id: "c", text: "3" },
      { id: "d", text: "It raises a KeyError" },
    ],
    correctOptionId: "b",
  },
  {
    id: "Q04",
    skill: "Python",
    prompt: "Which of these built-in types can be modified after creation?",
    options: [
      { id: "a", text: "tuple" },
      { id: "b", text: "str" },
      { id: "c", text: "list" },
      { id: "d", text: "frozenset" },
    ],
    correctOptionId: "c",
  },
  {
    id: "Q05",
    skill: "React",
    prompt: "Which hook holds state that persists between renders of a function component?",
    options: [
      { id: "a", text: "useEffect" },
      { id: "b", text: "useMemo" },
      { id: "c", text: "useState" },
      { id: "d", text: "useContext" },
    ],
    correctOptionId: "c",
  },
  {
    id: "Q06",
    skill: "React",
    prompt: "Why does React ask for a key on each item in a rendered list?",
    options: [
      { id: "a", text: "To sort the list automatically" },
      { id: "b", text: "To identify which items changed between renders" },
      { id: "c", text: "To make each item focusable" },
      { id: "d", text: "To cache the item in local storage" },
    ],
    correctOptionId: "b",
  },
  {
    id: "Q07",
    skill: "JavaScript",
    prompt: "What does typeof null evaluate to?",
    options: [
      { id: "a", text: '"null"' },
      { id: "b", text: '"undefined"' },
      { id: "c", text: '"object"' },
      { id: "d", text: '"boolean"' },
    ],
    correctOptionId: "c",
  },
  {
    id: "Q08",
    skill: "JavaScript",
    prompt: "How does let differ from var?",
    options: [
      { id: "a", text: "let is scoped to the enclosing block, var to the function" },
      { id: "b", text: "let cannot be reassigned" },
      { id: "c", text: "let is only valid inside modules" },
      { id: "d", text: "There is no difference" },
    ],
    correctOptionId: "a",
  },
  {
    id: "Q09",
    skill: "DSA",
    prompt: "What is the average time complexity of binary search on a sorted array?",
    options: [
      { id: "a", text: "O(1)" },
      { id: "b", text: "O(log n)" },
      { id: "c", text: "O(n)" },
      { id: "d", text: "O(n log n)" },
    ],
    correctOptionId: "b",
  },
  {
    id: "Q10",
    skill: "DSA",
    prompt: "Which structure removes elements in the order they were added?",
    options: [
      { id: "a", text: "Stack" },
      { id: "b", text: "Queue" },
      { id: "c", text: "Binary heap" },
      { id: "d", text: "Hash table" },
    ],
    correctOptionId: "b",
  },
  {
    id: "Q11",
    skill: "Communication",
    prompt: "You are two days from a deadline you will miss. What do you tell your manager first?",
    options: [
      { id: "a", text: "Nothing yet — wait until the deadline passes" },
      { id: "b", text: "The revised date, the reason, and what you need to hit it" },
      { id: "c", text: "A detailed log of everything you worked on" },
      { id: "d", text: "That it is on track, then catch up over the weekend" },
    ],
    correctOptionId: "b",
  },
  {
    id: "Q12",
    skill: "Communication",
    prompt: "What makes a daily standup update useful to the rest of the team?",
    options: [
      { id: "a", text: "A full walkthrough of the code you wrote" },
      { id: "b", text: "What you finished, what is next, and what is blocking you" },
      { id: "c", text: "How many hours you spent" },
      { id: "d", text: "Only the problems, so the team can help" },
    ],
    correctOptionId: "b",
  },
];

/* ------------------------------------------------------------------ */
/* Applications                                                        */
/* ------------------------------------------------------------------ */

const STATUS_NOTES: Record<ApplicationStatus, string> = {
  APPLIED: "Application received",
  SHORTLISTED: "Shortlisted by the hiring team",
  INTERVIEW: "Interview scheduled",
  SELECTED: "Offer extended",
  REJECTED: "Not moving forward",
};

const STATUS_ORDER: ApplicationStatus[] = ["APPLIED", "SHORTLISTED", "INTERVIEW", "SELECTED"];

export function statusNote(status: ApplicationStatus): string {
  return STATUS_NOTES[status];
}

/** Builds the event history a seeded application would have accumulated. */
function seedTimeline(status: ApplicationStatus, appliedAt: string): ApplicationEvent[] {
  const start = new Date(appliedAt).getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  const reached: ApplicationStatus[] =
    status === "REJECTED"
      ? ["APPLIED", "SHORTLISTED"]
      : STATUS_ORDER.slice(0, STATUS_ORDER.indexOf(status) + 1);

  const events: ApplicationEvent[] = reached.map((s, index) => ({
    status: s,
    at: new Date(start + index * 2 * dayMs).toISOString(),
    note: STATUS_NOTES[s],
  }));

  if (status === "REJECTED") {
    events.push({
      status: "REJECTED",
      at: new Date(start + reached.length * 2 * dayMs).toISOString(),
      note: STATUS_NOTES.REJECTED,
    });
  }

  return events;
}

interface ApplicationSeed {
  id: string;
  studentId: string;
  jobId: string;
  status: ApplicationStatus;
  appliedAt: string;
}

const APPLICATION_SEEDS: ApplicationSeed[] = [
  { id: "APP1001", studentId: "STU005", jobId: "JOB003", status: "SELECTED", appliedAt: "2026-07-29T05:00:00.000Z" },
  { id: "APP1002", studentId: "STU002", jobId: "JOB001", status: "INTERVIEW", appliedAt: "2026-08-03T05:00:00.000Z" },
  { id: "APP1003", studentId: "STU008", jobId: "JOB002", status: "SHORTLISTED", appliedAt: "2026-08-06T05:00:00.000Z" },
  { id: "APP1004", studentId: "STU010", jobId: "JOB001", status: "SHORTLISTED", appliedAt: "2026-08-04T05:00:00.000Z" },
  { id: "APP1005", studentId: "STU003", jobId: "JOB006", status: "APPLIED", appliedAt: "2026-08-11T05:00:00.000Z" },
  { id: "APP1006", studentId: "STU007", jobId: "JOB003", status: "APPLIED", appliedAt: "2026-08-09T05:00:00.000Z" },
  { id: "APP1007", studentId: "STU006", jobId: "JOB002", status: "REJECTED", appliedAt: "2026-08-06T05:00:00.000Z" },
  { id: "APP1008", studentId: "STU004", jobId: "JOB005", status: "APPLIED", appliedAt: "2026-08-07T05:00:00.000Z" },
  { id: "APP1009", studentId: "STU012", jobId: "JOB006", status: "APPLIED", appliedAt: "2026-08-12T05:00:00.000Z" },
  { id: "APP1010", studentId: "STU011", jobId: "JOB001", status: "REJECTED", appliedAt: "2026-08-05T05:00:00.000Z" },
];

export function seedApplications(students: Student[], jobs: Job[]): Application[] {
  return APPLICATION_SEEDS.flatMap((seed) => {
    const student = students.find((s) => s.id === seed.studentId);
    const job = jobs.find((j) => j.id === seed.jobId);
    if (!student || !job) return [];

    const timeline = seedTimeline(seed.status, seed.appliedAt);

    return [
      {
        id: seed.id,
        studentId: student.id,
        studentName: student.name,
        jobId: job.id,
        jobTitle: job.title,
        companyId: job.companyId,
        companyName: job.companyName,
        location: job.location,
        stipend: job.stipend,
        matchScore: 0, // recomputed live against current skill scores
        status: seed.status,
        appliedAt: seed.appliedAt,
        updatedAt: timeline[timeline.length - 1].at,
        timeline,
      },
    ];
  });
}

/* ------------------------------------------------------------------ */
/* Industry demand (external market data for the TPO analytics)        */
/* ------------------------------------------------------------------ */

export const INDUSTRY_DEMAND: Record<string, Record<SkillName, number>> = {
  CSE: {
    Python: 78,
    SQL: 70,
    React: 72,
    JavaScript: 74,
    DSA: 80,
    Communication: 68,
    Cloud: 66,
    "Machine Learning": 70,
  },
  IT: {
    Python: 70,
    SQL: 76,
    React: 74,
    JavaScript: 76,
    DSA: 68,
    Communication: 72,
    Cloud: 68,
    "Machine Learning": 60,
  },
  ECE: {
    Python: 72,
    SQL: 60,
    React: 55,
    JavaScript: 58,
    DSA: 70,
    Communication: 74,
    Cloud: 62,
    "Machine Learning": 64,
  },
};

export const DEPARTMENTS = Object.keys(INDUSTRY_DEMAND);

/* ------------------------------------------------------------------ */
/* Sign-in                                                             */
/* ------------------------------------------------------------------ */

/**
 * Demo accounts share one password, shown on the sign-in screen. This stands in
 * for real authentication, which belongs on the backend — see the README.
 */
export const DEMO_PASSWORD = "demo1234";

export function seedTpo(): TpoProfile {
  return {
    id: PRIMARY_TPO_ID,
    name: "Meera Krishnan",
    email: "tpo@srit.edu.in",
    college: COLLEGE_NAME,
    title: "Training & Placement Officer",
  };
}
