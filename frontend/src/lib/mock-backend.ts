/**
 * SkillBridge — mock backend.
 *
 * Holds the mutable demo state and implements every endpoint the API client
 * exposes. This is what makes the demo work end to end with no FastAPI server
 * running: the student's test result, their application, and the company's
 * shortlist decision all mutate one shared store, and every screen reads from
 * it. State survives a page reload via localStorage.
 */

import {
  buildJobMatch,
  compareSkills,
  computeReadiness,
  levelFor,
  matchScoreFor,
  profileCompletionFor,
  rankCandidates,
  scoreOf,
  severityFor,
  strongestAndWeakest,
  updatedSkillScore,
} from "./matching";
import {
  COLLEGE_NAME,
  DEMO_PASSWORD,
  DEPARTMENTS,
  INDUSTRY_DEMAND,
  PRIMARY_COMPANY_ID,
  PRIMARY_TPO_ID,
  TEST_QUESTIONS,
  TRACKED_SKILLS,
  seedApplications,
  seedCompanies,
  seedJobs,
  seedStudents,
  seedTpo,
  statusNote,
} from "./mock-data";
import type {
  Application,
  ApplicationStatus,
  ApplyResponse,
  AssessedSkill,
  Candidate,
  Company,
  CompanyDashboard,
  DemoAccount,
  DepartmentPlacement,
  FunnelStage,
  HealthResponse,
  Job,
  JobCreateInput,
  JobCreateResponse,
  JobMatch,
  SkillGap,
  SkillGapStudent,
  SkillScore,
  StatusUpdateResponse,
  Student,
  StudentProfileUpdate,
  TestQuestion,
  TestResult,
  TestSkillResult,
  TestSubmission,
  TpoDashboard,
  TpoProfile,
  SignInResponse,
  Role,
} from "./types";

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

interface DemoDb {
  students: Student[];
  companies: Company[];
  jobs: Job[];
  applications: Application[];
  testResults: Record<string, TestResult>;
  sequence: number;
}

const STORAGE_KEY = "skillbridge.demo.v2";

function seedDb(): DemoDb {
  const students = seedStudents();
  const jobs = seedJobs();
  return {
    students,
    companies: seedCompanies(),
    jobs,
    applications: seedApplications(students, jobs),
    testResults: {},
    sequence: 2000,
  };
}

let db: DemoDb = seedDb();
let hydrated = false;

/* --- reactivity ---------------------------------------------------- */

let revision = 0;
const listeners = new Set<() => void>();

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getRevision(): number {
  return revision;
}

/** Call after any mutation so every mounted screen refetches. */
export function bumpRevision(): void {
  revision += 1;
  listeners.forEach((listener) => listener());
}

/* --- persistence --------------------------------------------------- */

function persist(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // Storage full or blocked — the demo still works for this session.
  }
}

/** Restores saved demo state. Safe to call repeatedly; only runs once. */
export function hydrate(): void {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as DemoDb;
    if (parsed && Array.isArray(parsed.students) && parsed.students.length > 0) {
      db = parsed;
      bumpRevision();
    }
  } catch {
    // Corrupt payload — fall back to the seeded dataset.
  }
}

/** Wipes saved state and returns to the seeded dataset. */
export function resetDemo(): void {
  db = seedDb();
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
  bumpRevision();
}

function commit(): void {
  persist();
  bumpRevision();
}

function nextId(prefix: string): string {
  db.sequence += 1;
  return `${prefix}${db.sequence}`;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/* ------------------------------------------------------------------ */
/* Lookups                                                             */
/* ------------------------------------------------------------------ */

function requireStudent(studentId: string): Student {
  const student = db.students.find((s) => s.id === studentId);
  if (!student) throw new Error(`Student ${studentId} not found`);
  return student;
}

function requireJob(jobId: string): Job {
  const job = db.jobs.find((j) => j.id === jobId);
  if (!job) throw new Error(`Job ${jobId} not found`);
  return job;
}

function requireApplication(applicationId: string): Application {
  const application = db.applications.find((a) => a.id === applicationId);
  if (!application) throw new Error(`Application ${applicationId} not found`);
  return application;
}

/** Match score recomputed against current skill scores, never stored stale. */
function liveMatchScore(job: Job, student: Student): number {
  return matchScoreFor(compareSkills(job, student.skills), student.academics.cgpa >= job.minCgpa);
}

function withLiveScore(application: Application): Application {
  const job = db.jobs.find((j) => j.id === application.jobId);
  const student = db.students.find((s) => s.id === application.studentId);
  if (!job || !student) return clone(application);
  return { ...clone(application), matchScore: liveMatchScore(job, student) };
}

/* ------------------------------------------------------------------ */
/* Health                                                              */
/* ------------------------------------------------------------------ */

export function getHealth(): HealthResponse {
  return { status: "ok", service: "skillbridge-mock", version: "0.1.0" };
}

/* ------------------------------------------------------------------ */
/* Student                                                             */
/* ------------------------------------------------------------------ */

export function getStudent(studentId: string): Student {
  return clone(requireStudent(studentId));
}

export function patchStudentProfile(
  studentId: string,
  update: StudentProfileUpdate,
): Student {
  const student = requireStudent(studentId);

  student.profile = {
    projects: update.projects ?? student.profile.projects,
    preferredCity: update.preferredCity ?? student.profile.preferredCity,
    expectedStipend: update.expectedStipend ?? student.profile.expectedStipend,
  };
  student.profileCompletion = profileCompletionFor(student);
  student.readiness = computeReadiness(
    student.skills,
    student.academics.cgpa,
    student.assessmentCompleted,
    student.profileCompletion,
  );

  commit();
  return clone(student);
}

export function getSkillProfile(studentId: string): SkillScore[] {
  return clone(requireStudent(studentId).skills);
}

/* ------------------------------------------------------------------ */
/* Assessment                                                          */
/* ------------------------------------------------------------------ */

export function getTestQuestions(): TestQuestion[] {
  return TEST_QUESTIONS.map(({ id, skill, prompt, options }) => ({
    id,
    skill,
    prompt,
    options: clone(options),
  }));
}

export function submitTest(submission: TestSubmission): TestResult {
  const student = requireStudent(submission.studentId);
  const answered = new Map(submission.answers.map((a) => [a.questionId, a.optionId]));

  const bySkill = new Map<AssessedSkill, { correct: number; total: number }>();
  let correctCount = 0;

  for (const question of TEST_QUESTIONS) {
    const bucket = bySkill.get(question.skill) ?? { correct: 0, total: 0 };
    bucket.total += 1;
    if (answered.get(question.id) === question.correctOptionId) {
      bucket.correct += 1;
      correctCount += 1;
    }
    bySkill.set(question.skill, bucket);
  }

  const submittedAt = new Date().toISOString();
  const skillResults: TestSkillResult[] = [];

  bySkill.forEach((bucket, skill) => {
    const previousScore = scoreOf(student.skills, skill);
    const score = updatedSkillScore(previousScore, bucket.correct, bucket.total);

    skillResults.push({
      skill,
      correct: bucket.correct,
      total: bucket.total,
      score,
      previousScore,
      delta: score - previousScore,
    });

    const existing = student.skills.find((s) => s.skill === skill);
    if (existing) {
      existing.score = score;
      existing.level = levelFor(score);
      existing.source = "Assessment";
      existing.updatedAt = submittedAt;
    } else {
      student.skills.push({
        skill,
        score,
        level: levelFor(score),
        source: "Assessment",
        updatedAt: submittedAt,
      });
    }
  });

  student.assessmentCompleted = true;
  student.lastAssessmentAt = submittedAt;
  student.profileCompletion = profileCompletionFor(student);
  student.readiness = computeReadiness(
    student.skills,
    student.academics.cgpa,
    true,
    student.profileCompletion,
  );

  const { strongest, weakest } = strongestAndWeakest(
    skillResults.map((r) => ({ skill: r.skill, score: r.score })),
  );

  const result: TestResult = {
    submissionId: nextId("SUB"),
    studentId: student.id,
    submittedAt,
    overallScore: Math.round((correctCount / TEST_QUESTIONS.length) * 100),
    correctCount,
    totalQuestions: TEST_QUESTIONS.length,
    skillResults: skillResults.sort((a, b) => b.score - a.score),
    strongest,
    weakest,
    readiness: student.readiness,
  };

  db.testResults[student.id] = result;
  commit();
  return clone(result);
}

export function getLastTestResult(studentId: string): TestResult | null {
  const result = db.testResults?.[studentId];
  return result ? clone(result) : null;
}

/* ------------------------------------------------------------------ */
/* Matches & applications                                              */
/* ------------------------------------------------------------------ */

export function getMatches(studentId: string): JobMatch[] {
  const student = requireStudent(studentId);

  return db.jobs
    .filter((job) => job.active)
    .map((job) => {
      const application = db.applications.find(
        (a) => a.studentId === studentId && a.jobId === job.id,
      );
      return buildJobMatch(clone(job), student, Boolean(application), application?.id ?? null);
    })
    .sort((a, b) => b.matchScore - a.matchScore);
}

export function getMatch(studentId: string, jobId: string): JobMatch {
  const student = requireStudent(studentId);
  const job = requireJob(jobId);
  const application = db.applications.find(
    (a) => a.studentId === studentId && a.jobId === jobId,
  );
  return buildJobMatch(clone(job), student, Boolean(application), application?.id ?? null);
}

export function applyToJob(jobId: string, studentId: string): ApplyResponse {
  const student = requireStudent(studentId);
  const job = requireJob(jobId);

  const existing = db.applications.find(
    (a) => a.studentId === studentId && a.jobId === jobId,
  );
  if (existing) {
    return {
      application: withLiveScore(existing),
      message: `You already applied to ${job.title} on ${new Date(
        existing.appliedAt,
      ).toLocaleDateString("en-IN")}.`,
    };
  }

  const now = new Date().toISOString();
  const application: Application = {
    id: nextId("APP"),
    studentId: student.id,
    studentName: student.name,
    jobId: job.id,
    jobTitle: job.title,
    companyId: job.companyId,
    companyName: job.companyName,
    location: job.location,
    stipend: job.stipend,
    matchScore: liveMatchScore(job, student),
    status: "APPLIED",
    appliedAt: now,
    updatedAt: now,
    timeline: [{ status: "APPLIED", at: now, note: statusNote("APPLIED") }],
  };

  db.applications.push(application);
  commit();

  return {
    application: clone(application),
    message: `Applied to ${job.title} at ${job.companyName}.`,
  };
}

export function getApplications(studentId: string): Application[] {
  return db.applications
    .filter((a) => a.studentId === studentId)
    .map(withLiveScore)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function updateApplicationStatus(
  applicationId: string,
  status: ApplicationStatus,
): StatusUpdateResponse {
  const application = requireApplication(applicationId);

  if (application.status === status) {
    return {
      application: withLiveScore(application),
      message: `${application.studentName} is already marked ${status.toLowerCase()}.`,
    };
  }

  const now = new Date().toISOString();
  application.status = status;
  application.updatedAt = now;
  application.timeline.push({ status, at: now, note: statusNote(status) });

  commit();

  return {
    application: withLiveScore(application),
    message: `${application.studentName} moved to ${status.toLowerCase()}.`,
  };
}

/* ------------------------------------------------------------------ */
/* Company                                                             */
/* ------------------------------------------------------------------ */

export function getJob(jobId: string): Job {
  return clone(requireJob(jobId));
}

export function getCompanyDashboard(companyId: string): CompanyDashboard {
  const company = db.companies.find((c) => c.id === companyId);
  if (!company) throw new Error(`Company ${companyId} not found`);

  const jobs = db.jobs.filter((j) => j.companyId === companyId);
  const jobIds = new Set(jobs.map((j) => j.id));
  const applications = db.applications.filter((a) => jobIds.has(a.jobId));

  const reached = (application: Application, status: ApplicationStatus): boolean =>
    application.timeline.some((event) => event.status === status);

  return {
    company: clone(company),
    kpis: {
      activeJobs: jobs.filter((j) => j.active).length,
      applications: applications.length,
      shortlisted: applications.filter((a) => reached(a, "SHORTLISTED")).length,
      selected: applications.filter((a) => reached(a, "SELECTED")).length,
    },
    recentJobs: clone(
      [...jobs].sort(
        (a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime(),
      ),
    ),
    recentApplicants: applications
      .map(withLiveScore)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 6),
  };
}

export function createJob(input: JobCreateInput, companyId: string): JobCreateResponse {
  const company = db.companies.find((c) => c.id === companyId);
  if (!company) throw new Error(`Company ${companyId} not found`);

  const job: Job = {
    id: nextId("JOB"),
    title: input.title,
    companyId: company.id,
    companyName: company.name,
    location: input.location,
    stipend: input.stipend,
    minCgpa: input.minCgpa,
    description: input.description,
    requiredSkills: input.requiredSkills,
    openings: input.openings,
    postedAt: new Date().toISOString(),
    active: true,
  };

  db.jobs.push(job);
  commit();

  return { job: clone(job), message: `${job.title} is now live.` };
}

export function getMatchedStudents(jobId: string): Candidate[] {
  const job = requireJob(jobId);

  return rankCandidates(job, db.students, (studentId) => {
    const application = db.applications.find(
      (a) => a.studentId === studentId && a.jobId === jobId,
    );
    return application
      ? { status: application.status, applicationId: application.id }
      : null;
  });
}

/* ------------------------------------------------------------------ */
/* TPO                                                                 */
/* ------------------------------------------------------------------ */

function reachedStage(application: Application, status: ApplicationStatus): boolean {
  return application.timeline.some((event) => event.status === status);
}

export function getTpoDashboard(): TpoDashboard {
  const applications = db.applications;

  const shortlisted = applications.filter((a) => reachedStage(a, "SHORTLISTED")).length;
  const interviewed = applications.filter((a) => reachedStage(a, "INTERVIEW")).length;
  const selected = applications.filter((a) => reachedStage(a, "SELECTED")).length;

  const funnel: FunnelStage[] = [
    { stage: "Students", count: db.students.length },
    { stage: "Applications", count: applications.length },
    { stage: "Shortlisted", count: shortlisted },
    { stage: "Interview", count: interviewed },
    { stage: "Selected", count: selected },
  ];

  const departments: DepartmentPlacement[] = DEPARTMENTS.map((department) => {
    const studentIds = new Set(
      db.students.filter((s) => s.academics.department === department).map((s) => s.id),
    );
    const deptApplications = applications.filter((a) => studentIds.has(a.studentId));
    const placed = new Set(
      deptApplications.filter((a) => reachedStage(a, "SELECTED")).map((a) => a.studentId),
    ).size;

    return {
      department,
      students: studentIds.size,
      applications: deptApplications.length,
      selected: placed,
      placementRate: studentIds.size === 0 ? 0 : Math.round((placed / studentIds.size) * 100),
    };
  });

  const topRecruiters = db.companies
    .map((company) => ({
      company: company.name,
      selected: applications.filter(
        (a) => a.companyId === company.id && reachedStage(a, "SELECTED"),
      ).length,
    }))
    .sort((a, b) => b.selected - a.selected);

  return {
    tpoId: PRIMARY_TPO_ID,
    college: COLLEGE_NAME,
    kpis: {
      totalStudents: db.students.length,
      companies: db.companies.length,
      activeJobs: db.jobs.filter((j) => j.active).length,
      applications: applications.length,
      shortlisted,
      selected,
    },
    funnel,
    departments,
    topRecruiters,
  };
}

function demandFor(department: string, skill: string): number {
  return INDUSTRY_DEMAND[department]?.[skill] ?? 0;
}

export function getSkillGaps(): SkillGap[] {
  const rows: SkillGap[] = [];

  for (const department of DEPARTMENTS) {
    const cohort = db.students.filter((s) => s.academics.department === department);
    if (cohort.length === 0) continue;

    for (const skill of TRACKED_SKILLS) {
      const demand = demandFor(department, skill);
      const scores = cohort.map((s) => scoreOf(s.skills, skill));
      const average = Math.round(scores.reduce((sum, v) => sum + v, 0) / scores.length);
      const gap = Math.max(0, demand - average);

      rows.push({
        department,
        skill,
        industryDemand: demand,
        studentAverage: average,
        gap,
        severity: severityFor(gap),
        studentsBelowBar: scores.filter((score) => score < demand).length,
        openRoles: db.jobs.filter(
          (job) => job.active && job.requiredSkills.some((r) => r.skill === skill),
        ).length,
      });
    }
  }

  return rows.sort((a, b) => b.gap - a.gap);
}

export function getSkillGapStudents(skill: string, department?: string): SkillGapStudent[] {
  return db.students
    .filter((s) => !department || department === "ALL" || s.academics.department === department)
    .map((student) => {
      const target = demandFor(student.academics.department, skill);
      const score = scoreOf(student.skills, skill);
      return {
        studentId: student.id,
        name: student.name,
        department: student.academics.department,
        semester: student.academics.semester,
        cgpa: student.academics.cgpa,
        score,
        target,
        gap: Math.max(0, target - score),
      };
    })
    .filter((row) => row.gap > 0)
    .sort((a, b) => b.gap - a.gap);
}

/* ------------------------------------------------------------------ */
/* Misc                                                                */
/* ------------------------------------------------------------------ */

export function getCompany(companyId: string = PRIMARY_COMPANY_ID): Company {
  const company = db.companies.find((c) => c.id === companyId);
  if (!company) throw new Error(`Company ${companyId} not found`);
  return clone(company);
}

export function getJobs(companyId?: string): Job[] {
  return clone(companyId ? db.jobs.filter((j) => j.companyId === companyId) : db.jobs);
}


/* ------------------------------------------------------------------ */
/* Sign-in                                                             */
/* ------------------------------------------------------------------ */

export function getTpoProfile(): TpoProfile {
  return seedTpo();
}

/** Every identity that can sign in, for the account picker. */
export function listAccounts(role?: Role): DemoAccount[] {
  const students: DemoAccount[] = db.students.map((student) => ({
    id: student.id,
    role: "student" as Role,
    name: student.name,
    email: student.email,
    detail: `${student.academics.department} · Semester ${student.academics.semester} · CGPA ${student.academics.cgpa.toFixed(1)}`,
  }));

  const companies: DemoAccount[] = db.companies.map((company) => ({
    id: company.id,
    role: "company" as Role,
    name: company.name,
    email: company.email,
    detail: `${company.industry} · ${company.location}`,
  }));

  const tpo = seedTpo();
  const officers: DemoAccount[] = [
    {
      id: tpo.id,
      role: "tpo",
      name: tpo.name,
      email: tpo.email,
      detail: `${tpo.title} · ${tpo.college}`,
    },
  ];

  const all = [...students, ...companies, ...officers];
  return role ? all.filter((account) => account.role === role) : all;
}

export function signIn(role: Role, email: string, password: string): SignInResponse {
  const account = listAccounts(role).find(
    (candidate) => candidate.email.toLowerCase() === email.trim().toLowerCase(),
  );

  if (!account) {
    throw new Error("No account found with that email address for this role.");
  }
  if (password !== DEMO_PASSWORD) {
    throw new Error("That password is incorrect.");
  }

  return { account, token: `demo-${account.id}-${Date.now()}` };
}
