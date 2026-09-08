"use client";

import Link from "next/link";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { ChartCard } from "@/components/ui/ChartCard";
import { CardSkeleton, ErrorState } from "@/components/ui/States";
import * as api from "@/lib/api";
import { cn, formatDate } from "@/lib/format";
import { useResource } from "@/lib/hooks";
import { useRequireRole } from "@/lib/session";
import { ASSESSED_SKILLS, type JobMatch, type SkillScore } from "@/lib/types";

/** Average score the open roles ask for — the bar a skill is measured against. */
function marketBar(matches: JobMatch[], skill: string): number | null {
  const requirements = matches.flatMap((match) =>
    match.job.requiredSkills.filter((requirement) => requirement.skill === skill),
  );
  if (requirements.length === 0) return null;
  return Math.round(
    requirements.reduce((sum, requirement) => sum + requirement.requiredScore, 0) /
      requirements.length,
  );
}

export default function SkillProfilePage() {
  const { accountId } = useRequireRole("student");
  const studentId = accountId ?? "";
  const enabled = Boolean(accountId);

  const student = useResource(() => api.getStudent(studentId), [studentId], { enabled });
  const matches = useResource(() => api.getMatches(studentId), [studentId], { enabled });

  if (student.error) {
    return (
      <DashboardShell role="student" title="Skill profile">
        <ErrorState message={student.error} onRetry={student.reload} />
      </DashboardShell>
    );
  }

  const data = student.data;
  const allMatches = matches.data ?? [];
  const skills = data?.skills ?? [];
  const assessed = skills.filter((skill) =>
    (ASSESSED_SKILLS as string[]).includes(skill.skill),
  );

  const radarData = assessed.map((skill) => ({
    skill: skill.skill,
    score: skill.score,
    bar: marketBar(allMatches, skill.skill) ?? 0,
  }));

  const sorted = [...skills].sort((a, b) => b.score - a.score);

  return (
    <DashboardShell
      role="student"
      title="Skill profile"
      description={
        data?.lastAssessmentAt
          ? `Last updated by your assessment on ${formatDate(data.lastAssessmentAt)}`
          : "Scores come from your college record until you take the assessment"
      }
      actions={
        <Link href="/student/test">
          <Button size="sm" variant="secondary">
            {data?.assessmentCompleted ? "Retake assessment" : "Take assessment"}
          </Button>
        </Link>
      }
    >
      {student.loading || matches.loading ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <CardSkeleton rows={6} />
          <CardSkeleton rows={6} />
          <CardSkeleton rows={6} />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <ChartCard
              title="Your six assessed skills"
              description="The lighter shape is the average score the open roles ask for."
              className="lg:col-span-2"
              height={320}
            >
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="72%">
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis
                    dataKey="skill"
                    tick={{ fill: "#334155", fontSize: 12 }}
                  />
                  <PolarRadiusAxis
                    domain={[0, 100]}
                    tick={{ fill: "#94a3b8", fontSize: 10 }}
                    axisLine={false}
                  />
                  <Radar
                    name="Roles ask for"
                    dataKey="bar"
                    stroke="#94a3b8"
                    fill="#cbd5e1"
                    fillOpacity={0.35}
                  />
                  <Radar
                    name="Your score"
                    dataKey="score"
                    stroke="#4f46e5"
                    fill="#6366f1"
                    fillOpacity={0.45}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 10,
                      border: "1px solid #e2e8f0",
                      fontSize: 12,
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </ChartCard>

            <Card>
              <CardHeader title="Where you stand" />
              {data ? (
                <div className="mt-4 space-y-4">
                  <div className="rounded-lg bg-brand-50 p-4">
                    <p className="text-sm font-medium text-brand-900">
                      Career readiness {data.readiness.score}
                    </p>
                    <p className="mt-1 text-sm text-brand-800">{data.readiness.summary}</p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-500">Strongest</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {sorted.slice(0, 3).map((skill) => (
                        <span
                          key={skill.skill}
                          className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700"
                        >
                          {skill.skill} {skill.score}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-500">Needs work</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {sorted
                        .slice(-3)
                        .reverse()
                        .map((skill) => (
                          <span
                            key={skill.skill}
                            className="rounded-md bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700"
                          >
                            {skill.skill} {skill.score}
                          </span>
                        ))}
                    </div>
                  </div>

                  <p className="border-t border-slate-100 pt-3 text-xs text-slate-500">
                    {data.assessmentCompleted
                      ? "Assessment complete. These scores are what recruiters rank you on."
                      : "Take the assessment to replace college estimates with verified scores."}
                  </p>
                </div>
              ) : null}
            </Card>
          </div>

          <Card>
            <CardHeader
              title="All skills"
              description="Each skill is compared with the average bar set by the roles currently open."
            />
            <div className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
              {skills.map((skill) => (
                <SkillDetail
                  key={skill.skill}
                  skill={skill}
                  bar={marketBar(allMatches, skill.skill)}
                />
              ))}
            </div>
          </Card>
        </div>
      )}
    </DashboardShell>
  );
}

function SkillDetail({ skill, bar }: { skill: SkillScore; bar: number | null }) {
  const isGap = bar !== null && skill.score < bar;
  const barTone =
    skill.score >= 80
      ? "bg-emerald-500"
      : skill.score >= 65
        ? "bg-brand-500"
        : skill.score >= 45
          ? "bg-amber-500"
          : "bg-rose-500";

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium text-slate-900">{skill.skill}</p>
        <span className="text-lg font-semibold tabular-nums text-slate-900">
          {skill.score}
        </span>
      </div>

      <div className="relative mt-2 h-2.5 w-full rounded-full bg-slate-100">
        <div
          className={cn("h-full rounded-full", barTone)}
          style={{ width: `${Math.max(2, Math.min(100, skill.score))}%` }}
        />
        {bar !== null ? (
          <span
            className="absolute -top-1 h-[1.125rem] w-0.5 rounded-full bg-slate-900"
            style={{ left: `${Math.min(100, bar)}%` }}
            aria-hidden
          />
        ) : null}
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-2">
        <p className="text-xs text-slate-500">
          {skill.level} · {skill.source}
        </p>
        {bar !== null ? (
          <span
            className={cn(
              "text-xs font-medium",
              isGap ? "text-rose-600" : "text-emerald-600",
            )}
          >
            {isGap ? `${bar - skill.score} below bar` : "Above bar"}
          </span>
        ) : (
          <span className="text-xs text-slate-400">Not required by open roles</span>
        )}
      </div>
    </div>
  );
}
