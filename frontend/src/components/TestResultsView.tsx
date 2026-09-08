"use client";

import { ArrowRight, Award, TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";
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

import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { ChartCard } from "@/components/ui/ChartCard";
import { formatDateTime } from "@/lib/format";
import type { TestResult } from "@/lib/types";

export function TestResultsView({
  result,
  onRetake,
}: {
  result: TestResult;
  onRetake: () => void;
}) {
  const chartData = [...result.skillResults]
    .sort((a, b) => a.score - b.score)
    .map((row) => ({
      skill: row.skill,
      Before: row.previousScore,
      After: row.score,
    }));

  const improved = result.skillResults.filter((row) => row.delta > 0).length;

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
              <Award className="h-4 w-4" aria-hidden />
              Assessment submitted
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
              You answered {result.correctCount} of {result.totalQuestions} correctly
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Submitted {formatDateTime(result.submittedAt)} · {improved} of six skills moved up
            </p>
          </div>

          <div className="flex gap-6">
            <div className="text-right">
              <p className="text-xs font-medium text-slate-500">Test score</p>
              <p className="text-3xl font-semibold tracking-tight text-slate-900">
                {result.overallScore}%
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-slate-500">Career readiness</p>
              <p className="text-3xl font-semibold tracking-tight text-brand-600">
                {result.readiness.score}
              </p>
              <p className="text-xs text-slate-500">{result.readiness.label}</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          title="Skill scores before and after"
          description="Your assessment result is applied to each existing score, not substituted for it."
          className="lg:col-span-2"
          height={320}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 4, right: 24, bottom: 4, left: 8 }}
              barCategoryGap="22%"
            >
              <CartesianGrid horizontal={false} stroke="#e2e8f0" />
              <XAxis
                type="number"
                domain={[0, 100]}
                tick={{ fill: "#64748b", fontSize: 12 }}
                axisLine={{ stroke: "#e2e8f0" }}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="skill"
                width={100}
                tick={{ fill: "#334155", fontSize: 12 }}
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
              <Bar dataKey="Before" fill="#cbd5e1" radius={[0, 4, 4, 0]} />
              <Bar dataKey="After" fill="#4f46e5" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <Card>
          <CardHeader title="Per-skill result" />
          <ul className="mt-4 divide-y divide-slate-100">
            {result.skillResults.map((row) => (
              <li key={row.skill} className="flex items-center justify-between gap-3 py-2.5">
                <div>
                  <p className="text-sm font-medium text-slate-900">{row.skill}</p>
                  <p className="text-xs text-slate-500">
                    {row.correct} of {row.total} correct
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm tabular-nums text-slate-400 line-through">
                    {row.previousScore}
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-slate-900">
                    {row.score}
                  </span>
                  <span
                    className={`inline-flex w-12 items-center justify-end gap-0.5 text-xs font-medium ${
                      row.delta > 0
                        ? "text-emerald-600"
                        : row.delta < 0
                          ? "text-rose-600"
                          : "text-slate-400"
                    }`}
                  >
                    {row.delta > 0 ? (
                      <TrendingUp className="h-3 w-3" aria-hidden />
                    ) : row.delta < 0 ? (
                      <TrendingDown className="h-3 w-3" aria-hidden />
                    ) : null}
                    {row.delta > 0 ? `+${row.delta}` : row.delta}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-sm font-medium text-slate-500">Strongest skills</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {result.strongest.map((skill) => (
              <span
                key={skill}
                className="rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200"
              >
                {skill}
              </span>
            ))}
          </div>
        </Card>
        <Card>
          <p className="text-sm font-medium text-slate-500">Focus next on</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {result.weakest.map((skill) => (
              <span
                key={skill}
                className="rounded-lg bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-700 ring-1 ring-inset ring-rose-200"
              >
                {skill}
              </span>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-900">
              Your job matches have been recalculated
            </p>
            <p className="mt-0.5 text-sm text-slate-500">
              Every match percentage is derived from these scores, so the ranking has already
              shifted.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onRetake}>
              Retake
            </Button>
            <Link href="/student/skill-profile">
              <Button variant="secondary">Skill profile</Button>
            </Link>
            <Link href="/student/matches">
              <Button icon={<ArrowRight className="h-4 w-4" />}>See updated matches</Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
