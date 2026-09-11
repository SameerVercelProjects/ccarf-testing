import Link from "next/link";
import type { TestSummary } from "@/lib/tests/test-loader";

/** A single available-test card on the /tests screen. */
export default function TestCard({ test }: { test: TestSummary }) {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{test.name}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {test.questionCount}{" "}
          {test.questionCount === 1 ? "Question" : "Questions"}
        </p>
      </div>
      <Link
        href={`/test/${test.id}`}
        className="mt-6 inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
      >
        Start Test
      </Link>
    </div>
  );
}
