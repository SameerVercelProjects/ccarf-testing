"use client";

/**
 * Bottom navigation row. Submit is shown until the current question is
 * submitted; then Previous / Next (or View Results on the last question).
 */
export default function QuestionNavigation({
  isFirst,
  isLast,
  submitted,
  canSubmit,
  onPrevious,
  onSubmit,
  onNext,
  onViewResults,
}: {
  isFirst: boolean;
  isLast: boolean;
  submitted: boolean;
  canSubmit: boolean;
  onPrevious: () => void;
  onSubmit: () => void;
  onNext: () => void;
  onViewResults: () => void;
}) {
  return (
    <div className="mt-8 flex items-center justify-between">
      <button
        type="button"
        onClick={onPrevious}
        disabled={isFirst}
        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Previous
      </button>

      {!submitted ? (
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Submit Answer
        </button>
      ) : isLast ? (
        <button
          type="button"
          onClick={onViewResults}
          className="rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-green-700"
        >
          View Results
        </button>
      ) : (
        <button
          type="button"
          onClick={onNext}
          className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
        >
          Next Question
        </button>
      )}
    </div>
  );
}
