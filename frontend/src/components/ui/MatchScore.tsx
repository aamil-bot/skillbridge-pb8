import { cn } from "@/lib/format";

export function matchTone(score: number): {
  text: string;
  ring: string;
  bg: string;
  stroke: string;
  label: string;
} {
  if (score >= 80)
    return {
      text: "text-emerald-700",
      ring: "ring-emerald-200",
      bg: "bg-emerald-50",
      stroke: "#059669",
      label: "Strong match",
    };
  if (score >= 65)
    return {
      text: "text-brand-700",
      ring: "ring-brand-200",
      bg: "bg-brand-50",
      stroke: "#4f46e5",
      label: "Good match",
    };
  if (score >= 45)
    return {
      text: "text-amber-700",
      ring: "ring-amber-200",
      bg: "bg-amber-50",
      stroke: "#d97706",
      label: "Partial match",
    };
  return {
    text: "text-rose-700",
    ring: "ring-rose-200",
    bg: "bg-rose-50",
    stroke: "#e11d48",
    label: "Weak match",
  };
}

/** The headline number on a job card. Deliberately the loudest thing there. */
export function MatchScore({
  score,
  size = "md",
  showLabel = true,
}: {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}) {
  const tone = matchTone(score);
  const sizes = {
    sm: { wrap: "px-2.5 py-1", value: "text-base", label: "text-[10px]" },
    md: { wrap: "px-3 py-1.5", value: "text-2xl", label: "text-[10px]" },
    lg: { wrap: "px-4 py-2", value: "text-4xl", label: "text-xs" },
  }[size];

  return (
    <div
      className={cn(
        "inline-flex flex-col items-center rounded-xl ring-1 ring-inset",
        tone.bg,
        tone.ring,
        sizes.wrap,
      )}
    >
      <span className={cn("font-semibold leading-none tracking-tight", tone.text, sizes.value)}>
        {score}%
      </span>
      {showLabel ? (
        <span className={cn("mt-1 font-semibold uppercase tracking-wide", tone.text, sizes.label)}>
          match
        </span>
      ) : null}
    </div>
  );
}

/** Circular variant used on the match detail header. */
export function MatchRing({ score, caption }: { score: number; caption?: string }) {
  const tone = matchTone(score);
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(100, Math.max(0, score)) / 100);

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-32 w-32">
        <svg viewBox="0 0 120 120" className="h-32 w-32 -rotate-90">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="10" />
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={tone.stroke}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-3xl font-semibold tracking-tight", tone.text)}>
            {score}%
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            match
          </span>
        </div>
      </div>
      <p className={cn("mt-2 text-sm font-medium", tone.text)}>{caption ?? tone.label}</p>
    </div>
  );
}
