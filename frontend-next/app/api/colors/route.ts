import { NextResponse } from "next/server";
import type { QueryResultRow } from "pg";
import { query } from "@/lib/db";
import { rateLimitResponse } from "@/lib/rate-limit";

type DbColorRow = QueryResultRow & {
  code: string;
  title: string;
  markup: string | number | null;
  params: unknown;
};

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function asObject(value: unknown): Record<string, unknown> {
  if (!value) {
    return {};
  }
  if (typeof value === "object" && !Array.isArray(value)) {
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

export async function GET(request: Request) {
  const limited = rateLimitResponse(request, "api_colors", {
    limit: 120,
    windowSec: 60,
  });
  if (limited) {
    return limited;
  }

  try {
    const result = await query<DbColorRow>(
      `
        SELECT code, title, markup, params
        FROM colors
        WHERE active IS TRUE
        ORDER BY markup, id
      `,
    );

    const items = result.rows.map((row) => ({
      code: row.code,
      title: row.title,
      markup: asNumber(row.markup, 0),
      params: asObject(row.params),
    }));

    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [], error: "db_unavailable" });
  }
}
