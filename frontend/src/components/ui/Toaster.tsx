"use client";

import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

import { useToast, type ToastTone } from "@/lib/hooks";

const TONES: Record<ToastTone, { wrap: string; icon: typeof Info }> = {
  success: { wrap: "border-emerald-200 bg-white text-emerald-900", icon: CheckCircle2 },
  error: { wrap: "border-rose-200 bg-white text-rose-900", icon: AlertCircle },
  info: { wrap: "border-slate-200 bg-white text-slate-900", icon: Info },
};

const ICON_COLORS: Record<ToastTone, string> = {
  success: "text-emerald-600",
  error: "text-rose-600",
  info: "text-brand-600",
};

export function Toaster() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2"
      role="status"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const tone = TONES[toast.tone];
        const Icon = tone.icon;
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex animate-slide-in items-start gap-3 rounded-xl border px-4 py-3 shadow-lift ${tone.wrap}`}
          >
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${ICON_COLORS[toast.tone]}`} aria-hidden />
            <p className="flex-1 text-sm">{toast.message}</p>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="rounded p-0.5 text-slate-400 hover:text-slate-600"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        );
      })}
    </div>
  );
}
