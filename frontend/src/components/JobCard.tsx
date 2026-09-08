import { Building2, CheckCircle2, MapPin, Wallet } from "lucide-react";
import Link from "next/link";

import { MatchScore } from "@/components/ui/MatchScore";
import { SkillChip } from "@/components/ui/StatusBadge";
import { formatStipend } from "@/lib/format";
import type { JobMatch } from "@/lib/types";

export function JobCard({ match }: { match: JobMatch }) {
  const { job } = match;

  return (
    <article className="card flex flex-col gap-4 p-5 transition-shadow hover:shadow-lift">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-slate-900">{job.title}</h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" aria-hidden />
              {job.companyName}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              {job.location}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5" aria-hidden />
              {formatStipend(job.stipend)}
            </span>
          </div>
        </div>
        <MatchScore score={match.matchScore} size="md" />
      </div>

      <p className="text-sm text-slate-600">{match.reason}</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium text-slate-500">Your strengths</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {match.strengths.length > 0 ? (
              match.strengths.map((skill) => (
                <SkillChip key={skill} skill={skill} status="STRENGTH" />
              ))
            ) : (
              <span className="text-sm text-slate-400">None yet</span>
            )}
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500">Skill gaps</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {match.gaps.length > 0 ? (
              match.gaps.map((skill) => <SkillChip key={skill} skill={skill} status="GAP" />)
            ) : (
              <span className="text-sm text-slate-400">Every requirement met</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <div className="flex flex-wrap gap-1.5">
          {job.requiredSkills.map((requirement) => (
            <span
              key={requirement.skill}
              className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600"
            >
              {requirement.skill} {requirement.requiredScore}+
            </span>
          ))}
        </div>

        {match.applied ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-emerald-700">
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            Applied
          </span>
        ) : null}
      </div>

      <Link
        href={`/student/matches/${job.id}`}
        className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-700"
      >
        {match.applied ? "View application details" : "See why you match"}
      </Link>
    </article>
  );
}
