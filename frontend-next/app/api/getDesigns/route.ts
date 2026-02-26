import { NextRequest, NextResponse } from "next/server";
import type { QueryResultRow } from "pg";
import { getDesignCategories } from "@/lib/design-data";
import { query } from "@/lib/db";
import { extractFolderFromSvg, extractRenderIdFromSvg } from "@/lib/design-media";

type DbDesignRow = QueryResultRow & {
  id: number;
  category: string | null;
  svg_orig: string;
  base_price: string | number | null;
};

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
  const categories = getDesignCategories();
  const categoryIdByFolder = new Map<string, number>(categories.map((item) => [item.folderName, item.id]));

  try {
    const result = await query<DbDesignRow>(
      `
        SELECT id, category, svg_orig, base_price
        FROM designs
        WHERE active IS TRUE
        ORDER BY COALESCE(sort_order, 1000000), id
      `,
    );

    const designs = result.rows
      .map((row) => {
        const folderName = row.category ?? extractFolderFromSvg(row.svg_orig) ?? "";
        const categoryID = categoryIdByFolder.get(folderName) ?? null;
        const renderId = extractRenderIdFromSvg(row.svg_orig) ?? row.id;
        return {
          id: renderId,
          dbId: row.id,
          folderName,
          categoryID,
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
