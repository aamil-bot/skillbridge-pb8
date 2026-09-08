"use client";

import { Building2, GraduationCap, Lock, Target, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { LoadingState, Skeleton } from "@/components/ui/States";
import * as api from "@/lib/api";
import { cn } from "@/lib/format";
import { useAction, useResource, useToast } from "@/lib/hooks";
import { DEMO_PASSWORD } from "@/lib/mock-data";
import { HOME_FOR_ROLE, useSession } from "@/lib/session";
import type { DemoAccount, Role } from "@/lib/types";

const ROLE_TABS: { role: Role; label: string; icon: typeof GraduationCap; blurb: string }[] = [
  {
    role: "student",
    label: "Student",
    icon: GraduationCap,
    blurb: "See your verified skills, where you fall short, and which roles you actually match.",
  },
  {
    role: "company",
    label: "Company",
    icon: Building2,
    blurb: "Post roles with a skill bar and review candidates ranked against it.",
  },
  {
    role: "tpo",
    label: "Placement office",
    icon: Target,
    blurb: "Track the placement funnel and find the skill gaps holding your cohort back.",
  },
];

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading sign in" />}>
      <SignIn />
    </Suspense>
  );
}

function SignIn() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, ready, signIn } = useSession();
  const { push } = useToast();
  const { pending, run } = useAction();

  const requested = searchParams.get("role");
  const initialRole: Role =
    requested === "company" || requested === "tpo" || requested === "student"
      ? requested
      : "student";

  const [role, setRole] = useState<Role>(initialRole);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const accounts = useResource(() => api.listAccounts(role), [role]);

  // Already signed in and arriving here directly? Go where you belong.
  useEffect(() => {
    if (ready && session && !requested) {
      router.replace(HOME_FOR_ROLE[session.role]);
    }
  }, [ready, session, requested, router]);

  // Default the form to the primary demo account for the selected role.
  useEffect(() => {
    const first = accounts.data?.[0];
    if (first) {
      setEmail(first.email);
      setPassword(DEMO_PASSWORD);
      setError(null);
    }
  }, [accounts.data]);

  async function submit(overrideEmail?: string) {
    const address = (overrideEmail ?? email).trim();
    setError(null);

    if (!address) {
      setError("Enter your email address.");
      return;
    }
    if (!password) {
      setError("Enter your password.");
      return;
    }

    await run(async () => {
      try {
        const response = await api.signIn(role, address, password);
        const next = signIn(response.account);
        push(`Signed in as ${response.account.name}.`);
        router.replace(HOME_FOR_ROLE[next.role]);
      } catch (cause) {
        const message =
          cause instanceof Error ? cause.message : "Sign in failed. Try again.";
        setError(message);
      }
    });
  }

  function signInWith(account: DemoAccount) {
    setEmail(account.email);
    setPassword(DEMO_PASSWORD);
    setError(null);
    void submit(account.email);
  }

  const active = ROLE_TABS.find((tab) => tab.role === role) ?? ROLE_TABS[0];

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto grid min-h-screen max-w-6xl gap-10 px-6 py-12 lg:grid-cols-[1fr_26rem] lg:items-center lg:py-20">
        <div>
          <Link href="/" className="inline-flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-600 text-sm font-bold text-white">
              SB
            </span>
            <span className="text-lg font-semibold tracking-tight text-slate-900">
              SkillBridge
            </span>
          </Link>

          <h1 className="mt-10 max-w-xl text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-4xl">
            Sign in to your placement account.
          </h1>
          <p className="mt-3 max-w-md text-base leading-relaxed text-slate-600">{active.blurb}</p>

          <div className="mt-10">
            <p className="text-sm font-medium text-slate-500">
              Demo accounts — select one to sign in
            </p>

            <div className="mt-3 max-h-[22rem] space-y-2 overflow-y-auto pr-1">
              {accounts.loading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 w-full" />
                ))
              ) : (
                accounts.data?.map((account) => (
                  <button
                    key={account.id}
                    type="button"
                    disabled={pending}
                    onClick={() => signInWith(account)}
                    className="flex w-full items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition-colors hover:border-brand-300 hover:bg-brand-50/40 disabled:opacity-60"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {account.name}
                      </p>
                      <p className="truncate text-xs text-slate-500">{account.detail}</p>
                      <p className="truncate text-xs text-slate-400">{account.email}</p>
                    </div>
                    <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                      {account.id}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
            {ROLE_TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.role}
                  type="button"
                  onClick={() => {
                    setRole(tab.role);
                    setError(null);
                  }}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-md px-2 py-2 text-xs font-medium transition-colors",
                    role === tab.role
                      ? "bg-white text-slate-900 shadow-card"
                      : "text-slate-600 hover:text-slate-900",
                  )}
                  aria-pressed={role === tab.role}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="username"
                placeholder="you@srit.edu.in"
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 placeholder:text-slate-400"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void submit();
                }}
                autoComplete="current-password"
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900"
              />
            </label>

            {error ? (
              <p className="flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {error}
              </p>
            ) : null}

            <Button
              className="w-full"
              size="lg"
              loading={pending}
              onClick={() => void submit()}
            >
              {pending ? "Signing in" : "Sign in"}
            </Button>
          </div>

          <div className="mt-5 flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <p>
              Every demo account uses the password{" "}
              <span className="font-mono font-medium text-slate-900">{DEMO_PASSWORD}</span>. This
              screen stands in for real authentication, which belongs on the backend.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
