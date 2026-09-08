/**
 * SkillBridge — API client.
 *
 *   UI  →  api.ts  →  FastAPI backend  ─(unreachable)→  typed mocks
 *
 * No page calls fetch directly. Every function tries the real backend first and
 * falls back to the mock backend if the request fails, times out, or the
 * backend has already been marked unreachable this session. Switching to the
 * real backend needs no page changes — only a running server at
 * NEXT_PUBLIC_API_BASE_URL.
 */

import * as mock from "./mock-backend";
import { PRIMARY_COMPANY_ID } from "./mock-data";
import type {
  Application,
  ApplicationStatus,
  ApplyResponse,
  Candidate,
  Company,
  CompanyDashboard,
  DataSource,
  DemoAccount,
  HealthResponse,
  Job,
  JobCreateInput,
  JobCreateResponse,
  JobMatch,
  SkillGap,
  SkillGapStudent,
  SkillScore,
  Role,
  SignInResponse,
  StatusUpdateResponse,
  Student,
  StudentProfileUpdate,
  TestQuestion,
  TestResult,
  TestSubmission,
  TpoDashboard,
  TpoProfile,
} from "./types";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const FORCE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

/** Requests are abandoned after this long so the UI never hangs on a dead backend. */
const TIMEOUT_MS = 2500;

/** After a failure, stop hammering the backend for this long. */
const RETRY_AFTER_MS = 30_000;

/* ------------------------------------------------------------------ */
/* Connection state                                                    */
/* ------------------------------------------------------------------ */

let lastSource: DataSource = FORCE_MOCKS ? "mock" : "api";
let unreachableSince: number | null = FORCE_MOCKS ? Date.now() : null;

export function getDataSource(): DataSource {
  return lastSource;
}

export function isUsingMocks(): boolean {
  return lastSource === "mock";
}

function shouldSkipNetwork(): boolean {
  if (FORCE_MOCKS) return true;
  if (unreachableSince === null) return false;
  return Date.now() - unreachableSince < RETRY_AFTER_MS;
}

function markReachable(): void {
  unreachableSince = null;
  lastSource = "api";
}

function markUnreachable(): void {
  unreachableSince = Date.now();
  lastSource = "mock";
}

/* ------------------------------------------------------------------ */
/* Core request helper                                                 */
/* ------------------------------------------------------------------ */

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
  /** Mutating calls refresh every mounted screen after they resolve. */
  mutates?: boolean;
}

/**
 * Runs a request against the backend, falling back to the mock implementation.
 * The fallback is evaluated lazily so mock mutations only run when they are
 * actually needed.
 */
async function request<T>(
  path: string,
  fallback: () => T,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, mutates = false } = options;

  const useMock = (): T => {
    lastSource = "mock";
    const result = fallback();
    return result;
  };

  if (shouldSkipNetwork()) {
    return useMock();
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);

    const data = (await response.json()) as T;
    markReachable();
    if (mutates) mock.bumpRevision();
    return data;
  } catch {
    markUnreachable();
    const data = useMock();
    if (mutates) mock.bumpRevision();
    return data;
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------------------------------------------ */
/* Sign-in                                                             */
/* ------------------------------------------------------------------ */

/* Not in the published contract. Real authentication belongs on the backend;
   these routes are what the frontend would call once it exists. */

export function listAccounts(role?: Role): Promise<DemoAccount[]> {
  const query = role ? `?role=${role}` : "";
  return request(`/accounts${query}`, () => mock.listAccounts(role));
}

export function signIn(
  role: Role,
  email: string,
  password: string,
): Promise<SignInResponse> {
  return request("/auth/login", () => mock.signIn(role, email, password), {
    method: "POST",
    body: { role, email, password },
  });
}

export function getTpoProfile(): Promise<TpoProfile> {
  return request("/tpo/profile", () => mock.getTpoProfile());
}

/* ------------------------------------------------------------------ */
/* Health                                                              */
/* ------------------------------------------------------------------ */

export function getHealth(): Promise<HealthResponse> {
  return request("/health", () => mock.getHealth());
}

/* ------------------------------------------------------------------ */
/* Student                                                             */
/* ------------------------------------------------------------------ */

export function getStudent(studentId: string): Promise<Student> {
  return request(`/students/${studentId}`, () => mock.getStudent(studentId));
}

export function updateStudentProfile(
  studentId: string,
  update: StudentProfileUpdate,
): Promise<Student> {
  return request(
    `/students/${studentId}/profile`,
    () => mock.patchStudentProfile(studentId, update),
    { method: "PATCH", body: update, mutates: true },
  );
}

export function getSkillProfile(studentId: string): Promise<SkillScore[]> {
  return request(`/students/${studentId}/skill-profile`, () =>
    mock.getSkillProfile(studentId),
  );
}

/* ------------------------------------------------------------------ */
/* Assessment                                                          */
/* ------------------------------------------------------------------ */

export function getTestQuestions(studentId: string): Promise<TestQuestion[]> {
  return request(`/tests/questions?studentId=${studentId}`, () =>
    mock.getTestQuestions(),
  );
}

export function submitTest(submission: TestSubmission): Promise<TestResult> {
  return request("/tests/submit", () => mock.submitTest(submission), {
    method: "POST",
    body: submission,
    mutates: true,
  });
}

/** Local convenience: the most recent result, for the results screen. */
export function getLastTestResult(studentId: string): TestResult | null {
  return mock.getLastTestResult(studentId);
}

/* ------------------------------------------------------------------ */
/* Matches & applications                                              */
/* ------------------------------------------------------------------ */

export function getMatches(studentId: string): Promise<JobMatch[]> {
  return request(`/students/${studentId}/matches`, () => mock.getMatches(studentId));
}

/** Derived from the matches list so no extra endpoint is required. */
export async function getMatch(studentId: string, jobId: string): Promise<JobMatch> {
  const matches = await getMatches(studentId);
  const match = matches.find((m) => m.job.id === jobId);
  if (!match) throw new Error(`No match found for job ${jobId}`);
  return match;
}

export function applyToJob(jobId: string, studentId: string): Promise<ApplyResponse> {
  return request(`/jobs/${jobId}/apply`, () => mock.applyToJob(jobId, studentId), {
    method: "POST",
    body: { studentId },
    mutates: true,
  });
}

export function getApplications(studentId: string): Promise<Application[]> {
  return request(`/students/${studentId}/applications`, () =>
    mock.getApplications(studentId),
  );
}

export function updateApplicationStatus(
  applicationId: string,
  status: ApplicationStatus,
): Promise<StatusUpdateResponse> {
  return request(
    `/applications/${applicationId}/status`,
    () => mock.updateApplicationStatus(applicationId, status),
    { method: "PATCH", body: { status }, mutates: true },
  );
}

/* ------------------------------------------------------------------ */
/* Company                                                             */
/* ------------------------------------------------------------------ */

export function createJob(
  input: JobCreateInput,
  companyId: string = PRIMARY_COMPANY_ID,
): Promise<JobCreateResponse> {
  return request("/company/jobs", () => mock.createJob(input, companyId), {
    method: "POST",
    body: { ...input, companyId },
    mutates: true,
  });
}

export function getMatchedStudents(jobId: string): Promise<Candidate[]> {
  return request(`/company/jobs/${jobId}/matched-students`, () =>
    mock.getMatchedStudents(jobId),
  );
}

/**
 * Candidate detail is derived from the ranked list for the job, so the score,
 * strengths and gaps the company sees on the detail page are exactly the ones
 * from the ranking table.
 */
export async function getCandidate(
  studentId: string,
  jobId: string,
): Promise<Candidate> {
  const candidates = await getMatchedStudents(jobId);
  const candidate = candidates.find((c) => c.studentId === studentId);
  if (!candidate) throw new Error(`Candidate ${studentId} not found for job ${jobId}`);
  return candidate;
}

/* Not in the published contract — additive endpoints the backend can add later.
   Both fall back to mocks exactly like the contracted routes. */

export function getJob(jobId: string): Promise<Job> {
  return request(`/jobs/${jobId}`, () => mock.getJob(jobId));
}

export function getCompanyDashboard(
  companyId: string = PRIMARY_COMPANY_ID,
): Promise<CompanyDashboard> {
  return request(`/company/${companyId}/dashboard`, () =>
    mock.getCompanyDashboard(companyId),
  );
}

export function getCompany(companyId: string = PRIMARY_COMPANY_ID): Promise<Company> {
  return request(`/company/${companyId}`, () => mock.getCompany(companyId));
}

/* ------------------------------------------------------------------ */
/* TPO                                                                 */
/* ------------------------------------------------------------------ */

export function getTpoDashboard(): Promise<TpoDashboard> {
  return request("/tpo/dashboard", () => mock.getTpoDashboard());
}

export function getSkillGaps(): Promise<SkillGap[]> {
  return request("/tpo/skill-gaps", () => mock.getSkillGaps());
}

export function getSkillGapStudents(
  skill: string,
  department?: string,
): Promise<SkillGapStudent[]> {
  const query = department && department !== "ALL" ? `?department=${department}` : "";
  return request(
    `/tpo/skill-gaps/${encodeURIComponent(skill)}/students${query}`,
    () => mock.getSkillGapStudents(skill, department),
  );
}

/* ------------------------------------------------------------------ */
/* Demo controls                                                       */
/* ------------------------------------------------------------------ */

export const demo = {
  hydrate: mock.hydrate,
  reset: mock.resetDemo,
  subscribe: mock.subscribe,
  getRevision: mock.getRevision,
};
