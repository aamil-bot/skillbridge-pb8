"use client";

import { AlertCircle, Inbox, Loader2, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/format";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-slate-200/70", className)} />;
}

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-12 text-sm text-slate-500">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      {label}
    </div>
  );
}

export function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="card space-y-3 p-5">
      <Skeleton className="h-4 w-40" />
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-3 w-full" />
      ))}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-6 py-10 text-center">
      <AlertCircle className="h-6 w-6 text-rose-600" aria-hidden />
      <div>
        <p className="text-sm font-medium text-rose-900">That did not load</p>
        <p className="mt-1 text-sm text-rose-700">{message}</p>
      </div>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-50"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <span className="rounded-full bg-slate-100 p-3 text-slate-400">
        {icon ?? <Inbox className="h-5 w-5" aria-hidden />}
      </span>
      <div>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">{description}</p>
      </div>
      {action}
    </div>
  );
}
