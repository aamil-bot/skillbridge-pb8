"use client";

import { AlertTriangle, ChevronLeft, ChevronRight, ClipboardCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { TestResultsView } from "@/components/TestResultsView";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { ErrorState, LoadingState } from "@/components/ui/States";
import * as api from "@/lib/api";
import { cn } from "@/lib/format";
import { useAction, useResource, useToast } from "@/lib/hooks";
import { useRequireRole } from "@/lib/session";
import type { TestResult } from "@/lib/types";

type Stage = "intro" | "taking" | "results";

export default function StudentTestPage() {
  const { accountId } = useRequireRole("student");
  const studentId = accountId ?? "";
  const enabled = Boolean(accountId);

  const questions = useResource(() => api.getTestQuestions(studentId), [studentId], {
    enabled,
  });
  const { push } = useToast();
  const { pending, run } = useAction();

  const [stage, setStage] = useState<Stage>("intro");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<TestResult | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // If the student already finished the assessment, land straight on their result.
  useEffect(() => {
    if (!studentId) return;
    const previous = api.getLastTestResult(studentId);
    if (previous) {
      setResult(previous);
      setStage("results");
    } else {
      setResult(null);
      setStage("intro");
    }
  }, [studentId]);

  const items = questions.data ?? [];
  const total = items.length;
  const answeredCount = Object.keys(answers).length;
  const question = items[current];
  const unanswered = items.filter((item) => !answers[item.id]);

  function startOver() {
    setAnswers({});
    setCurrent(0);
    setResult(null);
    setSubmitError(null);
    setStage("taking");
  }

  async function submit() {
    setConfirming(false);
    setSubmitError(null);

    await run(async () => {
      try {
        const submission = await api.submitTest({
          studentId,
          answers: Object.entries(answers).map(([questionId, optionId]) => ({
            questionId,
            optionId,
          })),
        });
        setResult(submission);
        setStage("results");
        push("Assessment submitted. Your skill scores are updated.");
      } catch (cause) {
        const message =
          cause instanceof Error ? cause.message : "The assessment could not be submitted.";
        setSubmitError(message);
        push(message, "error");
      }
    });
  }

  return (
    <DashboardShell
      role="student"
      title="Skill assessment"
      description="12 questions across six skills. Your scores update as soon as you submit."
    >
      {questions.loading ? (
        <LoadingState label="Loading questions" />
      ) : questions.error ? (
        <ErrorState message={questions.error} onRetry={questions.reload} />
      ) : stage === "results" && result ? (
        <TestResultsView result={result} onRetake={startOver} />
      ) : stage === "intro" ? (
        <IntroCard total={total} onStart={() => setStage("taking")} />
      ) : question ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_16rem]">
          <div className="space-y-4">
            <Card>
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-medium text-slate-500">
                  Question {current + 1} of {total}
                </p>
                <span className="rounded-md bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700">
                  {question.skill}
                </span>
              </div>

              <div
                className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={total}
                aria-valuenow={answeredCount}
                aria-label="Questions answered"
              >
                <div
                  className="h-full rounded-full bg-brand-600 transition-[width] duration-300"
                  style={{ width: `${(answeredCount / total) * 100}%` }}
                />
              </div>

              <h2 className="mt-6 text-lg font-medium leading-snug text-slate-900">
                {question.prompt}
              </h2>

              <div className="mt-5 space-y-2">
                {question.options.map((option) => {
                  const selected = answers[question.id] === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() =>
                        setAnswers((previous) => ({ ...previous, [question.id]: option.id }))
                      }
                      aria-pressed={selected}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors",
                        selected
                          ? "border-brand-500 bg-brand-50 text-brand-900"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-semibold",
                          selected
                            ? "bg-brand-600 text-white"
                            : "bg-slate-100 text-slate-500",
                        )}
                      >
                        {option.id.toUpperCase()}
                      </span>
                      {option.text}
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <Button
                  variant="secondary"
                  onClick={() => setCurrent((index) => Math.max(0, index - 1))}
                  disabled={current === 0}
                  icon={<ChevronLeft className="h-4 w-4" />}
                >
                  Previous
                </Button>

                {current === total - 1 ? (
                  <Button
                    onClick={() => setConfirming(true)}
                    loading={pending}
                    icon={<ClipboardCheck className="h-4 w-4" />}
                  >
                    {pending ? "Submitting" : "Submit assessment"}
                  </Button>
                ) : (
                  <Button
                    onClick={() => setCurrent((index) => Math.min(total - 1, index + 1))}
                    icon={<ChevronRight className="h-4 w-4" />}
                  >
                    Next
                  </Button>
                )}
              </div>
            </Card>

            {submitError ? (
              <ErrorState message={submitError} onRetry={() => setConfirming(true)} />
            ) : null}
          </div>

          <Card className="h-fit lg:sticky lg:top-20">
            <CardHeader title="Questions" description={`${answeredCount} of ${total} answered`} />
            <div className="mt-4 grid grid-cols-6 gap-2 lg:grid-cols-4">
              {items.map((item, index) => {
                const answered = Boolean(answers[item.id]);
                const active = index === current;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCurrent(index)}
                    aria-label={`Go to question ${index + 1}`}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "grid h-9 place-items-center rounded-lg text-sm font-medium transition-colors",
                      active
                        ? "bg-slate-900 text-white"
                        : answered
                          ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200",
                    )}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>

            <Button
              className="mt-4 w-full"
              variant="secondary"
              onClick={() => setConfirming(true)}
              loading={pending}
            >
              Submit assessment
            </Button>
          </Card>
        </div>
      ) : null}

      {confirming ? (
        <ConfirmDialog
          unanswered={unanswered.length}
          total={total}
          pending={pending}
          onCancel={() => setConfirming(false)}
          onConfirm={submit}
        />
      ) : null}
    </DashboardShell>
  );
}

function IntroCard({ total, onStart }: { total: number; onStart: () => void }) {
  return (
    <Card className="mx-auto max-w-2xl">
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600">
        <ClipboardCheck className="h-5 w-5" aria-hidden />
      </span>
      <h2 className="mt-4 text-xl font-semibold tracking-tight text-slate-900">
        Skill assessment
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        {total} multiple-choice questions covering SQL, Python, React, JavaScript, data
        structures and workplace communication — two questions per skill. There is no timer,
        and you can move between questions freely before submitting.
      </p>

      <ul className="mt-5 space-y-2 text-sm text-slate-600">
        {[
          "Each skill is scored separately, so you see exactly where you stand.",
          "Your existing scores move up or down based on how you do.",
          "Job matches recalculate the moment you submit.",
        ].map((line) => (
          <li key={line} className="flex gap-2.5">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden />
            {line}
          </li>
        ))}
      </ul>

      <Button className="mt-6" size="lg" onClick={onStart}>
        Start assessment
      </Button>
    </Card>
  );
}

function ConfirmDialog({
  unanswered,
  total,
  pending,
  onCancel,
  onConfirm,
}: {
  unanswered: number;
  total: number;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="w-full max-w-md animate-fade-in rounded-xl bg-white p-6 shadow-lift"
      >
        <h2 id="confirm-title" className="text-lg font-semibold text-slate-900">
          Submit your assessment?
        </h2>

        {unanswered > 0 ? (
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {unanswered} of {total} questions are still unanswered. They will be marked
            incorrect.
          </p>
        ) : (
          <p className="mt-3 text-sm text-slate-600">
            All {total} questions are answered. Your skill scores and job matches will update
            immediately.
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={pending}>
            Keep answering
          </Button>
          <Button onClick={onConfirm} loading={pending}>
            {pending ? "Submitting" : "Submit"}
          </Button>
        </div>
      </div>
    </div>
  );
}
