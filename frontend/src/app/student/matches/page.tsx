"use client";

import { useState } from "react";

import { JobCard } from "@/components/JobCard";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/Card";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/ui/States";
import * as api from "@/lib/api";
import { cn } from "@/lib/format";
import { useResource } from "@/lib/hooks";
import { useRequireRole } from "@/lib/session";

type Filter = "all" | "open" | "applied";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All roles" },
  { id: "open", label: "Not applied" },
  { id: "applied", label: "Applied" },
];

export default function StudentMatchesPage() {
  const { accountId } = useRequireRole("student");
  const studentId = accountId ?? "";
  const enabled = Boolean(accountId);

  const matches = useResource(() => api.getMatches(studentId), [studentId], { enabled });
  const [filter, setFilter] = useState<Filter>("all");

  const all = matches.data ?? [];
  const visible = all.filter((match) =>
    filter === "all" ? true : filter === "applied" ? match.applied : !match.applied,
  );

  const best = all[0];
  const appliedCount = all.filter((match) => match.applied).length;

  return (
    <DashboardShell
      role="student"
      title="Job matches"
      description="Every percentage is computed from your current skill scores against that role's requirements."
    >
      {matches.error ? (
        <ErrorState message={matches.error} onRetry={matches.reload} />
      ) : matches.loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <CardSkeleton rows={4} />
          <CardSkeleton rows={4} />
        </div>
      ) : (
        <div className="space-y-4">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div className="flex flex-wrap gap-8">
                <div>
                  <p className="text-xs font-medium text-slate-500">Roles open</p>
                  <p className="text-2xl font-semibold text-slate-900">{all.length}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Best match</p>
                  <p className="text-2xl font-semibold text-emerald-600">
                    {best ? `${best.matchScore}%` : "—"}
                  </p>
                  <p className="text-xs text-slate-500">{best?.job.title}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Applied</p>
                  <p className="text-2xl font-semibold text-slate-900">{appliedCount}</p>
                </div>
              </div>

              <div className="flex rounded-lg bg-slate-100 p-1">
                {FILTERS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setFilter(option.id)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                      filter === option.id
                        ? "bg-white text-slate-900 shadow-card"
                        : "text-slate-600 hover:text-slate-900",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {visible.length === 0 ? (
            <EmptyState
              title="Nothing here"
              description={
                filter === "applied"
                  ? "You have not applied to any roles yet. Switch to all roles to browse them."
                  : "You have applied to every open role."
              }
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {visible.map((match) => (
                <JobCard key={match.job.id} match={match} />
              ))}
            </div>
          )}
        </div>
      )}
    </DashboardShell>
  );
}
