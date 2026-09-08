"use client";

import { ArrowLeft, Download, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { ChartCard } from "@/components/ui/ChartCard";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { CardSkeleton, EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import { SeverityBadge } from "@/components/ui/StatusBadge";
import * as api from "@/lib/api";
import { cn } from "@/lib/format";
import { useResource, useToast } from "@/lib/hooks";
import { DEPARTMENTS } from "@/lib/mock-data";
import type { SkillGap, SkillGapStudent } from "@/lib/types";

export default function SkillGapsPage() {
  const gaps = useResource(() => api.getSkillGaps(), []);
  const { push } = useToast();

  const [department, setDepartment] = useState("ALL");
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);

  const students = useResource(
    () =>
      selectedSkill
        ? api.getSkillGapStudents(selectedSkill, department)
        : Promise.resolve([] as SkillGapStudent[]),
    [selectedSkill, department],
  );

  const all = gaps.data ?? [];
  const rows = all.filter((row) => department === "ALL" || row.department === department);

  const critical = rows.filter((row) => row.severity === "CRITICAL");

  // One bar pair per skill for the selected department, or averaged across all.
  const chartData = Array.from(new Set(rows.map((row) => row.skill))).map((skill) => {
    const forSkill = rows.filter((row) => row.skill === skill);
    const average = (pick: (row: SkillGap) => number) =>
      Math.round(forSkill.reduce((sum, row) => sum + pick(row), 0) / forSkill.length);

    return {
      skill,
      "Industry demand": average((row) => row.industryDemand),
      "Student average": average((row) => row.studentAverage),
    };
  });

  function exportCsv() {
    const header = [
      "Department",
      "Skill",
      "Industry demand",
      "Student average",
      "Gap",
      "Severity",
      "Students below bar",
    ];
    const lines = rows.map((row) =>
      [
        row.department,
        row.skill,
        row.industryDemand,
        row.studentAverage,
        row.gap,
        row.severity,
        row.studentsBelowBar,
      ].join(","),
    );

    const blob = new Blob([[header.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `skill-gaps-${department.toLowerCase()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    push("Skill gap report downloaded.");
  }

  const gapColumns: Column<SkillGap>[] = [
    {
      key: "skill",
      header: "Skill",
      render: (row) => (
        <button
          type="button"
          onClick={() => setSelectedSkill(row.skill)}
          className={cn(
            "font-medium hover:text-brand-700",
            selectedSkill === row.skill ? "text-brand-700" : "text-slate-900",
          )}
        >
          {row.skill}
        </button>
      ),
    },
    {
      key: "department",
      header: "Dept",
      render: (row) => <span className="text-slate-600">{row.department}</span>,
    },
    {
      key: "demand",
      header: "Industry demand",
      align: "right",
      render: (row) => (
        <span className="font-medium tabular-nums text-brand-700">{row.industryDemand}</span>
      ),
    },
    {
      key: "average",
      header: "Student average",
      align: "right",
      render: (row) => <span className="tabular-nums">{row.studentAverage}</span>,
    },
    {
      key: "gap",
      header: "Gap",
      align: "right",
      render: (row) => (
        <span
          className={cn(
            "font-semibold tabular-nums",
            row.gap >= 20
              ? "text-rose-600"
              : row.gap >= 8
                ? "text-amber-600"
                : "text-emerald-600",
          )}
        >
          {row.gap > 0 ? `−${row.gap}` : "0"}
        </span>
      ),
    },
    {
      key: "below",
      header: "Below bar",
      align: "right",
      render: (row) => <span className="tabular-nums text-slate-600">{row.studentsBelowBar}</span>,
    },
    {
      key: "severity",
      header: "Severity",
      render: (row) => <SeverityBadge severity={row.severity} />,
    },
    {
      key: "action",
      header: "",
      align: "right",
      render: (row) => (
        <button
          type="button"
          onClick={() => setSelectedSkill(row.skill)}
          className="whitespace-nowrap text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          See students
        </button>
      ),
    },
  ];

  const studentColumns: Column<SkillGapStudent>[] = [
    {
      key: "name",
      header: "Student",
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.name}</p>
          <p className="text-xs text-slate-500">
            {row.studentId} · {row.department} · Sem {row.semester}
          </p>
        </div>
      ),
    },
    {
      key: "cgpa",
      header: "CGPA",
      align: "right",
      render: (row) => <span className="tabular-nums">{row.cgpa.toFixed(1)}</span>,
    },
    {
      key: "score",
      header: "Score",
      align: "right",
      render: (row) => <span className="font-medium tabular-nums">{row.score}</span>,
    },
    {
      key: "target",
      header: "Target",
      align: "right",
      render: (row) => <span className="tabular-nums text-slate-500">{row.target}</span>,
    },
    {
      key: "gap",
      header: "Shortfall",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-slate-100 sm:block">
            <div
              className="h-full rounded-full bg-rose-400"
              style={{ width: `${Math.min(100, row.gap * 2)}%` }}
            />
          </div>
          <span className="w-8 text-right font-semibold tabular-nums text-rose-600">
            {row.gap}
          </span>
        </div>
      ),
    },
  ];

  return (
    <DashboardShell
      role="tpo"
      title="Skill gap analysis"
      description="Where student ability sits against what the market is asking for."
      actions={
        <Link href="/tpo/dashboard">
          <Button size="sm" variant="secondary" icon={<ArrowLeft className="h-4 w-4" />}>
            Overview
          </Button>
        </Link>
      }
    >
      {gaps.error ? (
        <ErrorState message={gaps.error} onRetry={gaps.reload} />
      ) : (
        <div className="space-y-4">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-slate-500">Department</span>
                <div className="flex rounded-lg bg-slate-100 p-1">
                  {["ALL", ...DEPARTMENTS].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setDepartment(option)}
                      className={cn(
                        "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                        department === option
                          ? "bg-white text-slate-900 shadow-card"
                          : "text-slate-600 hover:text-slate-900",
                      )}
                    >
                      {option === "ALL" ? "All" : option}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                size="sm"
                variant="secondary"
                icon={<Download className="h-4 w-4" />}
                onClick={exportCsv}
                disabled={rows.length === 0}
              >
                Export CSV
              </Button>
            </div>

            {critical.length > 0 ? (
              <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg bg-rose-50 px-4 py-3">
                <TriangleAlert className="h-4 w-4 shrink-0 text-rose-600" aria-hidden />
                <p className="text-sm text-rose-800">
                  <span className="font-medium">
                    {critical.length} critical{" "}
                    {critical.length === 1 ? "gap" : "gaps"}
                  </span>{" "}
                  — largest is {critical[0].skill} in {critical[0].department}, where students
                  average {critical[0].studentAverage} against a demand of{" "}
                  {critical[0].industryDemand}.
                </p>
              </div>
            ) : null}
          </Card>

          <ChartCard
            title="Industry demand against student average"
            description={
              department === "ALL"
                ? "Averaged across all departments."
                : `${department} students only.`
            }
            height={320}
          >
            {gaps.loading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 8, right: 16, bottom: 4, left: 0 }}
                  barCategoryGap="26%"
                >
                  <CartesianGrid vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="skill"
                    tick={{ fill: "#334155", fontSize: 11 }}
                    axisLine={{ stroke: "#e2e8f0" }}
                    tickLine={false}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={56}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: "#64748b", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "#f1f5f9" }}
                    contentStyle={{
                      borderRadius: 10,
                      border: "1px solid #e2e8f0",
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Industry demand" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Student average" fill="#fb7185" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <Card padded={false}>
            <div className="p-5 pb-0">
              <CardHeader
                title="Gaps by skill"
                description="Ranked by shortfall. Select a skill to see which students need support."
              />
            </div>
            <div className="mt-4 px-2 pb-2">
              {gaps.loading ? (
                <div className="p-3">
                  <CardSkeleton rows={6} />
                </div>
              ) : (
                <DataTable
                  columns={gapColumns}
                  rows={rows}
                  getRowKey={(row) => `${row.department}-${row.skill}`}
                  highlightRow={(row) => row.skill === selectedSkill}
                  emptyMessage="No skill gap data for this department."
                />
              )}
            </div>
          </Card>

          <Card padded={false}>
            <div className="p-5 pb-0">
              <CardHeader
                title={
                  selectedSkill
                    ? `Students below the bar in ${selectedSkill}`
                    : "Students needing support"
                }
                description={
                  selectedSkill
                    ? "Ordered by how far each student is from their department's target."
                    : undefined
                }
                action={
                  selectedSkill ? (
                    <Button size="sm" variant="ghost" onClick={() => setSelectedSkill(null)}>
                      Clear
                    </Button>
                  ) : null
                }
              />
            </div>

            <div className="mt-4 px-2 pb-2">
              {!selectedSkill ? (
                <div className="p-3">
                  <EmptyState
                    title="Pick a skill"
                    description="Select any skill in the table above to see exactly which students are below the target and by how much."
                  />
                </div>
              ) : students.loading ? (
                <div className="p-3">
                  <CardSkeleton rows={4} />
                </div>
              ) : students.error ? (
                <div className="p-3">
                  <ErrorState message={students.error} onRetry={students.reload} />
                </div>
              ) : (
                <DataTable
                  columns={studentColumns}
                  rows={students.data ?? []}
                  getRowKey={(row) => row.studentId}
                  emptyMessage={`No student is below the target for ${selectedSkill}.`}
                />
              )}
            </div>
          </Card>
        </div>
      )}
    </DashboardShell>
  );
}
