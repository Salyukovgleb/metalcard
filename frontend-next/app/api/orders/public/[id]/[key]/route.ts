import { NextResponse } from "next/server";
import { findOrderByIdAndKey } from "@/lib/order-store";
import { rateLimitResponse } from "@/lib/rate-limit";

type Params = {
  params: Promise<{ id: string; key: string }>;
};

export async function GET(request: Request, { params }: Params) {
  const limited = rateLimitResponse(request, "order_public", {
    limit: 120,
    windowSec: 60,
  });
  if (limited) {
    return limited;
  }

  const { id, key } = await params;
  const orderId = Number.parseInt(id, 10);
  const order = await findOrderByIdAndKey(orderId, key);

  if (!order) {
    return NextResponse.json({ error: "order_not_found" }, { status: 404 });
  }

  return NextResponse.json({
    id: order.id,
    state: order.state,
    name: order.name,
    phone: order.phone,
    amount: order.amount,
    design: order.design ?? null,
    promo: order.promo ?? null,
    color: order.color,
    logoDeactive: false,
    bigChip: false,
    delivery: order.delivery,
    folderName: order.folderName ?? null,
    orderData: {
      cardAData: order.orderData.cardAData,
      cardBData: order.orderData.cardBData,
      cardNum: order.orderData.cardNum,
      cardTime: order.orderData.cardTime,
    },
  });
}
