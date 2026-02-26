import crypto from "node:crypto";
import { cookies } from "next/headers";
import type { QueryResultRow } from "pg";
import { query } from "@/lib/db";

export type AdminUser = {
  id: number;
  fullName: string;
  email: string;
  telegramId: number | null;
};

type DbUserRow = QueryResultRow & {
  id: number;
  full_name: string;
  email: string;
  password_hash: string;
  telegram_id: number | null;
};

const COOKIE_NAME = "mc_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

function sessionSecret(): string {
  return process.env.ADMIN_SESSION_SECRET ?? "mc-admin-dev-secret-change-me";
}

function safeCompare(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function hmac(input: string): string {
  return crypto.createHmac("sha256", sessionSecret()).update(input).digest("hex");
}

function createSessionToken(userId: number): string {
  const payload = {
    uid: userId,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = hmac(encoded);
  return `${encoded}.${signature}`;
}

function parseSessionToken(token: string): { uid: number; exp: number } | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) {
    return null;
  }
  if (!safeCompare(signature, hmac(encoded))) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf-8")) as {
      uid?: unknown;
      exp?: unknown;
    };

    const uid = Number(payload.uid);
    const exp = Number(payload.exp);
    if (!Number.isFinite(uid) || uid <= 0 || !Number.isFinite(exp)) {
      return null;
    }
    if (Math.floor(Date.now() / 1000) > exp) {
      return null;
    }

    return { uid, exp };
  } catch {
    return null;
  }
}

function rowToAdminUser(row: DbUserRow): AdminUser {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    telegramId: row.telegram_id,
  };
}

export async function findUserByEmail(email: string): Promise<(AdminUser & { passwordHash: string }) | null> {
  const normalized = email.trim().toLowerCase();
  const result = await query<DbUserRow>(
    `
      SELECT id, full_name, email, password_hash, telegram_id
      FROM users
      WHERE lower(email) = $1
      LIMIT 1
    `,
    [normalized],
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    ...rowToAdminUser(row),
    passwordHash: row.password_hash,
  };
}

export async function findUserById(id: number): Promise<AdminUser | null> {
  const result = await query<DbUserRow>(
    `
      SELECT id, full_name, email, password_hash, telegram_id
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [id],
  );

  const row = result.rows[0];
  return row ? rowToAdminUser(row) : null;
}

function verifyPbkdf2(password: string, encodedHash: string, digest: "sha256" | "sha1"): boolean {
  const parts = encodedHash.split("$");
  if (parts.length !== 4) {
    return false;
  }

  const iterations = Number.parseInt(parts[1] ?? "", 10);
  const salt = parts[2] ?? "";
  const expected = parts[3] ?? "";

  if (!Number.isFinite(iterations) || iterations <= 0 || !salt || !expected) {
    return false;
  }

  const derived = crypto.pbkdf2Sync(password, salt, iterations, digest === "sha256" ? 32 : 20, digest).toString("base64");
  return safeCompare(derived, expected);
}

export function verifyDjangoPassword(password: string, encodedHash: string): boolean {
  if (!encodedHash) {
    return false;
  }

  if (encodedHash.startsWith("pbkdf2_sha256$")) {
    return verifyPbkdf2(password, encodedHash, "sha256");
  }

  if (encodedHash.startsWith("pbkdf2_sha1$")) {
    return verifyPbkdf2(password, encodedHash, "sha1");
  }

  return safeCompare(password, encodedHash);
}

function randomSalt(length = 12): string {
  return crypto.randomBytes(16).toString("base64url").slice(0, length);
}

export function makeDjangoPasswordHash(password: string): string {
  const iterations = Number.parseInt(process.env.ADMIN_PASSWORD_ITERATIONS ?? "390000", 10) || 390000;
  const salt = randomSalt();
  const hash = crypto.pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("base64");
  return `pbkdf2_sha256$${iterations}$${salt}$${hash}`;
}

export async function setAdminSession(userId: number): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, createSessionToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getSessionAdminUser(): Promise<AdminUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  const payload = parseSessionToken(token);
  if (!payload) {
    return null;
  }

  return findUserById(payload.uid);
}
