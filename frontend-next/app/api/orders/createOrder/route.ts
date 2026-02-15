import { NextResponse } from "next/server";
import { createOrder, type OrderPayload } from "@/lib/order-store";
import { calculateOrderAmount, createOrderResponse, defaultBasePriceByColor } from "@/lib/orders";

type Body = {
  name: string;
  phone: string;
  order: OrderPayload;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;

    if (!body?.name || !body?.phone || !body?.order) {
      return NextResponse.json({ message: "Неправильные данные" }, { status: 400 });
    }

    const baseAmount = defaultBasePriceByColor(body.order.color);
    const amount = calculateOrderAmount(baseAmount, body.order);

    const order = createOrder({
      name: body.name,
      phone: body.phone,
      amount: amount.amountForBase,
      payload: body.order,
    });

    return NextResponse.json(createOrderResponse(order, amount.amountForPayment, amount.amountText));
  } catch {
    return NextResponse.json({ message: "Неправильные данные" }, { status: 400 });
  }
}
