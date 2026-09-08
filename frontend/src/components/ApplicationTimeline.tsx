import { Check, X } from "lucide-react";

import { cn } from "@/lib/format";
import type { Application, ApplicationStatus } from "@/lib/types";

const STAGES: { status: ApplicationStatus; label: string }[] = [
  { status: "APPLIED", label: "Applied" },
  { status: "SHORTLISTED", label: "Shortlisted" },
  { status: "INTERVIEW", label: "Interview" },
  { status: "SELECTED", label: "Selected" },
];

export function ApplicationTimeline({ application }: { application: Application }) {
  const reached = new Set(application.timeline.map((event) => event.status));
  const rejected = application.status === "REJECTED";

  return (
    <div>
      <ol className="flex items-start">
        {STAGES.map((stage, index) => {
          const done = reached.has(stage.status);
          const current = application.status === stage.status;
          const isLast = index === STAGES.length - 1;

          return (
            <li key={stage.status} className="flex min-w-0 flex-1 items-start last:flex-none">
              <div className="flex min-w-0 flex-col items-center">
                <span
                  className={cn(
                    "grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold ring-1 ring-inset",
                    done
                      ? "bg-emerald-500 text-white ring-emerald-500"
                      : "bg-white text-slate-400 ring-slate-300",
                    current && "ring-2 ring-offset-2 ring-offset-white",
                  )}
                >
                  {done ? <Check className="h-3.5 w-3.5" aria-hidden /> : index + 1}
                </span>
                <span
                  className={cn(
                    "mt-1.5 text-center text-[11px] font-medium",
                    done ? "text-slate-900" : "text-slate-400",
                  )}
                >
                  {stage.label}
                </span>
              </div>

              {!isLast ? (
                <span
                  className={cn(
                    "mt-3.5 h-0.5 min-w-4 flex-1",
                    reached.has(STAGES[index + 1].status) ? "bg-emerald-500" : "bg-slate-200",
                  )}
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>

      {rejected ? (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700">
          <X className="h-3.5 w-3.5" aria-hidden />
          Closed at the {application.timeline.at(-2)?.status.toLowerCase() ?? "applied"} stage
        </p>
      ) : null}
    </div>
  );
}
