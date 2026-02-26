import { cardColorsToPrice } from "@/lib/card-colors";
import { buildLegacyPaymentLinks, buildOrderShowDataPath } from "@/lib/payme";
import type { OrderPayload, StoredOrder } from "@/lib/order-store";

const numberFormat = new Intl.NumberFormat("ru");

export function calculateOrderAmount(baseAmount: number, payload: OrderPayload): {
  amountForBase: number;
  amountForPayment: number;
  amountText: number;
} {
  let amountForBase = baseAmount;
  let amountForPayment = Math.round(baseAmount) * 100;
  let amountText = Math.round(baseAmount);

  if (payload.delivery === "delivery") {
    amountForPayment += 5_000_000;
    amountForBase += 50_000;
    amountText += 50_000;
  }

  return { amountForBase, amountForPayment, amountText };
}

export function defaultBasePriceByColor(color: string): number {
  return cardColorsToPrice[color] ?? 250_000;
}

export function createOrderResponse(order: StoredOrder, paymentAmount: number, amountText: number) {
  const showDataUrl = buildOrderShowDataPath(order);

  return {
    id: order.id,
    amount: paymentAmount,
    amountText: numberFormat.format(amountText),
    paymeLinkRu: showDataUrl,
    paymeLinkUz: showDataUrl,
    cacheLink: order.delivery === "delivery" ? "" : `/orders/${order.id}/${order.orderKey}/cachePay/`,
  };
}

export function createOrderPaymentResponse(input: {
  order: StoredOrder;
  paymentAmount: number;
  amountText: number;
  customerName: string;
  customerPhone: string;
}) {
  const baseResponse = createOrderResponse(input.order, input.paymentAmount, input.amountText);
  const links = buildLegacyPaymentLinks({
    order: input.order,
    amountTiyin: input.paymentAmount,
    name: input.customerName,
    phone: input.customerPhone,
  });

  return {
    ...baseResponse,
    paymeLinkRu: links.paymeLinkRu,
    paymeLinkUz: links.paymeLinkUz,
  };
}
