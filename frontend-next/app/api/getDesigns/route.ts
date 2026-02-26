import { NextRequest, NextResponse } from "next/server";
import type { QueryResultRow } from "pg";
import { getDesignCategories } from "@/lib/design-data";
import { query } from "@/lib/db";

type DbDesignRow = QueryResultRow & {
  id: number;
  category: string | null;
  svg_orig: string;
};

function folderFromSvg(svgPath: string): string | null {
  const normalized = svgPath.replaceAll("\\", "/");
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length < 2) {
    return null;
  }
  return parts[parts.length - 2] ?? null;
}

export async function GET(request: NextRequest) {
  const categoryRaw = request.nextUrl.searchParams.get("category");
  const category = categoryRaw ? Number.parseInt(categoryRaw, 10) : undefined;
  const categories = getDesignCategories();
  const categoryIdByFolder = new Map<string, number>(categories.map((item) => [item.folderName, item.id]));

  try {
    const result = await query<DbDesignRow>(
      `
        SELECT id, category, svg_orig
        FROM designs
        WHERE active IS TRUE
        ORDER BY COALESCE(sort_order, 1000000), id
      `,
    );

    const designs = result.rows
      .map((row) => {
        const folderName = row.category ?? folderFromSvg(row.svg_orig) ?? "";
        const categoryID = categoryIdByFolder.get(folderName) ?? null;
        return {
          id: row.id,
          folderName,
          categoryID,
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
