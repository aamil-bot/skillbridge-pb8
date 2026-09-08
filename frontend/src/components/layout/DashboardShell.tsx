"use client";

import {
  Briefcase,
  Building2,
  ClipboardList,
  FileText,
  GraduationCap,
  LayoutDashboard,
  type LucideIcon,
  Menu,
  PlusCircle,
  LogOut,
  RotateCcw,
  Repeat2,
  Target,
  TrendingDown,
  User,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { demo, getDataSource, getHealth } from "@/lib/api";
import { cn } from "@/lib/format";
import { useDemoRevision, useToast } from "@/lib/hooks";
import { useRequireRole, useSession } from "@/lib/session";
import { LoadingState } from "@/components/ui/States";
import type { DataSource, Role } from "@/lib/types";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAVIGATION: Record<Role, NavItem[]> = {
  student: [
    { href: "/student/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/student/test", label: "Skill assessment", icon: ClipboardList },
    { href: "/student/skill-profile", label: "Skill profile", icon: Target },
    { href: "/student/matches", label: "Job matches", icon: Briefcase },
    { href: "/student/applications", label: "Applications", icon: FileText },
    { href: "/student/profile", label: "My profile", icon: User },
  ],
  company: [
    { href: "/company/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/company/jobs/new", label: "Post a job", icon: PlusCircle },
  ],
  tpo: [
    { href: "/tpo/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/tpo/skill-gaps", label: "Skill gaps", icon: TrendingDown },
  ],
};

const ROLE_ICONS: Record<Role, LucideIcon> = {
  student: GraduationCap,
  company: Building2,
  tpo: Target,
};

const ROLE_LABELS: Record<Role, string> = {
  student: "Student",
  company: "Company",
  tpo: "Placement office",
};

export function DashboardShell({
  role,
  title,
  description,
  actions,
  children,
}: {
  role: Role;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const revision = useDemoRevision();
  const { push } = useToast();
  const { session, ready } = useRequireRole(role);
  const { signOut } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [source, setSource] = useState<DataSource>("mock");

  // One health ping tells us whether the FastAPI backend is up; after that the
  // API client keeps the flag current as real requests succeed or fall back.
  useEffect(() => {
    let active = true;
    getHealth()
      .catch(() => undefined)
      .finally(() => {
        if (active) setSource(getDataSource());
      });
    return () => {
      active = false;
    };
  }, [revision]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const PersonaIcon = ROLE_ICONS[role];
  const items = NAVIGATION[role];

  const sidebar = (
    <div className="flex h-full flex-col">
      <Link href="/" className="flex items-center gap-2.5 px-5 py-5">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-sm font-bold text-white">
          SB
        </span>
        <span className="text-[15px] font-semibold tracking-tight text-slate-900">
          SkillBridge
        </span>
      </Link>

      <div className="mx-3 mb-4 flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-brand-600 ring-1 ring-slate-200">
          <PersonaIcon className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-900">{session?.name}</p>
          <p className="truncate text-xs text-slate-500">
            {session?.accountId} · {ROLE_LABELS[role]}
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-3">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-1 border-t border-slate-200 p-3">
        <p className="truncate px-3 pb-1 text-xs text-slate-400" title={session?.detail}>
          {session?.detail}
        </p>

        <Link
          href="/login"
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        >
          <Repeat2 className="h-3.5 w-3.5" aria-hidden />
          Switch account
        </Link>

        <button
          type="button"
          onClick={() => {
            demo.reset();
            push("Demo data reset to its starting state.", "info");
          }}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          Reset demo data
        </button>

        <button
          type="button"
          onClick={() => {
            signOut();
            router.replace("/login");
          }}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-500 hover:bg-rose-50 hover:text-rose-600"
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden />
          Sign out
        </button>
      </div>
    </div>
  );

  if (!ready || !session) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 p-6">
        <div className="w-full max-w-sm">
          <LoadingState label={ready ? "Redirecting to sign in" : "Checking your session"} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:flex">
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:block">
        <div className="sticky top-0 h-screen">{sidebar}</div>
      </aside>

      {menuOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-64 bg-white shadow-lift">{sidebar}</div>
        </div>
      ) : null}

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3.5 sm:px-6">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-semibold tracking-tight text-slate-900">
                {title}
              </h1>
              {description ? (
                <p className="truncate text-sm text-slate-500">{description}</p>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {actions}
              <span
                className={cn(
                  "hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset sm:inline-flex",
                  source === "api"
                    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                    : "bg-slate-100 text-slate-600 ring-slate-200",
                )}
                title={
                  source === "api"
                    ? "Connected to the FastAPI backend"
                    : "Backend unreachable — running on typed mock data"
                }
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    source === "api" ? "bg-emerald-500" : "bg-slate-400",
                  )}
                />
                {source === "api" ? "Live API" : "Mock data"}
              </span>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
