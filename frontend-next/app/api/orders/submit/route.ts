import { NextResponse } from "next/server";
import { applyAnalyticsCookies, recordAnalyticsEvent } from "@/lib/analytics";
import { hasRequiredLegalConsents } from "@/lib/legal-consent";
import { createOrder, type OrderPayload } from "@/lib/order-store";
import { rateLimitResponse } from "@/lib/rate-limit";
import { notifyCashOrder } from "@/lib/telegram-notify";

type AnyJson = Record<string, unknown>;

function asText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function asBool(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  if (typeof value === "string") {
    return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
  }
  return false;
}

function normalizeDelivery(value: unknown): OrderPayload["delivery"] {
  const raw = asText(value, "pickup");
  if (raw === "delivery" || raw === "delivery-yandex" || raw === "pickup") {
    return raw;
  }
  return "pickup";
}

function normalizeCardSideData(value: unknown): OrderPayload["cardAData"] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const src = (item ?? {}) as AnyJson;
      return {
        text: asText(src.text),
        fontName: asText(src.fontName ?? src.font, "Gilroy"),
        pos: {
          top: typeof src.pos === "object" && src.pos !== null ? Number((src.pos as AnyJson).top ?? 0) : 0,
          left: typeof src.pos === "object" && src.pos !== null ? Number((src.pos as AnyJson).left ?? 0) : 0,
          width: typeof src.pos === "object" && src.pos !== null ? Number((src.pos as AnyJson).width ?? 100) : 100,
        },
      };
    })
    .filter((item) => item.text.length > 0);
}

function resolveDesignId(raw: unknown): number | undefined {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const normalized = Math.floor(raw);
    return normalized > 0 ? normalized : undefined;
  }
  if (typeof raw === "string" && raw.trim()) {
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }
  return undefined;
}

function resolvePromoId(raw: unknown): number | undefined {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const normalized = Math.floor(raw);
    return normalized > 0 ? normalized : undefined;
  }
  if (typeof raw === "string" && raw.trim()) {
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }
  return undefined;
}

export async function POST(request: Request) {
  const limited = rateLimitResponse(request, "submit_order", {
    limit: 20,
    windowSec: 60,
  });
  if (limited) {
    return limited;
  }

  try {
    const body = (await request.json()) as AnyJson;
    if (!hasRequiredLegalConsents(body)) {
      return NextResponse.json({ error: "legal_consents_required" }, { status: 400 });
    }

    const payload: OrderPayload = {
      design: resolveDesignId(body.design_id ?? body.design),
      promoID: resolvePromoId(body.promo_id ?? body.promoID),
      color: asText(body.color, ""),
      logoDeactive: asBool(body.logoDeactive ?? body.logo_deactive),
      delivery: normalizeDelivery(body.delivery),
      bigChip: asBool(body.bigChip ?? body.big_chip),
      cardAData: normalizeCardSideData(body.a_lines ?? body.cardAData),
      cardBData: normalizeCardSideData(body.b_lines ?? body.cardBData),
      cardNum: asText(body.card_num ?? body.cardNum),
      cardTime: asText(body.card_time ?? body.cardTime),
    };

    const paymentMethod = asText(body.payment_method, "card").toLowerCase();

    const order = await createOrder({
      name: asText(body.name, "—"),
      phone: asText(body.phone, "—"),
      payload,
      paymentMethod,
    });

    if (paymentMethod === "cash") {
      try {
        await notifyCashOrder(order.id, request);
      } catch {
        // Ignore notification failures to keep order creation available.
      }
    }

    const response = NextResponse.json({
      order_id: order.id,
      item_id: order.id,
      total: Math.round(order.amount),
      order_key: order.orderKey,
    });
    const identity = await recordAnalyticsEvent(request, {
      eventName: "order_submit",
      path: "/api/orders/submit",
      payload: {
        orderId: order.id,
        paymentMethod,
        designId: payload.design ?? null,
        promoId: payload.promoID ?? null,
      },
    });
    applyAnalyticsCookies(response, identity);
    return response;
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
}
