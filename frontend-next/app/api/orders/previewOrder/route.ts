import { NextResponse } from "next/server";
import type { QueryResultRow } from "pg";
import { applyAnalyticsCookies, recordAnalyticsEvent } from "@/lib/analytics";
import { query } from "@/lib/db";
import { extractFolderFromSvg, extractRenderIdFromSvg } from "@/lib/design-media";
import { getDrawApp } from "@/lib/draw-app";
import type { OrderPayload } from "@/lib/order-store";
import { getRuntimeCardColorsConfig } from "@/lib/runtime-card-colors";

type DbDesignRow = QueryResultRow & { id: number; category: string | null; svg_orig: string };

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
        WHERE active IS TRUE
        ORDER BY COALESCE(sort_order, 1000000), id
      `,
    );
    const design = designResult.rows.find(
      (item) => item.id === payload.design || extractRenderIdFromSvg(item.svg_orig) === payload.design,
    );
    const folderName = design ? design.category ?? extractFolderFromSvg(design.svg_orig) : null;
    const renderId = design ? extractRenderIdFromSvg(design.svg_orig) ?? design.id : null;
    if (!design || !folderName) {
      return NextResponse.json({ message: "Неправильные данные" }, { status: 400 });
    }

    const drawApp = await getDrawApp();
    const sideA = drawApp.drawTextOnSideA(normalizedPayload.cardAData);
    const sideB = drawApp.drawTextOnSideB(normalizedPayload.cardBData, normalizedPayload.cardNum, normalizedPayload.cardTime);
    const colorsConfig = await getRuntimeCardColorsConfig();

    const response = NextResponse.json({
      forPreview: {
        sideA,
        sideB,
        color: normalizedPayload.color,
        logoDeactive: false,
        bigChip: false,
        render: `/renders/${folderName}/${colorsConfig.renderColorByCode[normalizedPayload.color] ?? "white"}/${renderId}`,
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
