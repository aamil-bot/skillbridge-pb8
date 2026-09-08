"use client";

import { ArrowLeft, GraduationCap, Lightbulb } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { MatchRing } from "@/components/ui/MatchScore";
import { SkillComparisonBar, SkillProgress } from "@/components/ui/SkillProgress";
import { CardSkeleton, ErrorState, LoadingState } from "@/components/ui/States";
import { StatusBadge } from "@/components/ui/StatusBadge";
import * as api from "@/lib/api";
import { cn } from "@/lib/format";
import { useAction, useResource, useToast } from "@/lib/hooks";
import { useRequireRole } from "@/lib/session";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/lib/types";

export default function CandidateDetailPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading candidate" />}>
      <CandidateDetail />
    </Suspense>
  );
}

function CandidateDetail() {
  const params = useParams<{ studentId: string }>();
  const searchParams = useSearchParams();
  const studentId = params.studentId;
  const { accountId: companyId } = useRequireRole("company");
  const requestedJobId = searchParams.get("jobId");

  const { push } = useToast();
  const { pending, run } = useAction();
  const [updating, setUpdating] = useState<ApplicationStatus | null>(null);

  // Without an explicit ?jobId we fall back to the role this student applied to
  // at this company, and finally to the company's newest opening.
  const context = useResource(async () => {
    const [jobs, applications] = await Promise.all([
      api.getCompanyDashboard(companyId ?? ""),
      api.getApplications(studentId),
    ]);

    const companyJobIds = new Set(jobs.recentJobs.map((job) => job.id));
    const applied = applications.find((application) => companyJobIds.has(application.jobId));

    const jobId =
      requestedJobId && companyJobIds.has(requestedJobId)
        ? requestedJobId
        : (applied?.jobId ?? jobs.recentJobs[0]?.id);

    if (!jobId) throw new Error("This company has no open roles.");

    const [job, candidate] = await Promise.all([
      api.getJob(jobId),
      api.getCandidate(studentId, jobId),
    ]);

    return { job, candidate };
  }, [studentId, requestedJobId, companyId]);

  const data = context.data;

  async function changeStatus(status: ApplicationStatus) {
    if (!data?.candidate.applicationId) return;

    setUpdating(status);
    await run(async () => {
      try {
        const response = await api.updateApplicationStatus(
          data.candidate.applicationId as string,
          status,
        );
        push(response.message);
      } catch (cause) {
        push(
          cause instanceof Error ? cause.message : "The status could not be updated.",
          "error",
        );
      } finally {
        setUpdating(null);
      }
    });
  }

  return (
    <DashboardShell
      role="company"
      title={data?.candidate.name ?? "Candidate"}
      description={
        data
          ? `${data.candidate.studentId} · reviewed for ${data.job.title}`
          : undefined
      }
      actions={
        data ? (
          <Link href={`/company/jobs/${data.job.id}`}>
            <Button size="sm" variant="secondary" icon={<ArrowLeft className="h-4 w-4" />}>
              Back to ranking
            </Button>
          </Link>
        ) : null
      }
    >
      {context.error ? (
        <ErrorState message={context.error} onRetry={context.reload} />
      ) : context.loading || !data ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <CardSkeleton rows={6} />
          <CardSkeleton rows={6} />
          <CardSkeleton rows={6} />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
          <div className="space-y-4">
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-6">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-semibold tracking-tight text-slate-900">
                      {data.candidate.name}
                    </h2>
                    <span className="rounded-md bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">
                      Rank #{data.candidate.rank}
                    </span>
                    {data.candidate.status ? (
                      <StatusBadge status={data.candidate.status} />
                    ) : null}
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-4">
                    {[
                      ["Department", data.candidate.department],
                      ["Semester", String(data.candidate.semester)],
                      ["CGPA", data.candidate.cgpa.toFixed(2)],
                      ["College", data.candidate.college],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt className="text-xs text-slate-500">{label}</dt>
                        <dd className="mt-0.5 font-medium text-slate-900">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>

                <MatchRing score={data.candidate.matchScore} />
              </div>
            </Card>

            <Card>
              <CardHeader
                title="Why this ranking"
                description={`Measured against the skill bar set for ${data.job.title}.`}
              />
              <ul className="mt-4 space-y-2.5">
                {data.candidate.reasons.map((reason) => (
                  <li key={reason} className="flex gap-2.5 text-sm text-slate-700">
                    <Lightbulb
                      className="mt-0.5 h-4 w-4 shrink-0 text-amber-500"
                      aria-hidden
                    />
                    {reason}
                  </li>
                ))}
              </ul>
            </Card>

            <Card>
              <CardHeader
                title="Skill by skill"
                description="The dark marker is the score this role asks for."
              />
              <div className="mt-2 divide-y divide-slate-100">
                {data.candidate.comparisons.map((comparison) => (
                  <SkillComparisonBar
                    key={comparison.skill}
                    skill={comparison.skill}
                    studentScore={comparison.studentScore}
                    requiredScore={comparison.requiredScore}
                    gap={comparison.gap}
                    status={comparison.status}
                  />
                ))}
              </div>
            </Card>

            <Card>
              <CardHeader title="Projects" />
              {data.candidate.projects.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">No projects on record.</p>
              ) : (
                <div className="mt-4 space-y-4">
                  {data.candidate.projects.map((project) => (
                    <div key={project.id} className="rounded-lg border border-slate-200 p-4">
                      <p className="text-sm font-medium text-slate-900">{project.title}</p>
                      <p className="mt-1 text-sm text-slate-600">{project.description}</p>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {project.techStack.map((tech) => (
                          <span
                            key={tech}
                            className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader title="Application status" />

              {data.candidate.applied ? (
                <>
                  <p className="mt-3 text-sm text-slate-600">
                    Currently{" "}
                    <span className="font-medium text-slate-900">
                      {data.candidate.status?.toLowerCase()}
                    </span>
                    . Changing this updates the student's application immediately.
                  </p>

                  <div className="mt-4 space-y-2">
                    {APPLICATION_STATUSES.map((status) => {
                      const active = data.candidate.status === status;
                      const isPending = pending && updating === status;
                      return (
                        <button
                          key={status}
                          type="button"
                          disabled={active || pending}
                          onClick={() => changeStatus(status)}
                          className={cn(
                            "flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed",
                            active
                              ? "border-slate-900 bg-slate-900 text-white"
                              : status === "REJECTED"
                                ? "border-slate-200 text-rose-600 hover:border-rose-300 hover:bg-rose-50"
                                : "border-slate-200 text-slate-700 hover:border-brand-300 hover:bg-brand-50",
                          )}
                        >
                          {status.charAt(0) + status.slice(1).toLowerCase()}
                          {isPending ? (
                            <span className="text-xs font-normal">Updating…</span>
                          ) : active ? (
                            <span className="text-xs font-normal opacity-70">Current</span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                  {data.candidate.name} has not applied to {data.job.title} yet. They appear in
                  the ranking because their verified skills fit the role.
                </p>
              )}
            </Card>

            <Card>
              <CardHeader title="Verified skill scores" />
              <div className="mt-4 space-y-3.5">
                {data.candidate.skills.map((skill) => (
                  <SkillProgress
                    key={skill.skill}
                    skill={skill.skill}
                    score={skill.score}
                    level={skill.level}
                    source={skill.source}
                  />
                ))}
              </div>
              <p className="mt-4 flex items-start gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                <GraduationCap className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                Scores marked as Assessment come from the platform test, not self-reporting.
              </p>
            </Card>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
