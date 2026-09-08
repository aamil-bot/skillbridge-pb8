/**
 * SkillBridge — centralized domain types.
 *
 * Every page, component and API function imports from here. Nothing in the app
 * should redeclare these shapes locally.
 */

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

export type ApplicationStatus =
  | "APPLIED"
  | "SHORTLISTED"
  | "INTERVIEW"
  | "SELECTED"
  | "REJECTED";

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  "APPLIED",
  "SHORTLISTED",
  "INTERVIEW",
  "SELECTED",
  "REJECTED",
];

/** The six skills covered by the assessment. */
export type AssessedSkill =
  | "SQL"
  | "Python"
  | "React"
  | "JavaScript"
  | "DSA"
  | "Communication";

export const ASSESSED_SKILLS: AssessedSkill[] = [
  "SQL",
  "Python",
  "React",
  "JavaScript",
  "DSA",
  "Communication",
];

/**
 * Jobs may require skills outside the assessed six (TensorFlow, AWS, ...).
 * Those resolve to a score of 0 and surface as gaps.
 */
export type SkillName = string;

export type SkillLevel = "Beginner" | "Developing" | "Proficient" | "Advanced";

export type SkillSource = "Assessment" | "College record" | "Self reported";

export type SkillStatus = "STRENGTH" | "MET" | "GAP";

export type GapSeverity = "CRITICAL" | "MODERATE" | "HEALTHY";

export type Role = "student" | "company" | "tpo";

/** Where a piece of data came from, so the UI can show a mock badge. */
export type DataSource = "api" | "mock";

/* ------------------------------------------------------------------ */
/* Student                                                             */
/* ------------------------------------------------------------------ */

export interface Project {
  id: string;
  title: string;
  description: string;
  techStack: string[];
}

/** The part of a student record the student is allowed to change. */
export interface StudentProfile {
  projects: Project[];
  preferredCity: string;
  expectedStipend: number;
}

/** College-owned fields. Read-only in the student UI. */
export interface AcademicRecord {
  registrationNumber: string;
  department: string;
  semester: number;
  cgpa: number;
  college: string;
  batch: string;
  backlogs: number;
}

export interface SkillScore {
  skill: SkillName;
  score: number;
  level: SkillLevel;
  source: SkillSource;
  updatedAt: string;
}

export interface CareerReadiness {
  score: number;
  label: string;
  summary: string;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  phone: string;
  academics: AcademicRecord;
  profile: StudentProfile;
  skills: SkillScore[];
  profileCompletion: number;
  assessmentCompleted: boolean;
  lastAssessmentAt: string | null;
  readiness: CareerReadiness;
}

/** PATCH /students/{id}/profile body. */
export interface StudentProfileUpdate {
  preferredCity?: string;
  expectedStipend?: number;
  projects?: Project[];
}

/* ------------------------------------------------------------------ */
/* Assessment                                                          */
/* ------------------------------------------------------------------ */

export interface TestOption {
  id: string;
  text: string;
}

/** Delivered to the client without the answer key. */
export interface TestQuestion {
  id: string;
  skill: AssessedSkill;
  prompt: string;
  options: TestOption[];
}

export interface TestAnswer {
  questionId: string;
  optionId: string;
}

export interface TestSubmission {
  studentId: string;
  answers: TestAnswer[];
}

export interface TestSkillResult {
  skill: AssessedSkill;
  correct: number;
  total: number;
  score: number;
  previousScore: number;
  delta: number;
}

export interface TestResult {
  submissionId: string;
  studentId: string;
  submittedAt: string;
  overallScore: number;
  correctCount: number;
  totalQuestions: number;
  skillResults: TestSkillResult[];
  strongest: AssessedSkill[];
  weakest: AssessedSkill[];
  readiness: CareerReadiness;
}

/* ------------------------------------------------------------------ */
/* Jobs & matching                                                     */
/* ------------------------------------------------------------------ */

export interface JobSkill {
  skill: SkillName;
  requiredScore: number;
  /** Relative importance, 1–3. Drives the weighted match score. */
  weight: number;
}

export interface Job {
  id: string;
  title: string;
  companyId: string;
  companyName: string;
  location: string;
  stipend: number;
  minCgpa: number;
  description: string;
  requiredSkills: JobSkill[];
  openings: number;
  postedAt: string;
  active: boolean;
}

/** POST /company/jobs body. */
export interface JobCreateInput {
  title: string;
  location: string;
  stipend: number;
  minCgpa: number;
  description: string;
  openings: number;
  requiredSkills: JobSkill[];
}

export interface SkillComparison {
  skill: SkillName;
  studentScore: number;
  requiredScore: number;
  /** Positive when the student is short of the requirement. */
  gap: number;
  weight: number;
  status: SkillStatus;
}

export interface JobMatch {
  job: Job;
  matchScore: number;
  strengths: SkillName[];
  gaps: SkillName[];
  reason: string;
  comparisons: SkillComparison[];
  cgpaMet: boolean;
  applied: boolean;
  applicationId: string | null;
}

/* ------------------------------------------------------------------ */
/* Applications                                                        */
/* ------------------------------------------------------------------ */

export interface ApplicationEvent {
  status: ApplicationStatus;
  at: string;
  note: string;
}

export interface Application {
  id: string;
  studentId: string;
  studentName: string;
  jobId: string;
  jobTitle: string;
  companyId: string;
  companyName: string;
  location: string;
  stipend: number;
  matchScore: number;
  status: ApplicationStatus;
  appliedAt: string;
  updatedAt: string;
  timeline: ApplicationEvent[];
}

/* ------------------------------------------------------------------ */
/* Company                                                             */
/* ------------------------------------------------------------------ */

export interface Company {
  id: string;
  name: string;
  industry: string;
  location: string;
  about: string;
  website: string;
  email: string;
}

export interface TpoProfile {
  id: string;
  name: string;
  email: string;
  college: string;
  title: string;
}

export interface CompanyKpis {
  activeJobs: number;
  applications: number;
  shortlisted: number;
  selected: number;
}

export interface CompanyDashboard {
  company: Company;
  kpis: CompanyKpis;
  recentJobs: Job[];
  recentApplicants: Application[];
}

/** A student ranked against one specific job. */
export interface Candidate {
  studentId: string;
  name: string;
  department: string;
  semester: number;
  cgpa: number;
  college: string;
  matchScore: number;
  rank: number;
  strengths: SkillName[];
  gaps: SkillName[];
  comparisons: SkillComparison[];
  skills: SkillScore[];
  projects: Project[];
  reasons: string[];
  status: ApplicationStatus | null;
  applicationId: string | null;
  applied: boolean;
}

/* ------------------------------------------------------------------ */
/* TPO                                                                 */
/* ------------------------------------------------------------------ */

export interface TpoKpis {
  totalStudents: number;
  companies: number;
  activeJobs: number;
  applications: number;
  shortlisted: number;
  selected: number;
}

export interface FunnelStage {
  stage: string;
  count: number;
}

export interface DepartmentPlacement {
  department: string;
  students: number;
  applications: number;
  selected: number;
  placementRate: number;
}

export interface TpoDashboard {
  tpoId: string;
  college: string;
  kpis: TpoKpis;
  funnel: FunnelStage[];
  departments: DepartmentPlacement[];
  topRecruiters: { company: string; selected: number }[];
}

export interface SkillGap {
  department: string;
  skill: SkillName;
  industryDemand: number;
  studentAverage: number;
  gap: number;
  severity: GapSeverity;
  studentsBelowBar: number;
  openRoles: number;
}

export interface SkillGapStudent {
  studentId: string;
  name: string;
  department: string;
  semester: number;
  cgpa: number;
  score: number;
  target: number;
  gap: number;
}

/* ------------------------------------------------------------------ */
/* Sign-in                                                             */
/* ------------------------------------------------------------------ */

/** One selectable identity on the sign-in screen. */
export interface DemoAccount {
  id: string;
  role: Role;
  name: string;
  email: string;
  detail: string;
}

/** Who is signed in, as held by the session provider. */
export interface Session {
  role: Role;
  accountId: string;
  name: string;
  email: string;
  detail: string;
  signedInAt: string;
}

export interface SignInResponse {
  account: DemoAccount;
  token: string;
}

/* ------------------------------------------------------------------ */
/* API envelopes                                                       */
/* ------------------------------------------------------------------ */

export interface HealthResponse {
  status: "ok" | "degraded";
  service: string;
  version: string;
}

export interface ApplyResponse {
  application: Application;
  message: string;
}

export interface StatusUpdateResponse {
  application: Application;
  message: string;
}

export interface JobCreateResponse {
  job: Job;
  message: string;
}
