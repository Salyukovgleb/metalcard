import { NextResponse } from "next/server";
import { getPromoById } from "@/lib/promo-data";
import { createOrder, type OrderPayload } from "@/lib/order-store";
import { calculateOrderAmount, createOrderResponse } from "@/lib/orders";

type Body = {
  name: string;
  phone: string;
  order: OrderPayload;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;

    if (!body?.name || !body?.phone || !body?.order || typeof body.order.promoID !== "number") {
      return NextResponse.json({ message: "Неправильные данные" }, { status: 400 });
    }

    const promo = getPromoById(body.order.promoID);
    if (!promo) {
      return NextResponse.json({ message: "Неправильные данные" }, { status: 400 });
    }

    const amount = calculateOrderAmount(promo.promoPrice, body.order);

    const order = createOrder({
      name: body.name,
      phone: body.phone,
      amount: amount.amountForBase,
      payload: {
        ...body.order,
        design: promo.designID,
        color: promo.color,
      },
      promoName: promo.promoURI,
    });

    return NextResponse.json(createOrderResponse(order, amount.amountForPayment, amount.amountText));
  } catch {
    return NextResponse.json({ message: "Неправильные данные" }, { status: 400 });
  }
}
