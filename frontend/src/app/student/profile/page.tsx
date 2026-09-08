"use client";

import { CheckCircle2, Lock, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { CardSkeleton, ErrorState } from "@/components/ui/States";
import * as api from "@/lib/api";
import { cn, formatCurrency } from "@/lib/format";
import { useAction, useResource, useToast } from "@/lib/hooks";
import { useRequireRole } from "@/lib/session";
import type { Project } from "@/lib/types";

interface FormErrors {
  preferredCity?: string;
  expectedStipend?: string;
  projects?: string;
}

export default function StudentProfilePage() {
  const { accountId } = useRequireRole("student");
  const studentId = accountId ?? "";
  const enabled = Boolean(accountId);

  const student = useResource(() => api.getStudent(studentId), [studentId], { enabled });
  const { push } = useToast();
  const { pending, run } = useAction();

  const [editing, setEditing] = useState(false);
  const [preferredCity, setPreferredCity] = useState("");
  const [expectedStipend, setExpectedStipend] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const data = student.data;

  // Keep the form in step with whatever the API last returned.
  useEffect(() => {
    if (!data) return;
    setPreferredCity(data.profile.preferredCity);
    setExpectedStipend(String(data.profile.expectedStipend));
    setProjects(data.profile.projects);
  }, [data]);

  function validate(): boolean {
    const next: FormErrors = {};

    if (!preferredCity.trim()) {
      next.preferredCity = "Add a city so recruiters can filter by location.";
    }

    const stipend = Number(expectedStipend);
    if (!expectedStipend.trim() || Number.isNaN(stipend)) {
      next.expectedStipend = "Enter a number.";
    } else if (stipend < 0 || stipend > 200000) {
      next.expectedStipend = "Enter an amount between 0 and 2,00,000.";
    }

    if (projects.some((project) => !project.title.trim())) {
      next.projects = "Every project needs a title.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function save() {
    if (!validate()) {
      push("Fix the highlighted fields before saving.", "error");
      return;
    }

    await run(async () => {
      try {
        await api.updateStudentProfile(studentId, {
          preferredCity: preferredCity.trim(),
          expectedStipend: Number(expectedStipend),
          projects: projects.map((project) => ({
            ...project,
            title: project.title.trim(),
            description: project.description.trim(),
          })),
        });
        setEditing(false);
        setSavedAt(new Date().toISOString());
        push("Profile updated.");
      } catch (cause) {
        push(
          cause instanceof Error ? cause.message : "Your profile could not be saved.",
          "error",
        );
      }
    });
  }

  function cancel() {
    if (!data) return;
    setPreferredCity(data.profile.preferredCity);
    setExpectedStipend(String(data.profile.expectedStipend));
    setProjects(data.profile.projects);
    setErrors({});
    setEditing(false);
  }

  function addProject() {
    setProjects((current) => [
      ...current,
      {
        id: `PRJ-${Date.now()}`,
        title: "",
        description: "",
        techStack: [],
      },
    ]);
  }

  function updateProject(id: string, patch: Partial<Project>) {
    setProjects((current) =>
      current.map((project) => (project.id === id ? { ...project, ...patch } : project)),
    );
  }

  return (
    <DashboardShell
      role="student"
      title="My profile"
      description="Academic details come from your college and cannot be edited here."
      actions={
        data && !editing ? (
          <Button size="sm" onClick={() => setEditing(true)}>
            Edit profile
          </Button>
        ) : null
      }
    >
      {student.error ? (
        <ErrorState message={student.error} onRetry={student.reload} />
      ) : student.loading || !data ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <CardSkeleton rows={6} />
          <CardSkeleton rows={6} />
        </div>
      ) : (
        <div className="space-y-4">
          {savedAt && !editing ? (
            <p className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              Profile updated. Your completion is now {data.profileCompletion}%.
            </p>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
            <Card>
              <CardHeader
                title="College record"
                description="Verified by the placement office."
              />
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                <Lock className="h-3 w-3" aria-hidden />
                Read only
              </span>

              <dl className="mt-4 divide-y divide-slate-100">
                {[
                  ["Registration number", data.academics.registrationNumber],
                  ["Name", data.name],
                  ["Department", data.academics.department],
                  ["Semester", String(data.academics.semester)],
                  ["CGPA", data.academics.cgpa.toFixed(2)],
                  ["Batch", data.academics.batch],
                  ["Active backlogs", String(data.academics.backlogs)],
                  ["College", data.academics.college],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4 py-2.5">
                    <dt className="text-sm text-slate-500">{label}</dt>
                    <dd className="text-right text-sm font-medium text-slate-900">{value}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-4 rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-600">
                  Something wrong here? Contact the placement office — these fields are
                  maintained centrally.
                </p>
              </div>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader
                  title="Preferences"
                  description="Recruiters use these to filter candidates."
                />

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Preferred city"
                    error={errors.preferredCity}
                    readOnly={!editing}
                    value={preferredCity}
                    onChange={setPreferredCity}
                    placeholder="Bengaluru"
                  />
                  <Field
                    label="Expected stipend (₹ per month)"
                    error={errors.expectedStipend}
                    readOnly={!editing}
                    value={editing ? expectedStipend : formatCurrency(data.profile.expectedStipend)}
                    onChange={setExpectedStipend}
                    placeholder="25000"
                    inputMode="numeric"
                  />
                </div>
              </Card>

              <Card>
                <CardHeader
                  title="Projects"
                  description="What you have actually built. This is what recruiters read first."
                  action={
                    editing ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={addProject}
                        icon={<Plus className="h-4 w-4" />}
                      >
                        Add project
                      </Button>
                    ) : null
                  }
                />

                {errors.projects ? (
                  <p className="mt-3 text-sm text-rose-600">{errors.projects}</p>
                ) : null}

                <div className="mt-5 space-y-4">
                  {projects.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                      No projects yet. Add one so recruiters can see your work.
                    </p>
                  ) : (
                    projects.map((project) => (
                      <div
                        key={project.id}
                        className="rounded-lg border border-slate-200 p-4"
                      >
                        {editing ? (
                          <div className="space-y-3">
                            <div className="flex items-start gap-3">
                              <input
                                value={project.title}
                                onChange={(event) =>
                                  updateProject(project.id, { title: event.target.value })
                                }
                                placeholder="Project title"
                                className="h-10 flex-1 rounded-lg border border-slate-300 px-3 text-sm text-slate-900 placeholder:text-slate-400"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setProjects((current) =>
                                    current.filter((item) => item.id !== project.id),
                                  )
                                }
                                className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                aria-label={`Remove ${project.title || "project"}`}
                              >
                                <Trash2 className="h-4 w-4" aria-hidden />
                              </button>
                            </div>
                            <textarea
                              value={project.description}
                              onChange={(event) =>
                                updateProject(project.id, { description: event.target.value })
                              }
                              rows={3}
                              placeholder="What it does, and what you built"
                              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                            />
                            <input
                              value={project.techStack.join(", ")}
                              onChange={(event) =>
                                updateProject(project.id, {
                                  techStack: event.target.value
                                    .split(",")
                                    .map((entry) => entry.trim())
                                    .filter(Boolean),
                                })
                              }
                              placeholder="Tech used, comma separated"
                              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 placeholder:text-slate-400"
                            />
                          </div>
                        ) : (
                          <>
                            <p className="text-sm font-medium text-slate-900">
                              {project.title}
                            </p>
                            <p className="mt-1 text-sm text-slate-600">
                              {project.description}
                            </p>
                            <div className="mt-2.5 flex flex-wrap gap-1.5">
                              {project.techStack.map((tech) => (
                                <span
                                  key={tech}
                                  className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                                >
                                  {tech}
                                </span>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <p className="mt-4 text-xs text-slate-500">
                  Resume upload is not part of this demo — projects entered here are what the
                  company sees.
                </p>
              </Card>

              {editing ? (
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" onClick={cancel} disabled={pending}>
                    Cancel
                  </Button>
                  <Button onClick={save} loading={pending}>
                    {pending ? "Saving" : "Save changes"}
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

function Field({
  label,
  value,
  onChange,
  readOnly,
  error,
  placeholder,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  readOnly: boolean;
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
        readOnly={readOnly}
        placeholder={placeholder}
        inputMode={inputMode}
        aria-invalid={Boolean(error)}
        className={cn(
          "mt-1.5 h-10 w-full rounded-lg border px-3 text-sm text-slate-900 placeholder:text-slate-400",
          readOnly
            ? "border-slate-200 bg-slate-50 text-slate-600"
            : error
              ? "border-rose-400"
              : "border-slate-300",
        )}
      />
      {error ? <span className="mt-1 block text-xs text-rose-600">{error}</span> : null}
    </label>
  );
}
