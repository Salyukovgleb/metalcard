import { NextRequest, NextResponse } from "next/server";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { QueryResultRow } from "pg";
import { getDesignCategoryByKey } from "@/lib/design-data";
import { query } from "@/lib/db";
import { extractFolderFromSvg, extractRenderIdFromSvg } from "@/lib/design-media";

type DbDesignRow = QueryResultRow & {
  id: number;
  category: string | null;
  svg_orig: string;
  preview_webp: string | null;
  base_price: string | number | null;
};

const RENDER_COLORS = ["black", "white", "gold"];

function hasStaticRender(folderName: string, renderId: number): boolean {
  if (!folderName || !Number.isFinite(renderId)) {
    return false;
  }

  return RENDER_COLORS.some((color) => {
    const basePath = join(process.cwd(), "public", "renders", folderName, color, String(renderId));
    return existsSync(`${basePath}.webp`) || existsSync(`${basePath}.png`);
  });
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

export async function GET(request: NextRequest) {
  const categoryRaw = request.nextUrl.searchParams.get("category");
  const category = categoryRaw ? Number.parseInt(categoryRaw, 10) : undefined;

  try {
    const result = await query<DbDesignRow>(
      `
        SELECT id, category, svg_orig, preview_webp, base_price
        FROM designs
        WHERE active IS TRUE
        ORDER BY COALESCE(sort_order, 1000000), id
      `,
    );

    const designs = result.rows
      .map((row) => {
        const folderName = row.category ?? extractFolderFromSvg(row.svg_orig) ?? "";
        const categoryID = getDesignCategoryByKey(folderName)?.id ?? null;
        const renderId = extractRenderIdFromSvg(row.svg_orig) ?? row.id;
        return {
          id: renderId,
          dbId: row.id,
          folderName,
          categoryID,
          svgOrig: row.svg_orig,
          previewWebp: row.preview_webp ?? "",
          hasRasterPreview: hasStaticRender(folderName, renderId) || Boolean(row.preview_webp),
          basePrice: asNumber(row.base_price),
        };
      })
      .filter((design) => {
        if (typeof category === "undefined" || Number.isNaN(category)) {
          return true;
        }
        return design.categoryID === category || design.categoryID === null;
      });

    return NextResponse.json({ data: designs });
  } catch {
    return NextResponse.json({ data: [] });
  }
}
