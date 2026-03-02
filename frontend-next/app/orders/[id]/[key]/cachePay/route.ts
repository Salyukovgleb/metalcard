import { NextResponse } from "next/server";
import { findOrderByIdAndKey, markOrderAsCash } from "@/lib/order-store";
import { normalizePublicBaseUrl } from "@/lib/public-base-url";
import { rateLimitResponse } from "@/lib/rate-limit";
import { notifyCashOrder } from "@/lib/telegram-notify";

type Params = {
  params: Promise<{ id: string; key: string }>;
};

function externalBaseUrl(request: Request): string {
  const xForwardedHost = (request.headers.get("x-forwarded-host") ?? "").trim();
  const xForwardedProto = (request.headers.get("x-forwarded-proto") ?? "").trim();
  const hostRaw = xForwardedHost || request.headers.get("host") || new URL(request.url).host;
  const protoRaw = xForwardedProto || new URL(request.url).protocol.replace(":", "") || "http";

  let host = hostRaw;
  if (host.includes(":")) {
    const [left, right] = host.split(":");
    if (right === "80" || right === "443") {
      host = left ?? host;
    }
  }

  return `${protoRaw}://${host}`;
}

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
  const base =
    normalizePublicBaseUrl(process.env.SITE_BASE_URL) ||
    normalizePublicBaseUrl(externalBaseUrl(request)) ||
    "https://metalcards.uz";
  return NextResponse.redirect(new URL(`/orders/${updatedOrder.id}/${updatedOrder.orderKey}/showDataNew/`, base));
}
