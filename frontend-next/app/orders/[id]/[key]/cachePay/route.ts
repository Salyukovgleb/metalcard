import { NextResponse } from "next/server";
import { findOrderByIdAndKey, markOrderAsCash } from "@/lib/order-store";
import { rateLimitResponse } from "@/lib/rate-limit";
import { notifyCashOrder } from "@/lib/telegram-notify";

type Params = {
  params: Promise<{ id: string; key: string }>;
};

export async function GET(request: Request, { params }: Params) {
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
    return new Response("", { status: 404 });
  }

  const shouldNotifyCash = order.state === 1;
  const updatedOrder = await markOrderAsCash(order);
  if (shouldNotifyCash) {
    try {
      await notifyCashOrder(updatedOrder.id, request);
    } catch {
      // Ignore notification failures to keep redirect flow available.
    }
  }
  return NextResponse.redirect(new URL(`/orders/${updatedOrder.id}/${updatedOrder.orderKey}/showDataNew/`, request.url));
}
