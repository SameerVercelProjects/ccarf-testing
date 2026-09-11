import { NextResponse } from "next/server";
import { verifyCredentials } from "@/lib/auth/auth";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid username or password." },
      { status: 400 }
    );
  }

  const username =
    typeof (body as any)?.username === "string"
      ? (body as any).username.trim()
      : "";
  const password =
    typeof (body as any)?.password === "string" ? (body as any).password : "";

  if (!username || !password) {
    return NextResponse.json(
      { error: "Invalid username or password." },
      { status: 401 }
    );
  }

  let verifiedUsername: string | null;
  try {
    verifiedUsername = await verifyCredentials(username, password);
  } catch {
    // Configuration/server problem — don't leak details to the browser.
    return NextResponse.json(
      { error: "Unable to sign in right now. Please try again later." },
      { status: 500 }
    );
  }

  if (!verifiedUsername) {
    // Same message regardless of which part was wrong.
    return NextResponse.json(
      { error: "Invalid username or password." },
      { status: 401 }
    );
  }

  const token = await createSessionToken(verifiedUsername);
  const res = NextResponse.json({ ok: true, username: verifiedUsername });
  res.cookies.set(
    SESSION_COOKIE_NAME,
    token,
    sessionCookieOptions(SESSION_MAX_AGE_SECONDS)
  );
  return res;
}
