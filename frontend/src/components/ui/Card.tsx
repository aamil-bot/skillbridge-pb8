import type { ReactNode } from "react";

import { cn } from "@/lib/format";

export function Card({
  children,
  className,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section className={cn("card", padded && "p-5", className)}>{children}</section>
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {description ? (
          <p className="mt-0.5 max-w-prose text-sm text-slate-500">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  tone?: "neutral" | "positive" | "warning" | "brand";
}) {
  const tones = {
    neutral: "bg-slate-100 text-slate-600",
    positive: "bg-emerald-50 text-emerald-600",
    warning: "bg-amber-50 text-amber-600",
    brand: "bg-brand-50 text-brand-600",
  } as const;

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        {icon ? (
          <span className={cn("rounded-lg p-1.5", tones[tone])}>{icon}</span>
        ) : null}
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}
