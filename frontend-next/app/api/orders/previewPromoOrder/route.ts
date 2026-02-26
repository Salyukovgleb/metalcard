import { NextResponse } from "next/server";
import type { QueryResultRow } from "pg";
import { cardColorsToRenderColors } from "@/lib/card-colors";
import { applyAnalyticsCookies, recordAnalyticsEvent } from "@/lib/analytics";
import { query } from "@/lib/db";
import { getDrawApp } from "@/lib/draw-app";
import type { OrderPayload } from "@/lib/order-store";

type DbPromoRow = QueryResultRow & {
  promo_id: number;
  design_id: number;
  category: string | null;
  svg_orig: string;
  color_code: string;
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
    const normalizedPayload: OrderPayload = {
      ...payload,
      bigChip: false,
      logoDeactive: false,
    };

    if (!payload || typeof payload.promoID !== "number") {
      return NextResponse.json({ message: "Неправильные данные" }, { status: 400 });
    }

    const promoResult = await query<DbPromoRow>(
      `
        SELECT
          p.id AS promo_id,
          COALESCE(p.design_id, 0) AS design_id,
          d.category,
          d.svg_orig,
          c.code AS color_code
        FROM promos p
        LEFT JOIN designs d ON d.id = p.design_id
        LEFT JOIN colors c ON c.id = p.color_id
        WHERE p.id = $1
          AND p.active IS TRUE
          AND (p.starts_at IS NULL OR p.starts_at <= now())
          AND (p.ends_at IS NULL OR p.ends_at >= now())
        LIMIT 1
      `,
      [normalizedPayload.promoID],
    );
    const promo = promoResult.rows[0];
    const folderName = promo ? promo.category ?? folderFromSvg(promo.svg_orig) : null;

    if (!promo || !promo.design_id || !promo.color_code || !folderName) {
      return NextResponse.json({ message: "Неправильные данные" }, { status: 400 });
    }

    const drawApp = await getDrawApp();
    const sideA = drawApp.drawTextOnSideA(normalizedPayload.cardAData);
    const sideB = drawApp.drawTextOnSideB(normalizedPayload.cardBData, normalizedPayload.cardNum, normalizedPayload.cardTime);

    const response = NextResponse.json({
      forPreview: {
        sideA,
        sideB,
        color: promo.color_code,
        logoDeactive: false,
        bigChip: false,
        render: `/renders/${folderName}/${cardColorsToRenderColors[promo.color_code] ?? "white"}/${promo.design_id}`,
      },
      forOrder: normalizedPayload,
    });
    const identity = await recordAnalyticsEvent(request, {
      eventName: "promo_preview",
      path: "/api/orders/previewPromoOrder",
      payload: {
        promoId: normalizedPayload.promoID ?? null,
        color: promo.color_code,
      },
    });
    applyAnalyticsCookies(response, identity);
    return response;
  } catch {
    return NextResponse.json({ message: "Неправильные данные" }, { status: 400 });
  }
}
