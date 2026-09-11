/** Score block shown on the results screen. */
export default function ScoreSummary({
  testName,
  total,
  correct,
}: {
  testName: string;
  total: number;
  correct: number;
}) {
  const incorrect = total - correct;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <div className="text-center">
      <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
        Test Complete
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-slate-900">{testName}</h1>

      <div className="mt-6">
        <p className="text-sm text-slate-500">Score</p>
        <p className="mt-1 text-4xl font-bold text-slate-900">
          {correct} / {total}
        </p>
        <p className="mt-1 text-2xl font-semibold text-brand-600">{pct}%</p>
      </div>

      <div className="mt-6 flex justify-center gap-8 text-sm">
        <div>
          <p className="font-semibold text-green-600">{correct}</p>
          <p className="text-slate-500">Correct</p>
        </div>
        <div>
          <p className="font-semibold text-red-600">{incorrect}</p>
          <p className="text-slate-500">Incorrect</p>
        </div>
      </div>
    </div>
  );
}
