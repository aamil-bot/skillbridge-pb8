import type { ReactNode } from "react";

import { cn } from "@/lib/format";

export function ChartCard({
  title,
  description,
  action,
  children,
  className,
  height = 288,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  height?: number;
}) {
  return (
    <section className={cn("card p-5", className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-sm text-slate-500">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      <div className="mt-4" style={{ height }}>
        {children}
      </div>
    </section>
  );
}
