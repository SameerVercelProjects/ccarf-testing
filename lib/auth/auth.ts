import "server-only";
import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE_NAME,
  verifySessionToken,
  type SessionPayload,
} from "./session";

/**
 * File-based authentication. Users live in /config/users.json (server-only,
 * never under /public). Passwords are stored as bcrypt hashes and compared
 * server-side. Hashes are never returned to the browser.
 */

interface StoredUser {
  username: string;
  passwordHash: string;
}

const USERS_PATH = path.join(process.cwd(), "config", "users.json");

function loadUsers(): StoredUser[] {
  let raw: string;
  try {
    raw = fs.readFileSync(USERS_PATH, "utf8");
  } catch {
    throw new Error(
      "Unable to read config/users.json. Create it from config/users.example.json."
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("config/users.json is not valid JSON.");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("config/users.json must be an array of users.");
  }

  return parsed.filter(
    (u): u is StoredUser =>
      !!u &&
      typeof u.username === "string" &&
      typeof u.passwordHash === "string"
  );
}

/**
 * Verify a username/password pair. Returns the username on success or null on
 * failure. Uses a constant-ish flow so we don't leak whether the username or
 * the password was the wrong part.
 */
export async function verifyCredentials(
  username: string,
  password: string
): Promise<string | null> {
  const users = loadUsers();
  const user = users.find((u) => u.username === username);

  // Always run a bcrypt comparison to avoid trivial user-enumeration timing.
  const hash =
    user?.passwordHash ??
    "$2a$10$0000000000000000000000000000000000000000000000000000";

  const ok = await bcrypt.compare(password, hash);
  return ok && user ? user.username : null;
}

/** Read and verify the current session from the request cookies (Node runtime). */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(token);
}
