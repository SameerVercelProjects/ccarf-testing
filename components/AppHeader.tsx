"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearAllAttempts } from "@/lib/tests/attempt";

/** Minimal application header: brand left, Tests nav, username + Logout right. */
export default function AppHeader({ username }: { username: string }) {
  const router = useRouter();

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* even if the request fails, clear client state and redirect */
    }
    clearAllAttempts();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-14 max-w-content items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/tests" className="font-semibold text-slate-900">
            Certification Practice
          </Link>
          <nav>
            <Link
              href="/tests"
              className="text-sm text-slate-600 hover:text-slate-900"
            >
              Tests
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">{username}</span>
          <button
            onClick={handleLogout}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
