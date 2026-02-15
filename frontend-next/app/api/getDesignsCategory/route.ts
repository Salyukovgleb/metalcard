import { NextResponse } from "next/server";
import { getDesignCategories } from "@/lib/design-data";

export async function GET() {
  const categories = getDesignCategories().map(({ id, design_name, design_name_uz }) => ({
    id,
    design_name,
    design_name_uz,
  }));

  return NextResponse.json({ data: categories });
}
