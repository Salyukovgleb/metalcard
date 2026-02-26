import { NextResponse } from "next/server";
import { findOrderByIdAndKey, markOrderAsCash } from "@/lib/order-store";
import { rateLimitResponse } from "@/lib/rate-limit";
import { notifyCashOrder } from "@/lib/telegram-notify";

type Params = {
  params: Promise<{ id: string; key: string }>;
};

export async function POST(request: Request, { params }: Params) {
  const limited = rateLimitResponse(request, "order_cash", {
    limit: 30,
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

  const shouldNotifyCash = order.state === 1;
  const updatedOrder = order.state === 2 ? order : await markOrderAsCash(order);

  if (shouldNotifyCash) {
    try {
      await notifyCashOrder(updatedOrder.id, request);
    } catch {
      // Ignore notification failures to keep order state transition available.
    }
  }

  return NextResponse.json({
    ok: true,
    state: updatedOrder.state,
    redirect: `/orders/${updatedOrder.id}/${updatedOrder.orderKey}/showDataNew/`,
  });
}

export const GET = POST;
