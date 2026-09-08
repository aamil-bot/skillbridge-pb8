"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { demo } from "./api";

/* ------------------------------------------------------------------ */
/* Toasts                                                              */
/* ------------------------------------------------------------------ */

export type ToastTone = "success" | "error" | "info";

export interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastContextValue {
  toasts: Toast[];
  push: (message: string, tone?: ToastTone) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside <AppProvider>");
  return context;
}

/* ------------------------------------------------------------------ */
/* Provider                                                            */
/* ------------------------------------------------------------------ */

export function AppProvider({ children }: { children: ReactNode }) {
  // Restore saved demo state before any screen loads data.
  useState(() => {
    demo.hydrate();
    return true;
  });

  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (message: string, tone: ToastTone = "success") => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, tone, message }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toasts, push, dismiss }), [toasts, push, dismiss]);

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

/* ------------------------------------------------------------------ */
/* Data loading                                                        */
/* ------------------------------------------------------------------ */

/** Re-renders whenever the demo store mutates anywhere in the app. */
export function useDemoRevision(): number {
  return useSyncExternalStore(
    demo.subscribe,
    demo.getRevision,
    () => 0,
  );
}

export interface Resource<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * Loads data through the API client on mount, and again whenever the demo
 * store changes — which is how a company shortlisting shows up on the
 * student's applications screen without any cross-page wiring.
 */
export function useResource<T>(
  loader: () => Promise<T>,
  deps: unknown[],
  options: { enabled?: boolean } = {},
): Resource<T> {
  const enabled = options.enabled ?? true;
  const revision = useDemoRevision();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    if (!enabled) {
      setLoading(true);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    loaderRef
      .current()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Something went wrong");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, revision, nonce, enabled]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return { data, loading, error, reload };
}

/** Tracks an in-flight action so buttons can show progress. */
export function useAction() {
  const [pending, setPending] = useState(false);

  const run = useCallback(async (task: () => Promise<void>) => {
    setPending(true);
    try {
      await task();
    } finally {
      setPending(false);
    }
  }, []);

  return { pending, run };
}
