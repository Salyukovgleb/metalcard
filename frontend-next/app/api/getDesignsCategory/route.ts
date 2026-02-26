import { NextResponse } from "next/server";
import type { QueryResultRow } from "pg";
import { getDesignCategories } from "@/lib/design-data";
import { query } from "@/lib/db";

type DbCategoryRow = QueryResultRow & {
  category: string;
};

export async function GET() {
  const known = getDesignCategories();
  const knownByFolder = new Map(
    known.map((item) => [
      item.folderName,
      { id: item.id, design_name: item.design_name, design_name_uz: item.design_name_uz },
    ]),
  );

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

    const data = result.rows.map((row, index) => {
      const knownCategory = knownByFolder.get(row.category);
      if (knownCategory) {
        return knownCategory;
      }

      return {
        id: 1000 + index,
        design_name: row.category,
        design_name_uz: row.category,
      };
    });

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ data: [] });
  }
}
