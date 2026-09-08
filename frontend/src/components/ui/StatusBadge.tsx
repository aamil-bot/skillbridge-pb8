import { cn } from "@/lib/format";
import type { ApplicationStatus, GapSeverity, SkillStatus } from "@/lib/types";

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  APPLIED: "bg-slate-100 text-slate-700 ring-slate-200",
  SHORTLISTED: "bg-brand-50 text-brand-700 ring-brand-200",
  INTERVIEW: "bg-amber-50 text-amber-700 ring-amber-200",
  SELECTED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  REJECTED: "bg-rose-50 text-rose-700 ring-rose-200",
};

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  APPLIED: "Applied",
  SHORTLISTED: "Shortlisted",
  INTERVIEW: "Interview",
  SELECTED: "Selected",
  REJECTED: "Rejected",
};

export function StatusBadge({
  status,
  className,
}: {
  status: ApplicationStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        STATUS_STYLES[status],
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export function statusLabel(status: ApplicationStatus): string {
  return STATUS_LABELS[status];
}

const SKILL_STATUS_STYLES: Record<SkillStatus, string> = {
  STRENGTH: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  MET: "bg-emerald-50/60 text-emerald-700 ring-emerald-200",
  GAP: "bg-rose-50 text-rose-700 ring-rose-200",
};

export function SkillChip({
  skill,
  status,
  detail,
}: {
  skill: string;
  status: SkillStatus;
  detail?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset",
        SKILL_STATUS_STYLES[status],
      )}
    >
      {skill}
      {detail ? <span className="font-normal opacity-80">{detail}</span> : null}
    </span>
  );
}

const SEVERITY_STYLES: Record<GapSeverity, string> = {
  CRITICAL: "bg-rose-50 text-rose-700 ring-rose-200",
  MODERATE: "bg-amber-50 text-amber-700 ring-amber-200",
  HEALTHY: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

const SEVERITY_LABELS: Record<GapSeverity, string> = {
  CRITICAL: "Critical",
  MODERATE: "Watch",
  HEALTHY: "Healthy",
};

export function SeverityBadge({ severity }: { severity: GapSeverity }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        SEVERITY_STYLES[severity],
      )}
    >
      {SEVERITY_LABELS[severity]}
    </span>
  );
}
