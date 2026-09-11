import { SignJWT, jwtVerify } from "jose";

/**
 * Session handling. The session is a short JWT signed with SESSION_SECRET
 * (HS256) and stored in an HttpOnly cookie. It carries only the username.
 *
 * This module is Edge-runtime safe (jose only, no `fs`, no Node built-ins),
 * so it can be used from middleware as well as from Node route handlers.
 */

export const SESSION_COOKIE_NAME = "cp_session";
export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60; // ~8 hours

export interface SessionPayload {
  username: string;
}

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.trim().length === 0) {
    // Fail clearly instead of silently signing with a weak/empty key.
    throw new Error(
      "SESSION_SECRET is not configured. Set it in .env.local (development) " +
        "or as a Vercel environment variable (production)."
    );
  }
  return new TextEncoder().encode(secret);
}

/** Create a signed session token containing only the username. */
export async function createSessionToken(username: string): Promise<string> {
  return new SignJWT({ username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecretKey());
}

/** Verify a session token; returns the payload or null when invalid/expired. */
export async function verifySessionToken(
  token: string | undefined | null
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.username === "string" && payload.username.length > 0) {
      return { username: payload.username };
    }
    return null;
  } catch {
    return null;
  }
}

/** Cookie options shared by the login/logout handlers. */
export function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}
