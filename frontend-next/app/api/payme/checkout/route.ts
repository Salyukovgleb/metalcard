import { NextRequest, NextResponse } from "next/server";
import type { QueryResultRow } from "pg";
import { applyAnalyticsCookies, recordAnalyticsEvent } from "@/lib/analytics";
import { query } from "@/lib/db";
import { normalizePublicBaseUrl } from "@/lib/public-base-url";
import { rateLimitResponse } from "@/lib/rate-limit";

type DbOrderRow = QueryResultRow & {
  state: string;
  total: string | number | null;
  order_key: string;
};

function asBool(value: string | undefined): boolean {
  return ["1", "true", "yes", "on"].includes((value ?? "").trim().toLowerCase());
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function externalBaseUrl(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const host = forwardedHost || request.headers.get("host") || new URL(request.url).host;
  const proto = forwardedProto || (request.nextUrl.protocol.replace(":", "") || "http");
  return `${proto}://${host}`;
}

function paymeCheckoutHost(): string {
  return asBool(process.env.PAYME_USE_TEST) ? "https://test.paycom.uz" : "https://checkout.paycom.uz";
}

function paymeMerchantId(): string {
  return (process.env.PAYME_MERCHANT_ID ?? "").trim();
}

function paymeAccountKey(): string {
  return (process.env.PAYME_ACCOUNT_KEY ?? "order_id").trim();
}

function buildCheckoutUrl(input: {
  merchantId: string;
  amountTiyin: number;
  orderId: number;
  lang: "ru" | "uz";
  callbackUrl: string;
  returnUrl: string;
  name: string;
  phone: string;
}): string {
  const params = [
    `m=${input.merchantId}`,
    `a=${Math.max(0, Math.round(input.amountTiyin))}`,
    `ac.${paymeAccountKey()}=${input.orderId}`,
    `ac.name=${input.name || "-"}`,
    `ac.phone=${onlyDigits(input.phone) || "-"}`,
    "ac.email=null",
    `l=${input.lang}`,
    `c=${encodeURIComponent(input.callbackUrl)}`,
    `r=${encodeURIComponent(input.returnUrl)}`,
  ];
  const encoded = Buffer.from(params.join(";"), "utf-8").toString("base64");
  return `${paymeCheckoutHost()}/${encoded}`;
}

export async function GET(request: NextRequest) {
  const limited = rateLimitResponse(request, "payme_checkout", {
    limit: 30,
    windowSec: 60,
  });
  if (limited) {
    return limited;
  }

  const orderIdRaw = request.nextUrl.searchParams.get("order_id");
  const amountRaw = request.nextUrl.searchParams.get("amount");
  const langRaw = request.nextUrl.searchParams.get("lang");
  const debug = request.nextUrl.searchParams.has("debug") || request.nextUrl.searchParams.has("dbg");

  const orderId = Number.parseInt(orderIdRaw ?? "", 10);
  if (!Number.isFinite(orderId) || orderId <= 0) {
    return NextResponse.json({ error: "invalid_order_id" }, { status: 400 });
  }

  const merchantId = paymeMerchantId();
  if (!merchantId) {
    return NextResponse.json({ error: "payme_merchant_not_configured" }, { status: 500 });
  }

  const orderResult = await query<DbOrderRow>(
    `
      SELECT state::text AS state, total, order_key
      FROM orders
      WHERE id = $1
      LIMIT 1
    `,
    [orderId],
  );
  const order = orderResult.rows[0];
  if (!order) {
    return NextResponse.json({ error: "order_not_found" }, { status: 404 });
  }
  if (order.state === "paid" || order.state === "canceled") {
    return NextResponse.json({ error: "order_not_payable" }, { status: 400 });
  }

  const amountSum = Math.round(asNumber(order.total, 0));
  if (amountSum <= 0) {
    return NextResponse.json({ error: "invalid_amount_db" }, { status: 400 });
  }

  const amountClient = Number.parseInt(amountRaw ?? "", 10);
  if (!Number.isNaN(amountClient) && amountClient > 0 && amountClient !== amountSum) {
    return NextResponse.json({ error: "amount_mismatch", amount_db: amountSum }, { status: 400 });
  }

  const lang = langRaw === "uz" ? "uz" : "ru";
  const name = (request.nextUrl.searchParams.get("name") ?? "").trim();
  const phone = (request.nextUrl.searchParams.get("phone") ?? "").trim();

  const base =
    normalizePublicBaseUrl(process.env.SITE_BASE_URL) ||
    normalizePublicBaseUrl(externalBaseUrl(request)) ||
    "https://metalcards.uz";
  const callbackUrl =
    normalizePublicBaseUrl(process.env.PAYME_CALLBACK_URL) || `${base}/api/payme/callback/`;
  const returnUrl =
    normalizePublicBaseUrl(process.env.PAYME_RETURN_URL) || `${base}/orders/${orderId}/${order.order_key}/showDataNew/`;

  const pendingResult = await query<QueryResultRow & { id: number }>(
    `
      SELECT id
      FROM payments
      WHERE order_id = $1
        AND provider = 'payme'
        AND status = 'pending'
        AND provider_invoice_id IS NULL
      ORDER BY id DESC
      LIMIT 1
    `,
    [orderId],
  );
  const existingPending = pendingResult.rows[0];
  if (existingPending) {
    await query(
      `
        UPDATE payments
        SET amount = $1, currency = 'UZS', return_url = $2, updated_at = now()
        WHERE id = $3
      `,
      [amountSum, returnUrl, existingPending.id],
    );
  } else {
    await query(
      `
        INSERT INTO payments (
          order_id,
          provider,
          status,
          amount,
          currency,
          return_url,
          created_at,
          updated_at
        )
        VALUES (
          $1,
          'payme',
          'pending',
          $2,
          'UZS',
          $3,
          now(),
          now()
        )
      `,
      [orderId, amountSum, returnUrl],
    );
  }

  const amountTiyin = amountSum * 100;
  const checkoutUrl = buildCheckoutUrl({
    merchantId,
    amountTiyin,
    orderId,
    lang,
    callbackUrl,
    returnUrl,
    name,
    phone,
  });

  if (debug) {
    const debugResponse = NextResponse.json({
      order_id: orderId,
      amount_sum: amountSum,
      amount_tiyin: amountTiyin,
      checkout_url: checkoutUrl,
      encoded: checkoutUrl,
      callback_url: callbackUrl,
      return_url: returnUrl,
    });
    const identity = await recordAnalyticsEvent(request, {
      eventName: "payme_checkout",
      path: "/api/payme/checkout",
      payload: {
        orderId,
        amount: amountSum,
        debug: true,
      },
    });
    applyAnalyticsCookies(debugResponse, identity);
    return debugResponse;
  }

  const redirectResponse = NextResponse.redirect(new URL(checkoutUrl, request.url));
  const identity = await recordAnalyticsEvent(request, {
    eventName: "payme_checkout",
    path: "/api/payme/checkout",
    payload: {
      orderId,
      amount: amountSum,
      debug: false,
    },
  });
  applyAnalyticsCookies(redirectResponse, identity);
  return redirectResponse;
}
