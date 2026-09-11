"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import QuestionProgress from "@/components/QuestionProgress";
import QuestionCard from "@/components/QuestionCard";
import QuestionNavigation from "@/components/QuestionNavigation";
import type { PublicQuestion } from "@/lib/tests/test-loader";
import {
  type TestAttempt,
  allSubmitted,
  createAttempt,
  loadAttempt,
  saveAttempt,
} from "@/lib/tests/attempt";

/**
 * Client-side test driver. Owns the attempt (in sessionStorage), fetches
 * answer-free questions, submits answers for server-side validation, and
 * renders one question at a time with inline feedback.
 */
export default function TestRunner({
  testId,
  testName,
  totalQuestions,
}: {
  testId: string;
  testName: string;
  totalQuestions: number;
}) {
  const router = useRouter();
  const [attempt, setAttempt] = useState<TestAttempt | null>(null);
  // Cache of fetched public questions, keyed by question number.
  const [questions, setQuestions] = useState<Record<number, PublicQuestion>>(
    {}
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const questionsRef = useRef(questions);
  questionsRef.current = questions;

  // Initialize (or resume) the attempt on mount.
  useEffect(() => {
    const existing = loadAttempt(testId);
    if (
      existing &&
      existing.totalQuestions === totalQuestions &&
      !allSubmitted(existing)
    ) {
      setAttempt(existing);
    } else {
      const fresh = createAttempt(testId, testName, totalQuestions);
      saveAttempt(fresh);
      setAttempt(fresh);
    }
  }, [testId, testName, totalQuestions]);

  const current = attempt?.currentQuestion ?? 1;

  // Fetch the current question if not already cached.
  useEffect(() => {
    if (!attempt) return;
    if (questionsRef.current[current]) {
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/tests/${testId}/question?n=${current}`)
      .then(async (res) => {
        if (res.status === 401) {
          router.push("/login");
          return null;
        }
        if (!res.ok) throw new Error("load");
        return (await res.json()) as PublicQuestion;
      })
      .then((data) => {
        if (cancelled || !data) return;
        setQuestions((prev) => ({ ...prev, [data.questionNumber]: data }));
      })
      .catch(() => {
        if (!cancelled) setError("Unable to load this question.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt, current, testId, router]);

  const update = useCallback((next: TestAttempt) => {
    saveAttempt(next);
    setAttempt(next);
  }, []);

  if (!attempt) {
    return <p className="text-sm text-slate-500">Loading…</p>;
  }

  const question = questions[current];
  const state = attempt.questions[current - 1];

  function handleToggle(label: number) {
    if (!attempt || !question) return;
    const qState = attempt.questions[current - 1];
    if (qState.submitted) return;

    let selected: number[];
    if (question.multipleSelect) {
      selected = qState.selected.includes(label)
        ? qState.selected.filter((n) => n !== label)
        : [...qState.selected, label].sort((a, b) => a - b);
    } else {
      selected = [label];
    }

    const nextQuestions = [...attempt.questions];
    nextQuestions[current - 1] = { ...qState, selected };
    update({ ...attempt, questions: nextQuestions });
  }

  async function handleSubmit() {
    if (!attempt) return;
    const qState = attempt.questions[current - 1];
    if (qState.submitted || qState.selected.length === 0) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/tests/${testId}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionNumber: current,
          selectedAnswers: qState.selected,
        }),
      });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) throw new Error("validate");
      const data = (await res.json()) as {
        correct: boolean;
        correctAnswers: number[];
        explanation: string;
      };

      const nextQuestions = [...attempt.questions];
      nextQuestions[current - 1] = {
        ...qState,
        submitted: true,
        correct: data.correct,
        correctAnswers: data.correctAnswers,
        explanation: data.explanation,
      };
      update({ ...attempt, questions: nextQuestions });
    } catch {
      setError("Unable to submit your answer. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function goTo(n: number) {
    if (!attempt) return;
    if (n < 1 || n > attempt.totalQuestions) return;
    update({ ...attempt, currentQuestion: n });
  }

  function handleViewResults() {
    if (!attempt) return;
    if (!allSubmitted(attempt)) return;
    router.push(`/test/${testId}/results`);
  }

  const isFirst = current === 1;
  const isLast = current === attempt.totalQuestions;
  const canSubmit = state.selected.length > 0;

  return (
    <div>
      <QuestionProgress current={current} total={attempt.totalQuestions} />

      <div className="mt-6">
        {error && (
          <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {question ? (
          <QuestionCard
            question={question}
            state={state}
            onToggle={handleToggle}
          />
        ) : loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
            Loading question…
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
            Question unavailable.
          </div>
        )}
      </div>

      {question && (
        <QuestionNavigation
          isFirst={isFirst}
          isLast={isLast}
          submitted={state.submitted}
          canSubmit={canSubmit && !submitting}
          onPrevious={() => goTo(current - 1)}
          onSubmit={handleSubmit}
          onNext={() => goTo(current + 1)}
          onViewResults={handleViewResults}
        />
      )}
    </div>
  );
}
