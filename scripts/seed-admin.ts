// Creates the first admin user for a fresh deployment. Run via `npm run seed:admin`.
// Reads SEED_ADMIN_NAME / SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD from the environment;
// prompts interactively for whichever of those are missing.
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import { Pool } from "pg";
import { hashPassword } from "../lib/auth/password.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  const envPath = resolve(__dirname, "..", ".env.local");
  if (!existsSync(envPath)) return;
  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    const value = rawValue.split("#")[0].trim();
    if (value && !process.env[key]) process.env[key] = value;
  }
}

async function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}

async function main() {
  loadEnvLocal();

  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.",
    );
  }

  const fullName =
    process.env.SEED_ADMIN_NAME || (await prompt("Admin full name: "));
  const email = (
    process.env.SEED_ADMIN_EMAIL || (await prompt("Admin email: "))
  )
    .trim()
    .toLowerCase();
  const password =
    process.env.SEED_ADMIN_PASSWORD ||
    (await prompt("Admin password (min 8 chars): "));

  if (!fullName || !email.includes("@") || password.length < 8) {
    throw new Error(
      "Name, a valid email, and an 8+ character password are all required.",
    );
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    const roleResult = await pool.query<{ id: number }>(
      `SELECT id FROM roles WHERE name = 'admin'`,
    );
    const adminRoleId = roleResult.rows[0]?.id;
    if (!adminRoleId) {
      throw new Error(
        "No 'admin' row in roles — has schema/schema.sql been applied?",
      );
    }

    const existing = await pool.query(`SELECT id FROM users WHERE email = $1`, [
      email,
    ]);
    if (existing.rows.length > 0) {
      throw new Error(`A user with email ${email} already exists.`);
    }

    const passwordHash = await hashPassword(password);
    const result = await pool.query<{ id: string }>(
      `INSERT INTO users (full_name, email, password_hash, role_id, is_active)
       VALUES ($1, $2, $3, $4, TRUE)
       RETURNING id`,
      [fullName, email, passwordHash, adminRoleId],
    );

    console.log(`Admin user created: ${email} (id ${result.rows[0].id})`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
