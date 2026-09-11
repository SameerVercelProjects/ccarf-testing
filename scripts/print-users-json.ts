/**
 * Print config/users.json as a single line, ready to paste as the value of the
 * USERS_JSON environment variable in Vercel.
 *
 * Usage:
 *   npm run print-users-json
 */
import fs from "node:fs";
import path from "node:path";

const usersPath = path.join(process.cwd(), "config", "users.json");

let raw: string;
try {
  raw = fs.readFileSync(usersPath, "utf8");
} catch {
  console.error(
    "config/users.json not found. Create it from config/users.example.json first."
  );
  process.exit(1);
}

let parsed: unknown;
try {
  parsed = JSON.parse(raw);
} catch {
  console.error("config/users.json is not valid JSON.");
  process.exit(1);
}

if (!Array.isArray(parsed)) {
  console.error("config/users.json must be a JSON array of users.");
  process.exit(1);
}

// Single-line JSON — paste this as the USERS_JSON value in Vercel.
console.log(JSON.stringify(parsed));
