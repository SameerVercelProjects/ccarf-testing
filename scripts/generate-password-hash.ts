/**
 * Generate a bcrypt hash for a new user's password.
 *
 * Usage:
 *   npm run generate-password-hash -- "myPassword"
 *
 * Copy the printed hash into config/users.json as the user's passwordHash.
 */
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

async function main() {
  const password = process.argv[2];
  if (!password) {
    console.error('Usage: npm run generate-password-hash -- "yourPassword"');
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  console.log("\nbcrypt hash (copy into config/users.json):\n");
  console.log(hash);
  console.log("");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
