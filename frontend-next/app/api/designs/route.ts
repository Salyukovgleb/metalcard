import { NextResponse } from "next/server";
import type { QueryResultRow } from "pg";
import { query } from "@/lib/db";
import { rateLimitResponse } from "@/lib/rate-limit";

type DbDesignRow = QueryResultRow & {
  id: number;
  title: string;
  category: string | null;
  svg_orig: string;
  preview_webp: string | null;
  base_price: string | number | null;
  price_overrides: unknown;
  sort_order: number | null;
};

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
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
  const limited = rateLimitResponse(request, "api_designs", {
    limit: 120,
    windowSec: 60,
  });
  if (limited) {
    return limited;
  }

  try {
    const result = await query<DbDesignRow>(
      `
        SELECT
          id,
          title,
          category,
          svg_orig,
          preview_webp,
          base_price,
          COALESCE(price_overrides, '{}'::jsonb) AS price_overrides,
          sort_order
        FROM designs
        WHERE active IS TRUE
        ORDER BY COALESCE(sort_order, 1000000), id
      `,
    );

    const items = result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      category: row.category ?? "",
      svg_orig: row.svg_orig,
      preview_webp: row.preview_webp,
      base_price: asNumber(row.base_price),
      price_overrides: asObject(row.price_overrides),
      sort_order: row.sort_order,
    }));

    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [], error: "db_unavailable" });
  }
}
