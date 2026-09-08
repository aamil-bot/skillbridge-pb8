"use client";

import {
  ArrowRight,
  Briefcase,
  ClipboardCheck,
  FileText,
  GraduationCap,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, KpiCard } from "@/components/ui/Card";
import { MatchScore } from "@/components/ui/MatchScore";
import { SkillProgress } from "@/components/ui/SkillProgress";
import { CardSkeleton, EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import { StatusBadge } from "@/components/ui/StatusBadge";
import * as api from "@/lib/api";
import { formatDate, formatStipend } from "@/lib/format";
import { useResource } from "@/lib/hooks";
import { useRequireRole } from "@/lib/session";

export default function StudentDashboardPage() {
  const { accountId } = useRequireRole("student");
  const studentId = accountId ?? "";
  const enabled = Boolean(accountId);

  const student = useResource(() => api.getStudent(studentId), [studentId], { enabled });
  const matches = useResource(() => api.getMatches(studentId), [studentId], { enabled });
  const applications = useResource(() => api.getApplications(studentId), [studentId], {
    enabled,
  });

  if (student.error) {
    return (
      <DashboardShell role="student" title="Dashboard">
        <ErrorState message={student.error} onRetry={student.reload} />
      </DashboardShell>
    );
  }

  const data = student.data;
  const topMatches = (matches.data ?? []).slice(0, 3);
  const recentApplications = (applications.data ?? []).slice(0, 4);
  const topSkills = [...(data?.skills ?? [])].sort((a, b) => b.score - a.score).slice(0, 4);

  return (
    <DashboardShell
      role="student"
      title={data ? `Welcome back, ${data.name.split(" ")[0]}` : "Dashboard"}
      description={
        data
          ? `${data.academics.department} · Semester ${data.academics.semester} · ${data.academics.college}`
          : undefined
      }
      actions={
        <Link href="/student/test">
          <Button size="sm" icon={<ClipboardCheck className="h-4 w-4" />}>
            {data?.assessmentCompleted ? "Retake assessment" : "Take assessment"}
          </Button>
        </Link>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data ? (
          <>
            <KpiCard
              label="CGPA"
              value={data.academics.cgpa.toFixed(1)}
              hint={`${data.academics.backlogs} active backlogs`}
              icon={<GraduationCap className="h-4 w-4" />}
              tone="brand"
            />
            <KpiCard
              label="Profile completion"
              value={`${data.profileCompletion}%`}
              hint={
                data.profileCompletion === 100
                  ? "Everything is filled in"
                  : "Add projects and preferences to finish"
              }
              icon={<FileText className="h-4 w-4" />}
            />
            <KpiCard
              label="Career readiness"
              value={data.readiness.score}
              hint={data.readiness.label}
              icon={<TrendingUp className="h-4 w-4" />}
              tone={data.readiness.score >= 65 ? "positive" : "warning"}
            />
            <KpiCard
              label="Applications"
              value={applications.data?.length ?? 0}
              hint={`${
                (applications.data ?? []).filter((a) => a.status === "SHORTLISTED").length
              } shortlisted`}
              icon={<Briefcase className="h-4 w-4" />}
            />
          </>
        ) : (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="card space-y-3 p-4">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-16" />
            </div>
          ))
        )}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Your strongest skills"
            description="Scores come from the college record until you complete the assessment."
            action={
              <Link
                href="/student/skill-profile"
                className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                Full profile
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            }
          />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {data ? (
              topSkills.map((skill) => (
                <SkillProgress
                  key={skill.skill}
                  skill={skill.skill}
                  score={skill.score}
                  level={skill.level}
                  source={skill.source}
                />
              ))
            ) : (
              <Skeleton className="h-16 w-full" />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Assessment" />
          {data ? (
            <div className="mt-4">
              {data.assessmentCompleted ? (
                <>
                  <p className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                    <ClipboardCheck className="h-4 w-4" aria-hidden />
                    Completed
                  </p>
                  <p className="mt-3 text-sm text-slate-600">
                    Last taken {data.lastAssessmentAt ? formatDate(data.lastAssessmentAt) : "—"}.
                    Your skill scores and job matches reflect this result.
                  </p>
                </>
              ) : (
                <>
                  <p className="inline-flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
                    Not taken yet
                  </p>
                  <p className="mt-3 text-sm text-slate-600">
                    12 questions across six skills, about 10 minutes. Your matches sharpen as
                    soon as you finish.
                  </p>
                </>
              )}

              <div className="mt-4 rounded-lg bg-slate-50 p-3">
                <p className="text-sm font-medium text-slate-900">{data.readiness.label}</p>
                <p className="mt-0.5 text-sm text-slate-600">{data.readiness.summary}</p>
              </div>

              <Link href="/student/test" className="mt-4 block">
                <Button className="w-full" variant={data.assessmentCompleted ? "secondary" : "primary"}>
                  {data.assessmentCompleted ? "Retake assessment" : "Start assessment"}
                </Button>
              </Link>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Recommended for you"
            description="Ranked by how your current scores compare with each role's requirements."
            action={
              <Link
                href="/student/matches"
                className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                All matches
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            }
          />

          {matches.loading ? (
            <div className="mt-4 space-y-3">
              <CardSkeleton rows={1} />
              <CardSkeleton rows={1} />
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {topMatches.map((match) => (
                <li key={match.job.id}>
                  <Link
                    href={`/student/matches/${match.job.id}`}
                    className="flex items-center justify-between gap-4 py-3 transition-colors hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {match.job.title}
                      </p>
                      <p className="truncate text-sm text-slate-500">
                        {match.job.companyName} · {match.job.location} ·{" "}
                        {formatStipend(match.job.stipend)}
                      </p>
                      {match.gaps.length > 0 ? (
                        <p className="mt-1 text-xs text-rose-600">
                          Gaps: {match.gaps.join(", ")}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-emerald-600">
                          Every requirement met
                        </p>
                      )}
                    </div>
                    <MatchScore score={match.matchScore} size="sm" showLabel={false} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Recent applications"
            action={
              <Link
                href="/student/applications"
                className="text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                View all
              </Link>
            }
          />

          {applications.loading ? (
            <div className="mt-4 space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : recentApplications.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                title="No applications yet"
                description="Open your matches and apply to a role to start tracking it here."
                action={
                  <Link href="/student/matches">
                    <Button size="sm" variant="secondary">
                      Browse matches
                    </Button>
                  </Link>
                }
              />
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {recentApplications.map((application) => (
                <li key={application.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {application.jobTitle}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {application.companyName} · {formatDate(application.appliedAt)}
                    </p>
                  </div>
                  <StatusBadge status={application.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </DashboardShell>
  );
}
