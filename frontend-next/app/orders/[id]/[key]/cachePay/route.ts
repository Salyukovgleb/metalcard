import { NextResponse } from "next/server";
import { findOrderByIdAndKey, markOrderAsCash } from "@/lib/order-store";

type Params = {
  params: Promise<{ id: string; key: string }>;
};

export async function GET(request: Request, { params }: Params) {
  const { id, key } = await params;
  const orderId = Number.parseInt(id, 10);

  const order = findOrderByIdAndKey(orderId, key);
  if (!order) {
    return new Response("", { status: 404 });
  }

  markOrderAsCash(order);

  return NextResponse.redirect(new URL(`/orders/${order.id}/${order.orderKey}/showDataNew/`, request.url));
}
