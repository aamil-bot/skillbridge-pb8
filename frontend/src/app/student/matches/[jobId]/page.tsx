"use client";

import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  MapPin,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { ApplicationTimeline } from "@/components/ApplicationTimeline";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { MatchRing } from "@/components/ui/MatchScore";
import { SkillComparisonBar } from "@/components/ui/SkillProgress";
import { CardSkeleton, ErrorState } from "@/components/ui/States";
import { SkillChip, StatusBadge } from "@/components/ui/StatusBadge";
import * as api from "@/lib/api";
import { formatDate, formatStipend } from "@/lib/format";
import { useAction, useResource, useToast } from "@/lib/hooks";
import { useRequireRole } from "@/lib/session";
import type { Application } from "@/lib/types";

export default function MatchDetailPage() {
  const params = useParams<{ jobId: string }>();
  const jobId = params.jobId;

  const { accountId } = useRequireRole("student");
  const studentId = accountId ?? "";
  const enabled = Boolean(accountId);


  const match = useResource(() => api.getMatch(studentId, jobId), [studentId, jobId], {
    enabled,
  });
  const applications = useResource(() => api.getApplications(studentId), [studentId], {
    enabled,
  });
  const { push } = useToast();
  const { pending, run } = useAction();
  const [justApplied, setJustApplied] = useState(false);

  const data = match.data;
  const application: Application | undefined = (applications.data ?? []).find(
    (item) => item.jobId === jobId,
  );

  async function apply() {
    if (!data || data.applied) return;

    await run(async () => {
      try {
        const response = await api.applyToJob(jobId, studentId);
        setJustApplied(true);
        push(response.message);
      } catch (cause) {
        push(
          cause instanceof Error ? cause.message : "Your application could not be sent.",
          "error",
        );
      }
    });
  }

  return (
    <DashboardShell
      role="student"
      title={data?.job.title ?? "Role details"}
      description={data ? `${data.job.companyName} · ${data.job.location}` : undefined}
      actions={
        <Link href="/student/matches">
          <Button size="sm" variant="secondary" icon={<ArrowLeft className="h-4 w-4" />}>
            Back
          </Button>
        </Link>
      }
    >
      {match.error ? (
        <ErrorState message={match.error} onRetry={match.reload} />
      ) : match.loading || !data ? (
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
                <div className="min-w-0">
                  <h2 className="text-xl font-semibold tracking-tight text-slate-900">
                    {data.job.title}
                  </h2>
                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <Building2 className="h-4 w-4" aria-hidden />
                      {data.job.companyName}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" aria-hidden />
                      {data.job.location}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Wallet className="h-4 w-4" aria-hidden />
                      {formatStipend(data.job.stipend)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="h-4 w-4" aria-hidden />
                      {data.job.openings} openings
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-4 w-4" aria-hidden />
                      Posted {formatDate(data.job.postedAt)}
                    </span>
                  </div>
                  <p className="mt-4 max-w-prose text-sm leading-relaxed text-slate-600">
                    {data.job.description}
                  </p>
                </div>

                <MatchRing score={data.matchScore} />
              </div>
            </Card>

            <Card>
              <CardHeader
                title="How your score was calculated"
                description="Each required skill is compared with your current score. The dark marker is the bar this role sets."
              />

              <div className="mt-2 divide-y divide-slate-100">
                {data.comparisons.map((comparison) => (
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

              <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-slate-500">Strengths</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {data.strengths.length > 0 ? (
                      data.strengths.map((skill) => (
                        <SkillChip key={skill} skill={skill} status="STRENGTH" />
                      ))
                    ) : (
                      <span className="text-sm text-slate-400">None yet</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Gaps to close</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {data.gaps.length > 0 ? (
                      data.comparisons
                        .filter((comparison) => comparison.status === "GAP")
                        .map((comparison) => (
                          <SkillChip
                            key={comparison.skill}
                            skill={comparison.skill}
                            status="GAP"
                            detail={`−${comparison.gap}`}
                          />
                        ))
                    ) : (
                      <span className="text-sm text-slate-400">Every requirement met</span>
                    )}
                  </div>
                </div>
              </div>

              <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                {data.reason}
              </p>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader title="Apply" />

              <dl className="mt-4 space-y-2.5 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Minimum CGPA</dt>
                  <dd
                    className={
                      data.cgpaMet ? "font-medium text-emerald-600" : "font-medium text-rose-600"
                    }
                  >
                    {data.job.minCgpa.toFixed(1)} {data.cgpaMet ? "· met" : "· not met"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Requirements met</dt>
                  <dd className="font-medium text-slate-900">
                    {data.comparisons.filter((c) => c.status !== "GAP").length} of{" "}
                    {data.comparisons.length}
                  </dd>
                </div>
              </dl>

              <div className="mt-5">
                {data.applied || justApplied ? (
                  <div className="rounded-lg bg-emerald-50 p-4">
                    <p className="inline-flex items-center gap-2 text-sm font-medium text-emerald-800">
                      <CheckCircle2 className="h-4 w-4" aria-hidden />
                      Application submitted
                    </p>
                    <p className="mt-1.5 text-sm text-emerald-700">
                      {application
                        ? `Applied on ${formatDate(application.appliedAt)}. You cannot apply twice to the same role.`
                        : "You cannot apply twice to the same role."}
                    </p>
                    {application ? (
                      <div className="mt-3">
                        <StatusBadge status={application.status} />
                      </div>
                    ) : null}
                    <Link href="/student/applications" className="mt-4 block">
                      <Button variant="secondary" className="w-full">
                        Track this application
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <>
                    <Button size="lg" className="w-full" loading={pending} onClick={apply}>
                      {pending ? "Applying" : "Apply now"}
                    </Button>
                    <p className="mt-2 text-center text-xs text-slate-500">
                      {data.job.companyName} will see your verified skill scores and this match
                      breakdown.
                    </p>
                  </>
                )}
              </div>
            </Card>

            {application ? (
              <Card>
                <CardHeader title="Progress" />
                <div className="mt-5">
                  <ApplicationTimeline application={application} />
                </div>
              </Card>
            ) : null}

            <Card>
              <CardHeader title="What this role asks for" />
              <ul className="mt-4 space-y-2.5">
                {data.job.requiredSkills.map((requirement) => (
                  <li
                    key={requirement.skill}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="text-slate-700">{requirement.skill}</span>
                    <span className="text-slate-500">
                      {requirement.requiredScore}+
                      <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                        weight {requirement.weight}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
