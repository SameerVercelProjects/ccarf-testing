"use client";

import AnswerOption, { type AnswerVisualState } from "./AnswerOption";
import AnswerFeedback from "./AnswerFeedback";
import type { QuestionState } from "@/lib/tests/attempt";
import type { PublicQuestion } from "@/lib/tests/test-loader";

/** Determine the visual state of a single answer option. */
function optionState(
  label: number,
  state: QuestionState
): AnswerVisualState {
  const selected = state.selected.includes(label);
  if (!state.submitted) {
    return selected ? "selected" : "neutral";
  }
  const isCorrect = state.correctAnswers?.includes(label) ?? false;
  if (isCorrect) return "correct";
  if (selected) return "incorrect";
  return "muted";
}

/**
 * The main question view: number, prompt, "Select all that apply" hint for
 * multi-select, the answer cards, and (after submit) inline feedback.
 */
export default function QuestionCard({
  question,
  state,
  onToggle,
}: {
  question: PublicQuestion;
  state: QuestionState;
  onToggle: (label: number) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
        {question.questionNumber}. Question
      </p>

      {question.multipleSelect && (
        <p className="mt-2 text-sm font-medium text-slate-500">
          Select all that apply.
        </p>
      )}

      <h1 className="mt-3 whitespace-pre-line text-lg font-medium leading-relaxed text-slate-900">
        {question.question}
      </h1>

      <div className="mt-6 space-y-3">
        {question.answers.map((text, i) => {
          const label = i + 1;
          return (
            <AnswerOption
              key={label}
              label={label}
              text={text}
              multiple={question.multipleSelect}
              checked={state.selected.includes(label)}
              visualState={optionState(label, state)}
              locked={state.submitted}
              onToggle={onToggle}
            />
          );
        })}
      </div>

      {state.submitted &&
        state.correctAnswers &&
        state.explanation !== null && (
          <AnswerFeedback
            correct={state.correct === true}
            correctAnswers={state.correctAnswers}
            answers={question.answers}
            explanation={state.explanation}
          />
        )}
    </div>
  );
}
