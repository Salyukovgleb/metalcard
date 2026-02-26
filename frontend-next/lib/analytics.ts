import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export type AnalyticsConsent = "accepted" | "rejected" | "unset";

export type AnalyticsIdentity = {
  consent: AnalyticsConsent;
  visitorId: string;
  sessionId: string;
  shouldSetVisitorCookie: boolean;
  shouldSetSessionCookie: boolean;
};

type AnalyticsEventInput = {
  eventName: string;
  path?: string;
  payload?: unknown;
};

export const ANALYTICS_VISITOR_COOKIE = "mc_vid";
export const ANALYTICS_SESSION_COOKIE = "mc_sid";
export const ANALYTICS_CONSENT_COOKIE = "mc_cookie_consent";

const VISITOR_COOKIE = ANALYTICS_VISITOR_COOKIE;
const SESSION_COOKIE = ANALYTICS_SESSION_COOKIE;

const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const SESSION_COOKIE_MAX_AGE = 60 * 60 * 12;
const CONSENT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

let ensureSchemaPromise: Promise<void> | null = null;

function parseCookies(raw: string | null): Record<string, string> {
  if (!raw) {
    return {};
  }

  const out: Record<string, string> = {};
  const parts = raw.split(";");
  for (const part of parts) {
    const idx = part.indexOf("=");
    if (idx <= 0) {
      continue;
    }
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (!key) {
      continue;
    }
    try {
      out[key] = decodeURIComponent(value);
    } catch {
      out[key] = value;
    }
  }
  return out;
}

function normalizeConsent(value: string | undefined): AnalyticsConsent {
  const raw = (value ?? "").trim().toLowerCase();
  if (raw === "accepted") {
    return "accepted";
  }
  if (raw === "rejected") {
    return "rejected";
  }
  return "unset";
}

function isValidId(value: string | undefined, minLength = 8): value is string {
  if (!value) {
    return false;
  }
  if (value.length < minLength || value.length > 128) {
    return false;
  }
  return /^[a-zA-Z0-9._-]+$/.test(value);
}

function randomId(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

function sanitizeEventName(value: string): string {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return "unknown";
  }
  return trimmed.replace(/[^a-z0-9:_-]/g, "_").slice(0, 64) || "unknown";
}

function sanitizePath(value: string | undefined, fallback: string): string {
  const raw = (value ?? "").trim();
  const result = raw || fallback;
  return result.slice(0, 512);
}

function asJsonPayload(payload: unknown): Record<string, unknown> {
  if (!payload) {
    return {};
  }
  if (typeof payload === "object" && !Array.isArray(payload)) {
    const raw = payload as Record<string, unknown>;
    const encoded = JSON.stringify(raw);
    if (encoded.length <= 8000) {
      return raw;
    }
    return { truncated: true };
  }
  return { value: payload };
}

function firstForwardedIp(value: string | null): string {
  if (!value) {
    return "";
  }
  return value.split(",")[0]?.trim().slice(0, 64) ?? "";
}

async function ensureAnalyticsSchema(): Promise<void> {
  if (!ensureSchemaPromise) {
    ensureSchemaPromise = (async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS analytics_events (
          id BIGSERIAL PRIMARY KEY,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          visitor_id TEXT NOT NULL,
          session_id TEXT NOT NULL,
          event_name TEXT NOT NULL,
          path TEXT NOT NULL,
          payload JSONB NOT NULL DEFAULT '{}'::jsonb,
          ip TEXT,
          user_agent TEXT,
          referer TEXT
        )
      `);
      await query(`CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at DESC)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name ON analytics_events(event_name)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_analytics_events_visitor ON analytics_events(visitor_id)`);
    })().catch((error) => {
      ensureSchemaPromise = null;
      throw error;
    });
  }
  await ensureSchemaPromise;
}

export function analyticsIdentityFromRequest(request: Request): AnalyticsIdentity {
  const cookies = parseCookies(request.headers.get("cookie"));
  const consent = normalizeConsent(cookies[ANALYTICS_CONSENT_COOKIE]);

  if (consent !== "accepted") {
    return {
      consent,
      visitorId: "",
      sessionId: "",
      shouldSetVisitorCookie: false,
      shouldSetSessionCookie: false,
    };
  }

  const rawVisitor = cookies[VISITOR_COOKIE];
  const rawSession = cookies[SESSION_COOKIE];

  const visitorId = isValidId(rawVisitor) ? rawVisitor : randomId();
  const sessionId = isValidId(rawSession) ? rawSession : randomId();

  return {
    consent,
    visitorId,
    sessionId,
    shouldSetVisitorCookie: visitorId !== rawVisitor,
    shouldSetSessionCookie: sessionId !== rawSession,
  };
}

export function analyticsConsentFromRequest(request: Request): AnalyticsConsent {
  const cookies = parseCookies(request.headers.get("cookie"));
  return normalizeConsent(cookies[ANALYTICS_CONSENT_COOKIE]);
}

export function setAnalyticsConsentCookie(response: NextResponse, consent: Exclude<AnalyticsConsent, "unset">): void {
  const secure = process.env.NODE_ENV === "production";
  response.cookies.set(ANALYTICS_CONSENT_COOKIE, consent, {
    httpOnly: false,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: CONSENT_COOKIE_MAX_AGE,
  });
}

export function clearAnalyticsCookies(response: NextResponse): void {
  const secure = process.env.NODE_ENV === "production";
  response.cookies.set(VISITOR_COOKIE, "", {
    httpOnly: false,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 0,
  });
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: false,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 0,
  });
}

export function applyAnalyticsCookies(response: NextResponse, identity: AnalyticsIdentity): void {
  if (identity.consent !== "accepted") {
    return;
  }

  const secure = process.env.NODE_ENV === "production";

  if (identity.shouldSetVisitorCookie) {
    response.cookies.set(VISITOR_COOKIE, identity.visitorId, {
      httpOnly: false,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: VISITOR_COOKIE_MAX_AGE,
    });
  }

  response.cookies.set(SESSION_COOKIE, identity.sessionId, {
    httpOnly: false,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: SESSION_COOKIE_MAX_AGE,
  });
}

export async function recordAnalyticsEvent(request: Request, input: AnalyticsEventInput): Promise<AnalyticsIdentity> {
  const identity = analyticsIdentityFromRequest(request);
  if (identity.consent !== "accepted") {
    return identity;
  }

  try {
    const fallbackPath = (() => {
      try {
        return new URL(request.url).pathname;
      } catch {
        return "/";
      }
    })();

    await ensureAnalyticsSchema();
    await query(
      `
        INSERT INTO analytics_events (
          visitor_id,
          session_id,
          event_name,
          path,
          payload,
          ip,
          user_agent,
          referer
        )
        VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)
      `,
      [
        identity.visitorId,
        identity.sessionId,
        sanitizeEventName(input.eventName),
        sanitizePath(input.path, fallbackPath),
        JSON.stringify(asJsonPayload(input.payload)),
        firstForwardedIp(request.headers.get("x-forwarded-for")),
        (request.headers.get("user-agent") ?? "").slice(0, 512),
        (request.headers.get("referer") ?? "").slice(0, 512),
      ],
    );
  } catch {
    // Analytics must never break checkout/order flow.
  }

  return identity;
}
