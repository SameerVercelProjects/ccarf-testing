/**
 * Post-submit feedback block: Correct/Incorrect status, the correct answer
 * label(s) when the user was wrong, and the explanation. Shown inline on the
 * same screen as the question.
 */
export default function AnswerFeedback({
  correct,
  correctAnswers,
  answers,
  explanation,
}: {
  correct: boolean;
  correctAnswers: number[];
  answers: string[];
  explanation: string;
}) {
  return (
    <div
      className={`mt-6 rounded-xl border p-5 ${
        correct
          ? "border-green-200 bg-green-50"
          : "border-red-200 bg-red-50"
      }`}
    >
      <div
        className={`flex items-center gap-2 font-semibold ${
          correct ? "text-green-700" : "text-red-700"
        }`}
      >
        <span aria-hidden>{correct ? "✓" : "✕"}</span>
        <span>{correct ? "Correct" : "Incorrect"}</span>
      </div>

      {!correct && (
        <div className="mt-3 text-sm text-slate-700">
          <p className="font-medium">
            {correctAnswers.length > 1 ? "Correct Answers:" : "Correct Answer:"}
          </p>
          <ul className="mt-1 space-y-0.5">
            {correctAnswers.map((n) => (
              <li key={n}>{answers[n - 1]}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3 text-sm leading-relaxed text-slate-700">
        <p className="font-medium text-slate-900">Explanation</p>
        <p className="mt-1">{explanation}</p>
      </div>
    </div>
  );
}
