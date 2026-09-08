"use client";

import { Info, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import * as api from "@/lib/api";
import { cn } from "@/lib/format";
import { useAction, useToast } from "@/lib/hooks";
import { TRACKED_SKILLS } from "@/lib/mock-data";
import { useRequireRole } from "@/lib/session";
import type { JobSkill } from "@/lib/types";

interface SkillRow extends JobSkill {
  rowId: string;
}

type Errors = Partial<Record<"title" | "location" | "stipend" | "minCgpa" | "openings" | "description" | "skills", string>>;

export default function NewJobPage() {
  const { accountId } = useRequireRole("company");
  const router = useRouter();
  const { push } = useToast();
  const { pending, run } = useAction();

  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("Bengaluru");
  const [stipend, setStipend] = useState("25000");
  const [minCgpa, setMinCgpa] = useState("7.0");
  const [openings, setOpenings] = useState("3");
  const [description, setDescription] = useState("");
  const [skills, setSkills] = useState<SkillRow[]>([
    { rowId: "row-1", skill: "React", requiredScore: 70, weight: 3 },
    { rowId: "row-2", skill: "JavaScript", requiredScore: 65, weight: 2 },
  ]);
  const [errors, setErrors] = useState<Errors>({});

  function validate(): boolean {
    const next: Errors = {};

    if (!title.trim()) next.title = "Give the role a title.";
    if (!location.trim()) next.location = "Add a work location.";
    if (!description.trim()) {
      next.description = "Describe the role so students know what they are applying to.";
    }

    const stipendValue = Number(stipend);
    if (Number.isNaN(stipendValue) || stipendValue < 0 || stipendValue > 500000) {
      next.stipend = "Enter an amount between 0 and 5,00,000.";
    }

    const cgpaValue = Number(minCgpa);
    if (Number.isNaN(cgpaValue) || cgpaValue < 0 || cgpaValue > 10) {
      next.minCgpa = "CGPA must be between 0 and 10.";
    }

    const openingsValue = Number(openings);
    if (!Number.isInteger(openingsValue) || openingsValue < 1 || openingsValue > 100) {
      next.openings = "Enter a whole number of openings.";
    }

    if (skills.length === 0) {
      next.skills = "Add at least one required skill — matching depends on it.";
    } else if (skills.some((row) => row.requiredScore < 1 || row.requiredScore > 100)) {
      next.skills = "Required scores must be between 1 and 100.";
    } else if (new Set(skills.map((row) => row.skill)).size !== skills.length) {
      next.skills = "Each skill can only be listed once.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit() {
    if (!validate()) {
      push("Check the highlighted fields.", "error");
      return;
    }

    await run(async () => {
      try {
        const response = await api.createJob(
          {
            title: title.trim(),
            location: location.trim(),
            stipend: Number(stipend),
            minCgpa: Number(minCgpa),
            openings: Number(openings),
            description: description.trim(),
            requiredSkills: skills.map(({ skill, requiredScore, weight }) => ({
              skill,
              requiredScore,
              weight,
            })),
          },
          accountId ?? "",
        );

        push(response.message);
        router.push(`/company/jobs/${response.job.id}`);
      } catch (cause) {
        push(
          cause instanceof Error ? cause.message : "The job could not be posted.",
          "error",
        );
      }
    });
  }

  function updateSkill(rowId: string, patch: Partial<JobSkill>) {
    setSkills((current) =>
      current.map((row) => (row.rowId === rowId ? { ...row, ...patch } : row)),
    );
  }

  const available = TRACKED_SKILLS;

  return (
    <DashboardShell
      role="company"
      title="Post a job"
      description="The skill bar you set here is what candidates are ranked against."
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
        <div className="space-y-4">
          <Card>
            <CardHeader title="Role details" />

            <div className="mt-5 space-y-4">
              <TextField
                label="Job title"
                value={title}
                onChange={setTitle}
                error={errors.title}
                placeholder="Frontend Developer Intern"
              />

              <div className="grid gap-4 sm:grid-cols-3">
                <TextField
                  label="Location"
                  value={location}
                  onChange={setLocation}
                  error={errors.location}
                  placeholder="Bengaluru"
                />
                <TextField
                  label="Stipend (₹ per month)"
                  value={stipend}
                  onChange={setStipend}
                  error={errors.stipend}
                  inputMode="numeric"
                />
                <TextField
                  label="Openings"
                  value={openings}
                  onChange={setOpenings}
                  error={errors.openings}
                  inputMode="numeric"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <TextField
                  label="Minimum CGPA"
                  value={minCgpa}
                  onChange={setMinCgpa}
                  error={errors.minCgpa}
                  inputMode="numeric"
                />
              </div>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Description</span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={4}
                  placeholder="What the intern will work on, who they will work with, and what they will learn."
                  aria-invalid={Boolean(errors.description)}
                  className={cn(
                    "mt-1.5 w-full rounded-lg border px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400",
                    errors.description ? "border-rose-400" : "border-slate-300",
                  )}
                />
                {errors.description ? (
                  <span className="mt-1 block text-xs text-rose-600">
                    {errors.description}
                  </span>
                ) : null}
              </label>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Required skills"
              description="Set the score you expect and how much each skill counts."
              action={
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Plus className="h-4 w-4" />}
                  onClick={() =>
                    setSkills((current) => [
                      ...current,
                      {
                        rowId: `row-${Date.now()}`,
                        skill:
                          available.find(
                            (skill) => !current.some((row) => row.skill === skill),
                          ) ?? available[0],
                        requiredScore: 60,
                        weight: 2,
                      },
                    ])
                  }
                >
                  Add skill
                </Button>
              }
            />

            {errors.skills ? (
              <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {errors.skills}
              </p>
            ) : null}

            <div className="mt-5 space-y-3">
              {skills.map((row) => (
                <div
                  key={row.rowId}
                  className="grid items-end gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-[1fr_8rem_8rem_auto]"
                >
                  <label className="block">
                    <span className="text-xs font-medium text-slate-500">Skill</span>
                    <select
                      value={row.skill}
                      onChange={(event) => updateSkill(row.rowId, { skill: event.target.value })}
                      className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-900"
                    >
                      {available.map((skill) => (
                        <option key={skill} value={skill}>
                          {skill}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-xs font-medium text-slate-500">Required score</span>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={row.requiredScore}
                      onChange={(event) =>
                        updateSkill(row.rowId, { requiredScore: Number(event.target.value) })
                      }
                      className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-2 text-sm text-slate-900"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-medium text-slate-500">Weight</span>
                    <select
                      value={row.weight}
                      onChange={(event) =>
                        updateSkill(row.rowId, { weight: Number(event.target.value) })
                      }
                      className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-900"
                    >
                      <option value={1}>1 — nice to have</option>
                      <option value={2}>2 — important</option>
                      <option value={3}>3 — critical</option>
                    </select>
                  </label>

                  <button
                    type="button"
                    onClick={() =>
                      setSkills((current) => current.filter((item) => item.rowId !== row.rowId))
                    }
                    className="mb-1 rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    aria-label={`Remove ${row.skill}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              ))}
            </div>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => router.back()} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={submit} loading={pending}>
              {pending ? "Posting" : "Post job"}
            </Button>
          </div>
        </div>

        <Card className="h-fit lg:sticky lg:top-20">
          <CardHeader title="How ranking works" />
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <p className="flex gap-2.5">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" aria-hidden />
              Each student's verified score for a skill is compared with the required score you
              set.
            </p>
            <p>
              Weight decides how much each skill pulls on the final percentage, so a critical
              skill at weight 3 moves the ranking three times as much as one at weight 1.
            </p>
            <p>
              Students below your minimum CGPA still appear, with a visible penalty applied to
              their match score.
            </p>
            <p className="rounded-lg bg-slate-50 p-3 text-xs">
              Once posted, the role appears on every eligible student's match list right away.
            </p>
          </div>
        </Card>
      </div>
    </DashboardShell>
  );
}

function TextField({
  label,
  value,
  onChange,
  error,
  placeholder,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  inputMode?: "numeric" | "text";
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        aria-invalid={Boolean(error)}
        className={cn(
          "mt-1.5 h-10 w-full rounded-lg border px-3 text-sm text-slate-900 placeholder:text-slate-400",
          error ? "border-rose-400" : "border-slate-300",
        )}
      />
      {error ? <span className="mt-1 block text-xs text-rose-600">{error}</span> : null}
    </label>
  );
}
