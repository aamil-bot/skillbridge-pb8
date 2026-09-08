"use client";

import { Building2, FileText, MapPin, Wallet } from "lucide-react";
import Link from "next/link";

import { ApplicationTimeline } from "@/components/ApplicationTimeline";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { MatchScore } from "@/components/ui/MatchScore";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/ui/States";
import { StatusBadge } from "@/components/ui/StatusBadge";
import * as api from "@/lib/api";
import { formatDate, formatDateTime, formatStipend } from "@/lib/format";
import { useResource } from "@/lib/hooks";
import { useRequireRole } from "@/lib/session";
import { APPLICATION_STATUSES } from "@/lib/types";

export default function StudentApplicationsPage() {
  const { accountId } = useRequireRole("student");
  const studentId = accountId ?? "";
  const enabled = Boolean(accountId);

  const applications = useResource(() => api.getApplications(studentId), [studentId], {
    enabled,
  });
  const rows = applications.data ?? [];

  const counts = APPLICATION_STATUSES.map((status) => ({
    status,
    count: rows.filter((row) => row.status === status).length,
  }));

  return (
    <DashboardShell
      role="student"
      title="Applications"
      description="Status updates from recruiters appear here as soon as they happen."
    >
      {applications.error ? (
        <ErrorState message={applications.error} onRetry={applications.reload} />
      ) : applications.loading ? (
        <div className="space-y-4">
          <CardSkeleton rows={3} />
          <CardSkeleton rows={3} />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-5 w-5" aria-hidden />}
          title="No applications yet"
          description="Open a role from your matches, check the skill breakdown, and apply. It will show up here with a live status."
          action={
            <Link href="/student/matches">
              <Button size="sm">Browse job matches</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          <Card>
            <div className="flex flex-wrap gap-x-10 gap-y-4">
              {counts.map(({ status, count }) => (
                <div key={status}>
                  <p className="text-2xl font-semibold tabular-nums text-slate-900">{count}</p>
                  <div className="mt-1">
                    <StatusBadge status={status} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="space-y-4">
            {rows.map((application) => {
              const latest = application.timeline[application.timeline.length - 1];
              return (
                <Card key={application.id}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-base font-semibold text-slate-900">
                          {application.jobTitle}
                        </h2>
                        <StatusBadge status={application.status} />
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5" aria-hidden />
                          {application.companyName}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" aria-hidden />
                          {application.location}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Wallet className="h-3.5 w-3.5" aria-hidden />
                          {formatStipend(application.stipend)}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs text-slate-500">
                        Applied {formatDate(application.appliedAt)} · Application {application.id}
                      </p>
                    </div>

                    <MatchScore score={application.matchScore} size="sm" />
                  </div>

                  <div className="mt-6 border-t border-slate-100 pt-5">
                    <ApplicationTimeline application={application} />
                  </div>

                  <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    <span className="font-medium text-slate-900">{latest.note}</span>
                    <span className="text-slate-400"> · {formatDateTime(latest.at)}</span>
                  </p>

                  <div className="mt-4">
                    <Link
                      href={`/student/matches/${application.jobId}`}
                      className="text-sm font-medium text-brand-600 hover:text-brand-700"
                    >
                      View role and match breakdown
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
