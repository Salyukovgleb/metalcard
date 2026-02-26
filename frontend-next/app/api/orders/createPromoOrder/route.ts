import { NextResponse } from "next/server";
import { applyAnalyticsCookies, recordAnalyticsEvent } from "@/lib/analytics";
import { hasRequiredLegalConsents } from "@/lib/legal-consent";
import { createOrder, type OrderPayload } from "@/lib/order-store";
import { createOrderPaymentResponse } from "@/lib/orders";

type Body = {
  name: string;
  phone: string;
  order: OrderPayload;
  termsAccepted?: unknown;
  privacyAccepted?: unknown;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;

    if (!body?.name || !body?.phone || !body?.order || typeof body.order.promoID !== "number") {
      return NextResponse.json({ message: "Неправильные данные" }, { status: 400 });
    }
    if (!hasRequiredLegalConsents(body)) {
      return NextResponse.json({ message: "Нужно принять политику и пользовательское соглашение" }, { status: 400 });
    }

    const order = await createOrder({
      name: body.name,
      phone: body.phone,
      payload: body.order,
      strictPromo: true,
    });

    const response = NextResponse.json(
      createOrderPaymentResponse({
        order,
        paymentAmount: Math.round(order.amount) * 100,
        amountText: Math.round(order.amount),
        customerName: body.name,
        customerPhone: body.phone,
      }),
    );
    const identity = await recordAnalyticsEvent(request, {
      eventName: "promo_order_create",
      path: "/api/orders/createPromoOrder",
      payload: {
        orderId: order.id,
        promoId: body.order.promoID ?? null,
      },
    });
    applyAnalyticsCookies(response, identity);
    return response;
  } catch {
    return NextResponse.json({ message: "Неправильные данные" }, { status: 400 });
  }
}
