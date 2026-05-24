import { NextResponse } from "next/server";
import type { QueryResultRow } from "pg";
import { getDesignCategoryByKey } from "@/lib/design-data";
import { query } from "@/lib/db";

type DbCategoryRow = QueryResultRow & {
  category: string;
};

export async function GET() {
  try {
    const result = await query<DbCategoryRow>(
      `
        SELECT DISTINCT category
        FROM designs
        WHERE active IS TRUE
          AND category IS NOT NULL
          AND category <> ''
        ORDER BY category
      `,
    );

    const seen = new Set<number | string>();
    const data = result.rows
      .map((row, index) => {
        const knownCategory = getDesignCategoryByKey(row.category);
        if (knownCategory) {
          return {
            id: knownCategory.id,
            design_name: knownCategory.design_name,
            design_name_uz: knownCategory.design_name_uz,
          };
        }

        return {
          id: 1000 + index,
          design_name: row.category,
          design_name_uz: row.category,
        };
      })
      .filter((category) => {
        if (seen.has(category.id)) {
          return false;
        }
        seen.add(category.id);
        return true;
      });

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ data: [] });
  }
}
