"use client";

import { Briefcase, Building2, CheckCircle2, FileText, Star, Users } from "lucide-react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, KpiCard } from "@/components/ui/Card";
import { ChartCard } from "@/components/ui/ChartCard";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { CardSkeleton, ErrorState, Skeleton } from "@/components/ui/States";
import * as api from "@/lib/api";
import { useResource } from "@/lib/hooks";
import type { DepartmentPlacement } from "@/lib/types";

const FUNNEL_COLORS = ["#c7d2fe", "#a5b4fc", "#818cf8", "#6366f1", "#4f46e5"];

export default function TpoDashboardPage() {
  const dashboard = useResource(() => api.getTpoDashboard(), []);
  const data = dashboard.data;

  const columns: Column<DepartmentPlacement>[] = [
    {
      key: "department",
      header: "Department",
      render: (row) => <span className="font-medium text-slate-900">{row.department}</span>,
    },
    {
      key: "students",
      header: "Students",
      align: "right",
      render: (row) => <span className="tabular-nums">{row.students}</span>,
    },
    {
      key: "applications",
      header: "Applications",
      align: "right",
      render: (row) => <span className="tabular-nums">{row.applications}</span>,
    },
    {
      key: "selected",
      header: "Placed",
      align: "right",
      render: (row) => <span className="tabular-nums">{row.selected}</span>,
    },
    {
      key: "rate",
      header: "Placement rate",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          <div className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-slate-100 sm:block">
            <div
              className={
                row.placementRate >= 50
                  ? "h-full rounded-full bg-emerald-500"
                  : row.placementRate >= 20
                    ? "h-full rounded-full bg-amber-500"
                    : "h-full rounded-full bg-rose-500"
              }
              style={{ width: `${Math.max(2, row.placementRate)}%` }}
            />
          </div>
          <span className="w-10 text-right font-semibold tabular-nums text-slate-900">
            {row.placementRate}%
          </span>
        </div>
      ),
    },
  ];

  return (
    <DashboardShell
      role="tpo"
      title="Placement overview"
      description={data ? data.college : "Loading college data"}
      actions={
        <Link href="/tpo/skill-gaps">
          <Button size="sm" variant="secondary">
            Skill gap analysis
          </Button>
        </Link>
      }
    >
      {dashboard.error ? (
        <ErrorState message={dashboard.error} onRetry={dashboard.reload} />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {data ? (
              <>
                <KpiCard
                  label="Students"
                  value={data.kpis.totalStudents}
                  icon={<Users className="h-4 w-4" />}
                  tone="brand"
                />
                <KpiCard
                  label="Companies"
                  value={data.kpis.companies}
                  icon={<Building2 className="h-4 w-4" />}
                />
                <KpiCard
                  label="Active jobs"
                  value={data.kpis.activeJobs}
                  icon={<Briefcase className="h-4 w-4" />}
                />
                <KpiCard
                  label="Applications"
                  value={data.kpis.applications}
                  icon={<FileText className="h-4 w-4" />}
                />
                <KpiCard
                  label="Shortlisted"
                  value={data.kpis.shortlisted}
                  icon={<Star className="h-4 w-4" />}
                  tone="warning"
                />
                <KpiCard
                  label="Selected"
                  value={data.kpis.selected}
                  icon={<CheckCircle2 className="h-4 w-4" />}
                  tone="positive"
                />
              </>
            ) : (
              Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="card space-y-3 p-4">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-8 w-12" />
                </div>
              ))
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <ChartCard
              title="Placement funnel"
              description="How far students get, from registered to selected."
              className="lg:col-span-2"
              height={300}
            >
              {dashboard.loading ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data?.funnel ?? []}
                    margin={{ top: 20, right: 16, bottom: 4, left: 0 }}
                  >
                    <CartesianGrid vertical={false} stroke="#e2e8f0" />
                    <XAxis
                      dataKey="stage"
                      tick={{ fill: "#334155", fontSize: 12 }}
                      axisLine={{ stroke: "#e2e8f0" }}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
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
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      <LabelList
                        dataKey="count"
                        position="top"
                        style={{ fill: "#334155", fontSize: 12, fontWeight: 600 }}
                      />
                      {(data?.funnel ?? []).map((entry, index) => (
                        <Cell key={entry.stage} fill={FUNNEL_COLORS[index % FUNNEL_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <Card>
              <CardHeader
                title="Top recruiters"
                description="By offers extended this season."
              />
              {dashboard.loading ? (
                <div className="mt-4">
                  <CardSkeleton rows={3} />
                </div>
              ) : (
                <ul className="mt-4 space-y-3">
                  {(data?.topRecruiters ?? []).map((recruiter) => (
                    <li
                      key={recruiter.company}
                      className="flex items-center justify-between gap-3"
                    >
                      <span className="text-sm font-medium text-slate-900">
                        {recruiter.company}
                      </span>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-sm tabular-nums text-slate-700">
                        {recruiter.selected}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {data ? (
                <div className="mt-5 rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-600">
                    {data.kpis.applications} applications have produced {data.kpis.selected}{" "}
                    offers so far. Use the skill gap view to see what is holding the rest back.
                  </p>
                </div>
              ) : null}
            </Card>
          </div>

          <Card padded={false}>
            <div className="p-5 pb-0">
              <CardHeader
                title="Department performance"
                description="Placement rate counts students with at least one offer."
              />
            </div>
            <div className="mt-4 px-2 pb-2">
              {dashboard.loading ? (
                <div className="p-3">
                  <Skeleton className="h-28 w-full" />
                </div>
              ) : (
                <DataTable
                  columns={columns}
                  rows={data?.departments ?? []}
                  getRowKey={(row) => row.department}
                />
              )}
            </div>
          </Card>
        </div>
      )}
    </DashboardShell>
  );
}
