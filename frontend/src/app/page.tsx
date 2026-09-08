import { ArrowRight, Building2, GraduationCap, Target } from "lucide-react";
import Link from "next/link";

const ROLES = [
  {
    href: "/login?role=student",
    icon: GraduationCap,
    role: "Student",
    who: "STU001 — Aarav Sharma",
    description:
      "Take a skill assessment, see where you stand against real job requirements, and apply to the roles you actually match.",
    cta: "Sign in as student",
    accent: "text-brand-600 bg-brand-50 ring-brand-100",
  },
  {
    href: "/login?role=company",
    icon: Building2,
    role: "Company",
    who: "TECHNOVA",
    description:
      "Post a role with the skill bar you care about, then review candidates ranked by verified scores instead of resume keywords.",
    cta: "Sign in as company",
    accent: "text-emerald-600 bg-emerald-50 ring-emerald-100",
  },
  {
    href: "/login?role=tpo",
    icon: Target,
    role: "College TPO",
    who: "TPO001",
    description:
      "Track the placement funnel across departments and see exactly which skills your students are short of for the roles on offer.",
    cta: "Sign in as TPO",
    accent: "text-amber-600 bg-amber-50 ring-amber-100",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-6 py-16 sm:py-24">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-600 text-sm font-bold text-white">
            SB
          </span>
          <span className="text-lg font-semibold tracking-tight text-slate-900">
            SkillBridge
          </span>
        </div>

        <div className="mt-12 max-w-2xl">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            Placements decided by verified skills, not guesswork.
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            SkillBridge connects students, recruiters and the placement office around one
            shared record of what a student can actually do — assessed, scored and compared
            against the requirements of every open role.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {ROLES.map((role) => {
            const Icon = role.icon;
            return (
              <Link
                key={role.role}
                href={role.href}
                className="group card flex flex-col p-6 transition-shadow hover:shadow-lift focus-visible:shadow-lift"
              >
                <span className={`w-fit rounded-xl p-2.5 ring-1 ring-inset ${role.accent}`}>
                  <Icon className="h-5 w-5" aria-hidden />
                </span>

                <h2 className="mt-4 text-lg font-semibold text-slate-900">{role.role}</h2>
                <p className="mt-0.5 text-sm font-medium text-slate-500">{role.who}</p>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600">
                  {role.description}
                </p>

                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600">
                  {role.cta}
                  <ArrowRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </span>
              </Link>
            );
          })}
        </div>

        <p className="mt-10 text-sm text-slate-500">
          Each role signs in to its own dashboard. All three views read one shared record,
          so a test taken as a student and a shortlist made by a company show up everywhere
          else. Demo accounts are listed on the sign-in screen.
        </p>
      </div>
    </main>
  );
}
