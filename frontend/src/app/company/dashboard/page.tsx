"use client";

import { Briefcase, CheckCircle2, FileText, PlusCircle, Star } from "lucide-react";
import Link from "next/link";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, KpiCard } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { CardSkeleton, EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import { StatusBadge } from "@/components/ui/StatusBadge";
import * as api from "@/lib/api";
import { formatDate, formatStipend } from "@/lib/format";
import { useResource } from "@/lib/hooks";
import { useRequireRole } from "@/lib/session";
import type { Job } from "@/lib/types";

export default function CompanyDashboardPage() {
  const { accountId } = useRequireRole("company");
  const companyId = accountId ?? "";
  const enabled = Boolean(accountId);

  const dashboard = useResource(() => api.getCompanyDashboard(companyId), [companyId], {
    enabled,
  });
  const data = dashboard.data;

  const columns: Column<Job>[] = [
    {
      key: "title",
      header: "Role",
      render: (job) => (
        <Link
          href={`/company/jobs/${job.id}`}
          className="font-medium text-slate-900 hover:text-brand-700"
        >
          {job.title}
        </Link>
      ),
    },
    {
      key: "location",
      header: "Location",
      render: (job) => <span className="text-slate-600">{job.location}</span>,
    },
    {
      key: "stipend",
      header: "Stipend",
      align: "right",
      render: (job) => <span className="tabular-nums">{formatStipend(job.stipend)}</span>,
    },
    {
      key: "cgpa",
      header: "Min CGPA",
      align: "right",
      render: (job) => <span className="tabular-nums">{job.minCgpa.toFixed(1)}</span>,
    },
    {
      key: "skills",
      header: "Required skills",
      render: (job) => (
        <div className="flex flex-wrap gap-1">
          {job.requiredSkills.slice(0, 3).map((requirement) => (
            <span
              key={requirement.skill}
              className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600"
            >
              {requirement.skill} {requirement.requiredScore}+
            </span>
          ))}
          {job.requiredSkills.length > 3 ? (
            <span className="text-xs text-slate-400">
              +{job.requiredSkills.length - 3}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: "posted",
      header: "Posted",
      render: (job) => <span className="text-slate-500">{formatDate(job.postedAt)}</span>,
    },
    {
      key: "action",
      header: "",
      align: "right",
      render: (job) => (
        <Link
          href={`/company/jobs/${job.id}`}
          className="text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          View candidates
        </Link>
      ),
    },
  ];

  return (
    <DashboardShell
      role="company"
      title={data ? data.company.name : "Dashboard"}
      description={
        data ? `${data.company.industry} · ${data.company.location}` : undefined
      }
      actions={
        <Link href="/company/jobs/new">
          <Button size="sm" icon={<PlusCircle className="h-4 w-4" />}>
            Post a job
          </Button>
        </Link>
      }
    >
      {dashboard.error ? (
        <ErrorState message={dashboard.error} onRetry={dashboard.reload} />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {data ? (
              <>
                <KpiCard
                  label="Active jobs"
                  value={data.kpis.activeJobs}
                  hint="Accepting applications"
                  icon={<Briefcase className="h-4 w-4" />}
                  tone="brand"
                />
                <KpiCard
                  label="Applications"
                  value={data.kpis.applications}
                  hint="Across all open roles"
                  icon={<FileText className="h-4 w-4" />}
                />
                <KpiCard
                  label="Shortlisted"
                  value={data.kpis.shortlisted}
                  hint="Moved past first review"
                  icon={<Star className="h-4 w-4" />}
                  tone="warning"
                />
                <KpiCard
                  label="Selected"
                  value={data.kpis.selected}
                  hint="Offers extended"
                  icon={<CheckCircle2 className="h-4 w-4" />}
                  tone="positive"
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

          <Card padded={false}>
            <div className="p-5 pb-0">
              <CardHeader
                title="Your open roles"
                description="Candidates are ranked automatically against the skill bar you set."
              />
            </div>
            <div className="mt-4 px-2 pb-2">
              {dashboard.loading ? (
                <div className="p-3">
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : (
                <DataTable
                  columns={columns}
                  rows={data?.recentJobs ?? []}
                  getRowKey={(job) => job.id}
                  emptyMessage="No roles posted yet."
                />
              )}
            </div>
          </Card>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader
                title="Recent applicants"
                description="Newest activity across every role."
              />

              {dashboard.loading ? (
                <div className="mt-4">
                  <CardSkeleton rows={4} />
                </div>
              ) : (data?.recentApplicants ?? []).length === 0 ? (
                <div className="mt-4">
                  <EmptyState
                    title="No applications yet"
                    description="Once students apply to your roles they will appear here with their match score."
                  />
                </div>
              ) : (
                <ul className="mt-4 divide-y divide-slate-100">
                  {data?.recentApplicants.map((application) => (
                    <li
                      key={application.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-3"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/company/candidates/${application.studentId}?jobId=${application.jobId}`}
                          className="text-sm font-medium text-slate-900 hover:text-brand-700"
                        >
                          {application.studentName}
                        </Link>
                        <p className="text-xs text-slate-500">
                          {application.jobTitle} · applied {formatDate(application.appliedAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold tabular-nums text-slate-900">
                          {application.matchScore}%
                        </span>
                        <StatusBadge status={application.status} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <CardHeader title="Hiring summary" />
              {data ? (
                <div className="mt-4 space-y-4">
                  <p className="text-sm leading-relaxed text-slate-600">{data.company.about}</p>

                  <dl className="space-y-2.5 border-t border-slate-100 pt-4 text-sm">
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500">Applications per role</dt>
                      <dd className="font-medium tabular-nums text-slate-900">
                        {data.kpis.activeJobs === 0
                          ? "0"
                          : (data.kpis.applications / data.kpis.activeJobs).toFixed(1)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500">Shortlist rate</dt>
                      <dd className="font-medium tabular-nums text-slate-900">
                        {data.kpis.applications === 0
                          ? "0%"
                          : `${Math.round(
                              (data.kpis.shortlisted / data.kpis.applications) * 100,
                            )}%`}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500">Total openings</dt>
                      <dd className="font-medium tabular-nums text-slate-900">
                        {data.recentJobs.reduce((sum, job) => sum + job.openings, 0)}
                      </dd>
                    </div>
                  </dl>
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
