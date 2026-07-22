#!/usr/bin/env node

import crypto from "node:crypto";
import process from "node:process";
import pg from "pg";

function parseArgs(argv) {
  const args = { email: "", name: "Administrator" };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--email") args.email = argv[++index] ?? "";
    else if (arg === "--name") args.name = argv[++index] ?? "";
    else throw new Error(`Unknown argument: ${arg}`);
  }
  args.email = args.email.trim().toLowerCase();
  args.name = args.name.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(args.email)) throw new Error("A valid --email is required");
  if (!args.name) throw new Error("--name cannot be empty");
  return args;
}

async function readPassword() {
  let value = "";
  for await (const chunk of process.stdin) value += chunk;
  return value.replace(/[\r\n]+$/, "");
}

function hashPassword(password) {
  const iterations = 390000;
  const salt = crypto.randomBytes(16).toString("base64url").slice(0, 12);
  const hash = crypto.pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("base64");
  return `pbkdf2_sha256$${iterations}$${salt}$${hash}`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const password = await readPassword();
  if (password.length < 12) throw new Error("Admin password must contain at least 12 characters");

  const client = new pg.Client({
    host: process.env.DB_HOST ?? "db",
    port: Number.parseInt(process.env.DB_PORT ?? "5432", 10),
    database: process.env.DB_NAME ?? "metalcard",
    user: process.env.DB_USER ?? "metalcard",
    password: process.env.DB_PASSWORD ?? "",
    ssl: String(process.env.DB_SSL ?? "false").toLowerCase() === "true" ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();
  try {
    const passwordHash = hashPassword(password);
    const existing = await client.query("SELECT id FROM users WHERE lower(email)=lower($1) LIMIT 1", [args.email]);
    const result = existing.rowCount > 0
      ? await client.query(
          `UPDATE users SET full_name=$2, email=$3, password_hash=$4, updated_at=now()
           WHERE id=$1 RETURNING id, email`,
          [existing.rows[0].id, args.name, args.email, passwordHash],
        )
      : await client.query(
          `INSERT INTO users (full_name, email, password_hash)
           VALUES ($1, $2, $3) RETURNING id, email`,
          [args.name, args.email, passwordHash],
        );
    console.log(`[admin] account ready: id=${result.rows[0].id} email=${result.rows[0].email}`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`[admin] ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
