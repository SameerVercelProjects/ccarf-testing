"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ScoreSummary from "@/components/ScoreSummary";
import QuestionCard from "@/components/QuestionCard";
import type { PublicQuestion } from "@/lib/tests/test-loader";
import {
  type TestAttempt,
  allSubmitted,
  clearAttempt,
  countCorrect,
  loadAttempt,
} from "@/lib/tests/attempt";

/** Results + read-only review. Reads the completed attempt from sessionStorage. */
export default function ResultsRunner({
  testId,
  testName,
}: {
  testId: string;
  testName: string;
}) {
  const router = useRouter();
  const [attempt, setAttempt] = useState<TestAttempt | null>(null);
  const [ready, setReady] = useState(false);
  const [review, setReview] = useState(false);
  const [questions, setQuestions] = useState<Record<number, PublicQuestion>>(
    {}
  );
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Load the attempt; redirect back into the test if it isn't complete.
  useEffect(() => {
    const existing = loadAttempt(testId);
    if (!existing || !allSubmitted(existing)) {
      router.replace(`/test/${testId}`);
      return;
    }
    setAttempt(existing);
    setReady(true);
  }, [testId, router]);

  // Fetch the (answer-free) question text/answers for review when requested.
  useEffect(() => {
    if (!review || !attempt) return;
    let cancelled = false;
    Promise.all(
      Array.from({ length: attempt.totalQuestions }, (_, i) =>
        fetch(`/api/tests/${testId}/question?n=${i + 1}`).then((res) => {
          if (!res.ok) throw new Error("load");
          return res.json() as Promise<PublicQuestion>;
        })
      )
    )
      .then((list) => {
        if (cancelled) return;
        const map: Record<number, PublicQuestion> = {};
        list.forEach((q) => (map[q.questionNumber] = q));
        setQuestions(map);
      })
      .catch(() => {
        if (!cancelled) setReviewError("Unable to load the review.");
      });
    return () => {
      cancelled = true;
    };
  }, [review, attempt, testId]);

  function handleRetake() {
    clearAttempt(testId);
    router.push(`/test/${testId}`);
  }

  if (!ready || !attempt) {
    return <p className="text-sm text-slate-500">Loading…</p>;
  }

  const correct = countCorrect(attempt);

  return (
    <div>
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <ScoreSummary
          testName={testName}
          total={attempt.totalQuestions}
          correct={correct}
        />

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={() => setReview((r) => !r)}
            className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:w-auto"
          >
            {review ? "Hide Review" : "Review Answers"}
          </button>
          <button
            onClick={handleRetake}
            className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 sm:w-auto"
          >
            Retake Test
          </button>
          <button
            onClick={() => router.push("/tests")}
            className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:w-auto"
          >
            Back to Tests
          </button>
        </div>
      </div>

      {review && (
        <div className="mt-8 space-y-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Review Answers
          </h2>
          {reviewError && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {reviewError}
            </p>
          )}
          {attempt.questions.map((qState, i) => {
            const q = questions[i + 1];
            if (!q) {
              return (
                <div
                  key={i}
                  className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500"
                >
                  Loading question {i + 1}…
                </div>
              );
            }
            return (
              <QuestionCard
                key={i}
                question={q}
                state={qState}
                onToggle={() => {
                  /* read-only in review */
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
