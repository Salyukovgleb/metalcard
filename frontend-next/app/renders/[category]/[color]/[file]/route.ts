import { NextResponse } from "next/server";
import type { QueryResultRow } from "pg";
import { query } from "@/lib/db";
import { extractRenderIdFromSvg } from "@/lib/design-media";

type Params = {
  params: Promise<{
    category: string;
    color: string;
    file: string;
  }>;
};

type DbDesignRow = QueryResultRow & {
  id: number;
  category: string | null;
  svg_orig: string;
  preview_webp: string | null;
};

function parseRenderFile(fileName: string): { id: number; ext: "png" | "webp" } | null {
  const decoded = decodeURIComponent(fileName).trim();
  const match = decoded.match(/^(\d+)\.(png|webp)$/i);
  if (!match) {
    return null;
  }

  const id = Number.parseInt(match[1] ?? "", 10);
  if (!Number.isFinite(id) || id <= 0) {
    return null;
  }

  return { id, ext: match[2]?.toLowerCase() === "webp" ? "webp" : "png" };
}

function redirectToMedia(request: Request, mediaUrl: string): NextResponse {
  const target = new URL(mediaUrl, request.url);
  const response = NextResponse.redirect(target, 302);
  response.headers.set("Cache-Control", "public, max-age=300");
  return response;
}

export async function GET(request: Request, { params }: Params) {
  const { category, file } = await params;
  const parsed = parseRenderFile(file);
  if (!parsed) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const result = await query<DbDesignRow>(
      `
        SELECT id, category, svg_orig, preview_webp
        FROM designs
        WHERE active IS TRUE
          AND (id = $1 OR category = $2)
        ORDER BY
          CASE WHEN id = $1 THEN 0 ELSE 1 END,
          COALESCE(sort_order, 1000000),
          id
      `,
      [parsed.id, decodeURIComponent(category)],
    );

    const design = result.rows.find(
      (row) => row.id === parsed.id || extractRenderIdFromSvg(row.svg_orig) === parsed.id,
    );
    if (!design?.svg_orig) {
      return new Response("Not found", { status: 404 });
    }

    const mediaUrl = parsed.ext === "webp" ? design.preview_webp || design.svg_orig : design.svg_orig;
    return redirectToMedia(request, mediaUrl);
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
