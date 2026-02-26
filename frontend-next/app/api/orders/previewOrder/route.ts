import { NextResponse } from "next/server";
import type { QueryResultRow } from "pg";
import { cardColorsToRenderColors } from "@/lib/card-colors";
import { applyAnalyticsCookies, recordAnalyticsEvent } from "@/lib/analytics";
import { query } from "@/lib/db";
import { getDrawApp } from "@/lib/draw-app";
import type { OrderPayload } from "@/lib/order-store";

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

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as OrderPayload;
    if (!payload || typeof payload.design !== "number") {
      return NextResponse.json({ message: "Неправильные данные" }, { status: 400 });
    }
    const normalizedPayload: OrderPayload = {
      ...payload,
      bigChip: false,
      logoDeactive: false,
    };

    const designResult = await query<DbDesignRow>(
      `
        SELECT id, category, svg_orig
        FROM designs
        WHERE id = $1 AND active IS TRUE
        LIMIT 1
      `,
      [payload.design],
    );
    const design = designResult.rows[0];
    const folderName = design ? design.category ?? folderFromSvg(design.svg_orig) : null;
    if (!design || !folderName) {
      return NextResponse.json({ message: "Неправильные данные" }, { status: 400 });
    }

    const drawApp = await getDrawApp();
    const sideA = drawApp.drawTextOnSideA(normalizedPayload.cardAData);
    const sideB = drawApp.drawTextOnSideB(normalizedPayload.cardBData, normalizedPayload.cardNum, normalizedPayload.cardTime);

    const response = NextResponse.json({
      forPreview: {
        sideA,
        sideB,
        color: normalizedPayload.color,
        logoDeactive: false,
        bigChip: false,
        render: `/renders/${folderName}/${cardColorsToRenderColors[normalizedPayload.color] ?? "white"}/${normalizedPayload.design}`,
      },
      forOrder: normalizedPayload,
    });
    const identity = await recordAnalyticsEvent(request, {
      eventName: "order_preview",
      path: "/api/orders/previewOrder",
      payload: {
        designId: normalizedPayload.design ?? null,
        color: normalizedPayload.color,
        delivery: normalizedPayload.delivery,
      },
    });
    applyAnalyticsCookies(response, identity);
    return response;
  } catch {
    return NextResponse.json({ message: "Неправильные данные" }, { status: 400 });
  }
}
