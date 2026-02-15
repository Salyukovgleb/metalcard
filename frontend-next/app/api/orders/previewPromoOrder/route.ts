import { NextResponse } from "next/server";
import { getPromoById } from "@/lib/promo-data";
import { cardColorsToRenderColors } from "@/lib/card-colors";
import { getDrawApp } from "@/lib/draw-app";
import type { OrderPayload } from "@/lib/order-store";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as OrderPayload;

    if (!payload || typeof payload.promoID !== "number") {
      return NextResponse.json({ message: "Неправильные данные" }, { status: 400 });
    }

    const promo = getPromoById(payload.promoID);
    if (!promo) {
      return NextResponse.json({ message: "Неправильные данные" }, { status: 400 });
    }

    const drawApp = await getDrawApp();
    const sideA = drawApp.drawTextOnSideA(payload.cardAData);
    const sideB = drawApp.drawTextOnSideB(payload.cardBData, payload.cardNum, payload.cardTime);

    return NextResponse.json({
      forPreview: {
        sideA,
        sideB,
        color: promo.color,
        logoDeactive: payload.logoDeactive,
        bigChip: payload.bigChip,
        render: `/renders/${promo.folderName}/${cardColorsToRenderColors[promo.color]}/${promo.designID}`,
      },
      forOrder: payload,
    });
  } catch {
    return NextResponse.json({ message: "Неправильные данные" }, { status: 400 });
  }
}
