import Link from "next/link";
import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import TestRunner from "./TestRunner";
import { getSession } from "@/lib/auth/auth";
import { getTestMetadata } from "@/lib/tests/test-loader";

export const dynamic = "force-dynamic";

export default async function TestPage({
  params,
}: {
  params: Promise<{ testId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { testId } = await params;
  const meta = getTestMetadata(testId);

  return (
    <>
      <AppHeader username={session.username} />
      <main className="mx-auto max-w-content px-4 py-8">
        {!meta ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
            <p className="text-slate-700">Unable to load this test.</p>
            <Link
              href="/tests"
              className="mt-4 inline-block text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              Back to Tests
            </Link>
          </div>
        ) : (
          <TestRunner
            testId={meta.id}
            testName={meta.name}
            totalQuestions={meta.questionCount}
          />
        )}
      </main>
    </>
  );
}
