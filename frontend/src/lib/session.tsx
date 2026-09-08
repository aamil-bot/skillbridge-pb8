"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { DemoAccount, Role, Session } from "./types";

const STORAGE_KEY = "skillbridge.session.v1";

interface SessionContextValue {
  session: Session | null;
  /** False until the stored session has been read on the client. */
  ready: boolean;
  signIn: (account: DemoAccount) => Session;
  signOut: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

function readStored(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    return parsed?.accountId && parsed?.role ? parsed : null;
  } catch {
    return null;
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  // Read after mount, never during render, so the server and the first client
  // render agree and hydration stays clean.
  useEffect(() => {
    setSession(readStored());
    setReady(true);
  }, []);

  const signIn = useCallback((account: DemoAccount): Session => {
    const next: Session = {
      role: account.role,
      accountId: account.id,
      name: account.name,
      email: account.email,
      detail: account.detail,
      signedInAt: new Date().toISOString(),
    };
    setSession(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Session lasts for this page only if storage is blocked.
    }
    return next;
  }, []);

  const signOut = useCallback(() => {
    setSession(null);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo(
    () => ({ session, ready, signIn, signOut }),
    [session, ready, signIn, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used inside <SessionProvider>");
  return context;
}

/** Where each role lands after signing in. */
export const HOME_FOR_ROLE: Record<Role, string> = {
  student: "/student/dashboard",
  company: "/company/dashboard",
  tpo: "/tpo/dashboard",
};

/**
 * Sends anyone without a matching session to the sign-in screen and returns the
 * session once it is confirmed. `accountId` is null until then, which is what
 * pages key their data loading on.
 */
export function useRequireRole(role: Role): {
  session: Session | null;
  accountId: string | null;
  ready: boolean;
} {
  const { session, ready } = useSession();
  const router = useRouter();

  const authorized = session?.role === role ? session : null;

  useEffect(() => {
    if (!ready || authorized) return;
    router.replace(`/login?role=${role}`);
  }, [ready, authorized, role, router]);

  return {
    session: authorized,
    accountId: authorized?.accountId ?? null,
    ready,
  };
}
