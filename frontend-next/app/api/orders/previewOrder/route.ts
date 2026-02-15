import { NextResponse } from "next/server";
import { findDesignById } from "@/lib/design-data";
import { cardColorsToRenderColors } from "@/lib/card-colors";
import { getDrawApp } from "@/lib/draw-app";
import type { OrderPayload } from "@/lib/order-store";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as OrderPayload;
    if (!payload || typeof payload.design !== "number") {
      return NextResponse.json({ message: "Неправильные данные" }, { status: 400 });
    }

    const design = findDesignById(payload.design);
    if (!design) {
      return NextResponse.json({ message: "Неправильные данные" }, { status: 400 });
    }

    const drawApp = await getDrawApp();
    const sideA = drawApp.drawTextOnSideA(payload.cardAData);
    const sideB = drawApp.drawTextOnSideB(payload.cardBData, payload.cardNum, payload.cardTime);

    return NextResponse.json({
      forPreview: {
        sideA,
        sideB,
        color: payload.color,
        logoDeactive: payload.logoDeactive,
        bigChip: payload.bigChip,
        render: `/renders/${design.folderName}/${cardColorsToRenderColors[payload.color] ?? "white"}/${payload.design}`,
      },
      forOrder: payload,
    });
  } catch {
    return NextResponse.json({ message: "Неправильные данные" }, { status: 400 });
  }
}
