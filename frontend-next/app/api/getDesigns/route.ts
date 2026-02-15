import { NextRequest, NextResponse } from "next/server";
import { getDesigns } from "@/lib/design-data";

export async function GET(request: NextRequest) {
  const categoryRaw = request.nextUrl.searchParams.get("category");
  const category = categoryRaw ? Number.parseInt(categoryRaw, 10) : undefined;
  const designs = getDesigns(category).map((design) => ({
    id: design.id,
    folderName: design.folderName,
    categoryID: design.categoryID,
  }));

  return NextResponse.json({ data: designs });
}
