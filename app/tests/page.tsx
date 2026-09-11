import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import TestCard from "@/components/TestCard";
import { getSession } from "@/lib/auth/auth";
import { getAvailableTests } from "@/lib/tests/test-loader";

export const dynamic = "force-dynamic";

export default async function TestsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const tests = getAvailableTests();

  return (
    <>
      <AppHeader username={session.username} />
      <main className="mx-auto max-w-content px-4 py-10">
        <h1 className="text-2xl font-semibold text-slate-900">
          Available Tests
        </h1>

        {tests.length === 0 ? (
          <p className="mt-6 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
            No tests found. Add an .xlsx file to the <code>/data</code>{" "}
            directory and redeploy.
          </p>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tests.map((test) => (
              <TestCard key={test.id} test={test} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
