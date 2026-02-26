import type { QueryResultRow } from "pg";
import { query } from "@/lib/db";

export type AnalyticsOverview = {
  available: boolean;
  visitors24h: number;
  visitors7d: number;
  sessions24h: number;
  pageViews24h: number;
  events24h: number;
  orders24h: number;
};

export type AnalyticsTopEvent = {
  eventName: string;
  count: number;
};

export type AnalyticsTopPath = {
  path: string;
  count: number;
  visitors: number;
  sessions: number;
};

export type AnalyticsRecentEvent = {
  id: number;
  createdAt: string;
  eventName: string;
  path: string;
  visitorId: string;
  sessionId: string;
  payload: Record<string, unknown>;
  ip: string;
  userAgent: string;
  referer: string;
};

export type AnalyticsRecentOptions = {
  limit?: number;
  hours?: number;
  eventName?: string;
  pathContains?: string;
};

function asInt(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value);
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function asString(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return "";
}

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
  }
  return {};
}

function clamp(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return Math.floor(value);
}

function sanitizeEventName(value: string | undefined): string {
  const raw = (value ?? "").trim().toLowerCase();
  if (!raw) {
    return "";
  }
  return raw.replace(/[^a-z0-9:_-]/g, "_").slice(0, 64);
}

async function tableExists(): Promise<boolean> {
  const result = await query<{ exists: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'analytics_events'
      ) AS exists
    `,
  );
  return Boolean(result.rows[0]?.exists);
}

export async function getAnalyticsOverview(): Promise<AnalyticsOverview> {
  try {
    const exists = await tableExists();
    if (!exists) {
      return {
        available: false,
        visitors24h: 0,
        visitors7d: 0,
        sessions24h: 0,
        pageViews24h: 0,
        events24h: 0,
        orders24h: 0,
      };
    }

    const result = await query<
      QueryResultRow & {
        visitors_24h: string;
        visitors_7d: string;
        sessions_24h: string;
        page_views_24h: string;
        events_24h: string;
        orders_24h: string;
      }
    >(
      `
        SELECT
          count(DISTINCT visitor_id) FILTER (WHERE created_at >= now() - interval '24 hours')::text AS visitors_24h,
          count(DISTINCT visitor_id) FILTER (WHERE created_at >= now() - interval '7 days')::text AS visitors_7d,
          count(DISTINCT session_id) FILTER (WHERE created_at >= now() - interval '24 hours')::text AS sessions_24h,
          count(*) FILTER (WHERE created_at >= now() - interval '24 hours' AND event_name = 'page_view')::text AS page_views_24h,
          count(*) FILTER (WHERE created_at >= now() - interval '24 hours')::text AS events_24h,
          count(*) FILTER (
            WHERE created_at >= now() - interval '24 hours'
              AND event_name IN ('order_submit', 'order_create', 'promo_order_create')
          )::text AS orders_24h
        FROM analytics_events
      `,
    );

    const row = result.rows[0];
    return {
      available: true,
      visitors24h: asInt(row?.visitors_24h),
      visitors7d: asInt(row?.visitors_7d),
      sessions24h: asInt(row?.sessions_24h),
      pageViews24h: asInt(row?.page_views_24h),
      events24h: asInt(row?.events_24h),
      orders24h: asInt(row?.orders_24h),
    };
  } catch {
    return {
      available: false,
      visitors24h: 0,
      visitors7d: 0,
      sessions24h: 0,
      pageViews24h: 0,
      events24h: 0,
      orders24h: 0,
    };
  }
}

export async function getTopAnalyticsEvents(limit = 10, hours = 24): Promise<AnalyticsTopEvent[]> {
  try {
    const exists = await tableExists();
    if (!exists) {
      return [];
    }

    const safeLimit = clamp(limit, 1, 100, 10);
    const safeHours = clamp(hours, 1, 24 * 30, 24);

    const result = await query<QueryResultRow & { event_name: string; cnt: string }>(
      `
        SELECT event_name, count(*)::text AS cnt
        FROM analytics_events
        WHERE created_at >= now() - make_interval(hours => $2::int)
        GROUP BY event_name
        ORDER BY count(*) DESC, event_name ASC
        LIMIT $1
      `,
      [safeLimit, safeHours],
    );

    return result.rows.map((row) => ({
      eventName: row.event_name,
      count: asInt(row.cnt),
    }));
  } catch {
    return [];
  }
}

export async function getTopAnalyticsPaths(limit = 10, hours = 24): Promise<AnalyticsTopPath[]> {
  try {
    const exists = await tableExists();
    if (!exists) {
      return [];
    }

    const safeLimit = clamp(limit, 1, 100, 10);
    const safeHours = clamp(hours, 1, 24 * 30, 24);

    const result = await query<QueryResultRow & { path: string; cnt: string; visitors: string; sessions: string }>(
      `
        SELECT
          path,
          count(*)::text AS cnt,
          count(DISTINCT visitor_id)::text AS visitors,
          count(DISTINCT session_id)::text AS sessions
        FROM analytics_events
        WHERE created_at >= now() - make_interval(hours => $2::int)
        GROUP BY path
        ORDER BY count(*) DESC, path ASC
        LIMIT $1
      `,
      [safeLimit, safeHours],
    );

    return result.rows.map((row) => ({
      path: row.path,
      count: asInt(row.cnt),
      visitors: asInt(row.visitors),
      sessions: asInt(row.sessions),
    }));
  } catch {
    return [];
  }
}

export async function getRecentAnalyticsEvents(options: AnalyticsRecentOptions = {}): Promise<AnalyticsRecentEvent[]> {
  try {
    const exists = await tableExists();
    if (!exists) {
      return [];
    }

    const safeLimit = clamp(options.limit ?? 100, 1, 500, 100);
    const safeHours = clamp(options.hours ?? 24, 1, 24 * 30, 24);
    const safeEventName = sanitizeEventName(options.eventName);
    const safePathContains = (options.pathContains ?? "").trim().slice(0, 256);

    const result = await query<
      QueryResultRow & {
        id: number;
        created_at: Date | string;
        event_name: string;
        path: string;
        visitor_id: string;
        session_id: string;
        payload: unknown;
        ip: string | null;
        user_agent: string | null;
        referer: string | null;
      }
    >(
      `
        SELECT
          id,
          created_at,
          event_name,
          path,
          visitor_id,
          session_id,
          payload,
          ip,
          user_agent,
          referer
        FROM analytics_events
        WHERE created_at >= now() - make_interval(hours => $1::int)
          AND ($2::text = '' OR event_name = $2::text)
          AND ($3::text = '' OR path ILIKE '%' || $3::text || '%')
        ORDER BY created_at DESC
        LIMIT $4
      `,
      [safeHours, safeEventName, safePathContains, safeLimit],
    );

    return result.rows.map((row) => ({
      id: row.id,
      createdAt: asString(row.created_at),
      eventName: row.event_name,
      path: row.path,
      visitorId: row.visitor_id,
      sessionId: row.session_id,
      payload: asObject(row.payload),
      ip: asString(row.ip),
      userAgent: asString(row.user_agent),
      referer: asString(row.referer),
    }));
  } catch {
    return [];
  }
}
