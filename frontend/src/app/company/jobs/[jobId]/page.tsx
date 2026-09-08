"use client";

import { ArrowLeft, MapPin, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { matchTone } from "@/components/ui/MatchScore";
import { CardSkeleton, ErrorState } from "@/components/ui/States";
import { SkillChip, StatusBadge } from "@/components/ui/StatusBadge";
import * as api from "@/lib/api";
import { cn, formatDate, formatStipend } from "@/lib/format";
import { useResource } from "@/lib/hooks";
import type { ApplicationStatus, Candidate } from "@/lib/types";

const STATUS_FILTERS: { id: string; label: string }[] = [
  { id: "ALL", label: "Everyone" },
  { id: "APPLIED_ONLY", label: "Applicants only" },
  { id: "SHORTLISTED", label: "Shortlisted" },
  { id: "SELECTED", label: "Selected" },
];

export default function CompanyJobDetailPage() {
  const params = useParams<{ jobId: string }>();
  const jobId = params.jobId;

  const job = useResource(() => api.getJob(jobId), [jobId]);
  const candidates = useResource(() => api.getMatchedStudents(jobId), [jobId]);

  const [department, setDepartment] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [minMatch, setMinMatch] = useState(0);

  const all = candidates.data ?? [];
  const departments = Array.from(new Set(all.map((c) => c.department))).sort();

  const rows = all.filter((candidate) => {
    if (department !== "ALL" && candidate.department !== department) return false;
    if (candidate.matchScore < minMatch) return false;
    if (status === "APPLIED_ONLY" && !candidate.applied) return false;
    if (status === "SHORTLISTED" && candidate.status !== "SHORTLISTED") return false;
    if (status === "SELECTED" && candidate.status !== "SELECTED") return false;
    return true;
  });

  const columns: Column<Candidate>[] = [
    {
      key: "rank",
      header: "Rank",
      render: (candidate) => (
        <span className="font-semibold tabular-nums text-slate-500">#{candidate.rank}</span>
      ),
    },
    {
      key: "student",
      header: "Student",
      render: (candidate) => (
        <div>
          <Link
            href={`/company/candidates/${candidate.studentId}?jobId=${jobId}`}
            className="font-medium text-slate-900 hover:text-brand-700"
          >
            {candidate.name}
          </Link>
          <p className="text-xs text-slate-500">
            {candidate.studentId} · {candidate.department} · Sem {candidate.semester}
          </p>
        </div>
      ),
    },
    {
      key: "match",
      header: "Match",
      align: "right",
      render: (candidate) => {
        const tone = matchTone(candidate.matchScore);
        return (
          <div className="flex items-center justify-end gap-2">
            <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-slate-100 sm:block">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${candidate.matchScore}%`,
                  backgroundColor: tone.stroke,
                }}
              />
            </div>
            <span className={cn("font-semibold tabular-nums", tone.text)}>
              {candidate.matchScore}%
            </span>
          </div>
        );
      },
    },
    {
      key: "cgpa",
      header: "CGPA",
      align: "right",
      render: (candidate) => (
        <span className="tabular-nums">{candidate.cgpa.toFixed(1)}</span>
      ),
    },
    {
      key: "strengths",
      header: "Strengths",
      render: (candidate) => (
        <div className="flex flex-wrap gap-1">
          {candidate.strengths.length === 0 ? (
            <span className="text-xs text-slate-400">None</span>
          ) : (
            candidate.strengths
              .slice(0, 3)
              .map((skill) => <SkillChip key={skill} skill={skill} status="STRENGTH" />)
          )}
        </div>
      ),
    },
    {
      key: "gaps",
      header: "Gaps",
      render: (candidate) => (
        <div className="flex flex-wrap gap-1">
          {candidate.gaps.length === 0 ? (
            <span className="text-xs text-emerald-600">None</span>
          ) : (
            candidate.gaps
              .slice(0, 3)
              .map((skill) => <SkillChip key={skill} skill={skill} status="GAP" />)
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (candidate) =>
        candidate.status ? (
          <StatusBadge status={candidate.status as ApplicationStatus} />
        ) : (
          <span className="text-xs text-slate-400">Not applied</span>
        ),
    },
    {
      key: "action",
      header: "",
      align: "right",
      render: (candidate) => (
        <Link
          href={`/company/candidates/${candidate.studentId}?jobId=${jobId}`}
          className="whitespace-nowrap text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          Review
        </Link>
      ),
    },
  ];

  return (
    <DashboardShell
      role="company"
      title={job.data?.title ?? "Role"}
      description={
        job.data ? `${job.data.location} · ${formatStipend(job.data.stipend)}` : undefined
      }
      actions={
        <Link href="/company/dashboard">
          <Button size="sm" variant="secondary" icon={<ArrowLeft className="h-4 w-4" />}>
            Back
          </Button>
        </Link>
      }
    >
      {job.error ? (
        <ErrorState message={job.error} onRetry={job.reload} />
      ) : job.loading || !job.data ? (
        <div className="space-y-4">
          <CardSkeleton rows={4} />
          <CardSkeleton rows={6} />
        </div>
      ) : (
        <div className="space-y-4">
          <Card>
            <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                  {job.data.title}
                </h2>
                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-slate-500">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" aria-hidden />
                    {job.data.location}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Wallet className="h-4 w-4" aria-hidden />
                    {formatStipend(job.data.stipend)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-4 w-4" aria-hidden />
                    {job.data.openings} openings
                  </span>
                  <span>Min CGPA {job.data.minCgpa.toFixed(1)}</span>
                  <span>Posted {formatDate(job.data.postedAt)}</span>
                </div>
                <p className="mt-4 max-w-prose text-sm leading-relaxed text-slate-600">
                  {job.data.description}
                </p>
              </div>

              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-900">Skill bar</p>
                <ul className="mt-3 space-y-2">
                  {job.data.requiredSkills.map((requirement) => (
                    <li
                      key={requirement.skill}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="text-slate-700">{requirement.skill}</span>
                      <span className="text-slate-500">
                        {requirement.requiredScore}+
                        <span className="ml-2 rounded bg-white px-1.5 py-0.5 text-xs text-slate-500">
                          ×{requirement.weight}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-slate-500">
                  Weight decides how much a skill counts toward the match score.
                </p>
              </div>
            </div>
          </Card>

          <Card padded={false}>
            <div className="p-5 pb-0">
              <CardHeader
                title="Ranked candidates"
                description={`${rows.length} of ${all.length} students, ordered by weighted match against this role's skill bar.`}
              />

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <label className="text-sm">
                  <span className="mr-2 text-slate-500">Department</span>
                  <select
                    value={department}
                    onChange={(event) => setDepartment(event.target.value)}
                    className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-900"
                  >
                    <option value="ALL">All</option>
                    {departments.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm">
                  <span className="mr-2 text-slate-500">Status</span>
                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                    className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-900"
                  >
                    {STATUS_FILTERS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex items-center gap-2 text-sm">
                  <span className="text-slate-500">Minimum match</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={minMatch}
                    onChange={(event) => setMinMatch(Number(event.target.value))}
                    className="w-32 accent-indigo-600"
                  />
                  <span className="w-10 tabular-nums text-slate-900">{minMatch}%</span>
                </label>
              </div>
            </div>

            <div className="mt-4 px-2 pb-2">
              {candidates.loading ? (
                <div className="p-3">
                  <CardSkeleton rows={6} />
                </div>
              ) : (
                <DataTable
                  columns={columns}
                  rows={rows}
                  getRowKey={(candidate) => candidate.studentId}
                  highlightRow={(candidate) => candidate.applied}
                  emptyMessage="No candidates match these filters."
                />
              )}
            </div>
          </Card>
        </div>
      )}
    </DashboardShell>
  );
}
