import { spawnSync } from "node:child_process";

const token = process.env.POSTMARK_SERVER_TOKEN;
if (!token) {
  console.error("POSTMARK_SERVER_TOKEN is missing. Add the rotated token to .env.local first.");
  process.exit(1);
}

const result = spawnSync("npx", ["supabase", "config", "push"], {
  cwd: process.cwd(),
  env: process.env,
  encoding: "utf8"
});

const redact = (value = "") => value.split(token).join("[REDACTED]");
if (result.stdout) process.stdout.write(redact(result.stdout));
if (result.stderr) process.stderr.write(redact(result.stderr));
if (result.error) console.error(`Supabase config push could not start: ${result.error.message}`);
process.exit(result.status ?? 1);
