import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * The /data (Excel tests) and /config (users.json) directories are read at
 * runtime via `fs`. Because they are discovered dynamically (readdir) rather
 * than statically imported, Next.js output file tracing cannot detect them
 * automatically. We force them into every serverless function bundle so the
 * deployed Vercel app can read them at runtime.
 *
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  outputFileTracingRoot: __dirname,
  outputFileTracingIncludes: {
    "/**/*": ["./data/**/*", "./config/**/*"],
  },
};

export default nextConfig;
