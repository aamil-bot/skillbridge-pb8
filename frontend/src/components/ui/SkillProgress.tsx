import { cn } from "@/lib/format";
import type { SkillLevel, SkillStatus } from "@/lib/types";

function barTone(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 65) return "bg-brand-500";
  if (score >= 45) return "bg-amber-500";
  return "bg-rose-500";
}

export function SkillProgress({
  skill,
  score,
  level,
  source,
  delta,
}: {
  skill: string;
  score: number;
  level?: SkillLevel;
  source?: string;
  delta?: number;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium text-slate-800">{skill}</p>
        <div className="flex items-baseline gap-2">
          {typeof delta === "number" && delta !== 0 ? (
            <span
              className={cn(
                "text-xs font-medium",
                delta > 0 ? "text-emerald-600" : "text-rose-600",
              )}
            >
              {delta > 0 ? `+${delta}` : delta}
            </span>
          ) : null}
          <span className="text-sm font-semibold tabular-nums text-slate-900">{score}</span>
        </div>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn("h-full rounded-full transition-[width] duration-500", barTone(score))}
          style={{ width: `${Math.min(100, Math.max(2, score))}%` }}
        />
      </div>
      {level || source ? (
        <p className="mt-1 text-xs text-slate-500">
          {level}
          {level && source ? " · " : ""}
          {source}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The "You 45 / Required 70 / Gap 25" row. Both bars share one track so the
 * shortfall is visible as distance rather than as a number to read.
 */
export function SkillComparisonBar({
  skill,
  studentScore,
  requiredScore,
  gap,
  status,
}: {
  skill: string;
  studentScore: number;
  requiredScore: number;
  gap: number;
  status: SkillStatus;
}) {
  const isGap = status === "GAP";

  return (
    <div className="py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-sm font-medium text-slate-800">{skill}</p>
        <p className="text-xs text-slate-500">
          You <span className="font-semibold tabular-nums text-slate-900">{studentScore}</span>
          <span className="px-1.5 text-slate-300">/</span>
          Required{" "}
          <span className="font-semibold tabular-nums text-slate-900">{requiredScore}</span>
          <span className="px-1.5 text-slate-300">/</span>
          {isGap ? (
            <span className="font-semibold text-rose-600">Gap {gap}</span>
          ) : (
            <span className="font-semibold text-emerald-600">
              {status === "STRENGTH" ? "Strength" : "Met"}
            </span>
          )}
        </p>
      </div>

      <div className="relative mt-2 h-2.5 w-full rounded-full bg-slate-100">
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full",
            isGap ? "bg-rose-400" : "bg-emerald-500",
          )}
          style={{ width: `${Math.min(100, Math.max(2, studentScore))}%` }}
        />
        <div
          className="absolute -top-1 w-0.5 rounded-full bg-slate-900"
          style={{ left: `${Math.min(100, requiredScore)}%`, height: "1.125rem" }}
          aria-hidden
        />
      </div>
    </div>
  );
}
