/**
 * SkillBridge — scoring and matching logic.
 *
 * Everything here is pure: given a student and a job it returns the same
 * result every time. That is what makes the demo honest — when the student's
 * skill scores change after the test, every match percentage recomputes from
 * the new numbers instead of flipping to a second hardcoded value.
 */

import type {
  ApplicationStatus,
  AssessedSkill,
  CareerReadiness,
  Candidate,
  GapSeverity,
  Job,
  JobMatch,
  SkillComparison,
  SkillLevel,
  SkillName,
  SkillScore,
  SkillStatus,
  Student,
} from "./types";

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

export function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

export function levelFor(score: number): SkillLevel {
  if (score >= 80) return "Advanced";
  if (score >= 65) return "Proficient";
  if (score >= 45) return "Developing";
  return "Beginner";
}

export function severityFor(gap: number): GapSeverity {
  if (gap >= 20) return "CRITICAL";
  if (gap >= 8) return "MODERATE";
  return "HEALTHY";
}

export function statusFor(studentScore: number, requiredScore: number): SkillStatus {
  if (studentScore >= requiredScore + 10) return "STRENGTH";
  if (studentScore >= requiredScore) return "MET";
  return "GAP";
}

export function scoreOf(skills: SkillScore[], skill: SkillName): number {
  return skills.find((s) => s.skill === skill)?.score ?? 0;
}

/* ------------------------------------------------------------------ */
/* Career readiness                                                    */
/* ------------------------------------------------------------------ */

export function computeReadiness(
  skills: SkillScore[],
  cgpa: number,
  assessmentCompleted: boolean,
  profileCompletion: number,
): CareerReadiness {
  const assessed = skills.filter((s) => s.source === "Assessment");
  const pool = assessed.length > 0 ? assessed : skills;
  const avgSkill = pool.length
    ? pool.reduce((sum, s) => sum + s.score, 0) / pool.length
    : 0;

  const academic = (cgpa / 10) * 100;
  const raw =
    avgSkill * 0.6 +
    academic * 0.25 +
    profileCompletion * 0.1 +
    (assessmentCompleted ? 5 : 0);

  const score = Math.round(clamp(raw));

  let label = "Getting started";
  let summary = "Take the skill assessment to unlock accurate job matches.";
  if (score >= 80) {
    label = "Placement ready";
    summary = "Your profile clears the bar for most roles on the platform.";
  } else if (score >= 65) {
    label = "Nearly ready";
    summary = "Close two skill gaps and you clear the bar for senior openings.";
  } else if (score >= 50) {
    label = "Building up";
    summary = "Core skills are forming. Focus on your two weakest areas.";
  }

  return { score, label, summary };
}

export function profileCompletionFor(student: {
  profile: { projects: unknown[]; preferredCity: string; expectedStipend: number };
  skills: SkillScore[];
  assessmentCompleted: boolean;
}): number {
  let filled = 4; // registration, name, department, academics come from college
  const total = 8;
  if (student.profile.projects.length > 0) filled += 1;
  if (student.profile.preferredCity) filled += 1;
  if (student.profile.expectedStipend > 0) filled += 1;
  if (student.assessmentCompleted) filled += 1;
  return Math.round((filled / total) * 100);
}

/* ------------------------------------------------------------------ */
/* Job matching                                                        */
/* ------------------------------------------------------------------ */

export function compareSkills(job: Job, skills: SkillScore[]): SkillComparison[] {
  return job.requiredSkills.map((requirement) => {
    const studentScore = scoreOf(skills, requirement.skill);
    const gap = Math.max(0, requirement.requiredScore - studentScore);
    return {
      skill: requirement.skill,
      studentScore,
      requiredScore: requirement.requiredScore,
      gap,
      weight: requirement.weight,
      status: statusFor(studentScore, requirement.requiredScore),
    };
  });
}

/**
 * Weighted match, 0–100.
 *
 * Two terms, because "meets every requirement" and "clears every requirement
 * comfortably" are not the same candidate. The first term is attainment against
 * the bar and carries almost all the weight; the second gives a small credit for
 * the margin above it, which stops strong candidates from bunching at 100 and
 * makes the ranking order meaningful.
 */
const SURPLUS_RANGE = 30;
const SURPLUS_WEIGHT = 0.08;

export function matchScoreFor(comparisons: SkillComparison[], cgpaMet: boolean): number {
  if (comparisons.length === 0) return 0;

  const totalWeight = comparisons.reduce((sum, c) => sum + c.weight, 0);

  const attained = comparisons.reduce((sum, c) => {
    const ratio = c.requiredScore === 0 ? 1 : c.studentScore / c.requiredScore;
    return sum + Math.min(1, ratio) * c.weight;
  }, 0);

  const surplus = comparisons.reduce((sum, c) => {
    const margin = Math.max(0, c.studentScore - c.requiredScore);
    return sum + Math.min(1, margin / SURPLUS_RANGE) * c.weight;
  }, 0);

  const base = (attained / totalWeight) * 100;
  const bonus = (surplus / totalWeight) * 100;
  const score = base * (1 - SURPLUS_WEIGHT) + bonus * SURPLUS_WEIGHT;

  return Math.round(clamp(cgpaMet ? score : score - 12));
}

function buildReason(comparisons: SkillComparison[], cgpaMet: boolean): string {
  const strong = comparisons
    .filter((c) => c.status !== "GAP")
    .sort((a, b) => b.studentScore - b.requiredScore - (a.studentScore - a.requiredScore))
    .slice(0, 2)
    .map((c) => c.skill);

  const worst = comparisons
    .filter((c) => c.status === "GAP")
    .sort((a, b) => b.gap * b.weight - a.gap * a.weight)[0];

  const parts: string[] = [];
  if (strong.length === 2) {
    parts.push(`${strong[0]} and ${strong[1]} clear the bar comfortably`);
  } else if (strong.length === 1) {
    parts.push(`${strong[0]} clears the bar`);
  } else {
    parts.push("No required skill has reached the bar yet");
  }

  if (worst) {
    parts.push(`${worst.skill} is ${worst.gap} points short`);
  } else {
    parts.push("every required skill is met");
  }

  if (!cgpaMet) parts.push("CGPA is below the posted minimum");

  return `${parts.join(", ")}.`;
}

export function buildJobMatch(
  job: Job,
  student: Student,
  applied: boolean,
  applicationId: string | null,
): JobMatch {
  const comparisons = compareSkills(job, student.skills);
  const cgpaMet = student.academics.cgpa >= job.minCgpa;
  const matchScore = matchScoreFor(comparisons, cgpaMet);

  return {
    job,
    matchScore,
    strengths: comparisons.filter((c) => c.status !== "GAP").map((c) => c.skill),
    gaps: comparisons.filter((c) => c.status === "GAP").map((c) => c.skill),
    reason: buildReason(comparisons, cgpaMet),
    comparisons,
    cgpaMet,
    applied,
    applicationId,
  };
}

/* ------------------------------------------------------------------ */
/* Candidate ranking (company side)                                    */
/* ------------------------------------------------------------------ */

function candidateReasons(
  comparisons: SkillComparison[],
  student: Student,
  job: Job,
): string[] {
  const reasons: string[] = [];

  const strengths = comparisons.filter((c) => c.status === "STRENGTH");
  if (strengths.length > 0) {
    reasons.push(
      `Exceeds the bar on ${strengths
        .map((c) => `${c.skill} (${c.studentScore} vs ${c.requiredScore})`)
        .join(", ")}.`,
    );
  }

  const met = comparisons.filter((c) => c.status === "MET");
  if (met.length > 0) {
    reasons.push(`Meets the requirement on ${met.map((c) => c.skill).join(", ")}.`);
  }

  const gaps = comparisons
    .filter((c) => c.status === "GAP")
    .sort((a, b) => b.gap - a.gap);
  if (gaps.length > 0) {
    reasons.push(
      `Needs development in ${gaps
        .map((c) => `${c.skill} (${c.gap} points short)`)
        .join(", ")}.`,
    );
  }

  reasons.push(
    student.academics.cgpa >= job.minCgpa
      ? `CGPA ${student.academics.cgpa.toFixed(1)} clears the ${job.minCgpa.toFixed(1)} cut-off.`
      : `CGPA ${student.academics.cgpa.toFixed(1)} is below the ${job.minCgpa.toFixed(1)} cut-off.`,
  );

  if (student.profile.projects.length > 0) {
    reasons.push(
      `${student.profile.projects.length} verified project${
        student.profile.projects.length > 1 ? "s" : ""
      } on record, most recently "${student.profile.projects[0].title}".`,
    );
  }

  return reasons;
}

export function rankCandidates(
  job: Job,
  students: Student[],
  lookupApplication: (
    studentId: string,
  ) => { status: ApplicationStatus; applicationId: string } | null,
): Candidate[] {
  return students
    .map((student) => {
      const comparisons = compareSkills(job, student.skills);
      const cgpaMet = student.academics.cgpa >= job.minCgpa;
      const application = lookupApplication(student.id);

      return {
        studentId: student.id,
        name: student.name,
        department: student.academics.department,
        semester: student.academics.semester,
        cgpa: student.academics.cgpa,
        college: student.academics.college,
        matchScore: matchScoreFor(comparisons, cgpaMet),
        rank: 0,
        strengths: comparisons.filter((c) => c.status !== "GAP").map((c) => c.skill),
        gaps: comparisons.filter((c) => c.status === "GAP").map((c) => c.skill),
        comparisons,
        skills: student.skills,
        projects: student.profile.projects,
        reasons: candidateReasons(comparisons, student, job),
        status: application?.status ?? null,
        applicationId: application?.applicationId ?? null,
        applied: application !== null,
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore || b.cgpa - a.cgpa)
    .map((candidate, index) => ({ ...candidate, rank: index + 1 }));
}

/* ------------------------------------------------------------------ */
/* Assessment scoring                                                  */
/* ------------------------------------------------------------------ */

/**
 * Applies an assessment result to an existing skill score.
 *
 * A two-question sample is far too small to replace a score outright, so the
 * result moves the existing score by a delta instead. Lower scores move more
 * than high ones (there is more headroom), which keeps the update intuitive:
 * full marks always improves a skill, a miss always costs a little.
 */
export function updatedSkillScore(
  previousScore: number,
  correct: number,
  total: number,
): number {
  const ratio = total === 0 ? 0 : correct / total;

  let delta: number;
  if (ratio >= 1) {
    delta = Math.round(4 + (100 - previousScore) * 0.04);
  } else if (ratio > 0) {
    delta = Math.round(ratio * (2 + (100 - previousScore) * 0.02));
  } else {
    delta = -Math.round(3 + previousScore * 0.03);
  }

  return Math.round(clamp(previousScore + delta, 0, 98));
}

export function strongestAndWeakest(
  scores: { skill: AssessedSkill; score: number }[],
): { strongest: AssessedSkill[]; weakest: AssessedSkill[] } {
  const sorted = [...scores].sort((a, b) => b.score - a.score);
  return {
    strongest: sorted.slice(0, 2).map((s) => s.skill),
    weakest: sorted.slice(-2).reverse().map((s) => s.skill),
  };
}
