import type { StoredOrder } from "@/lib/order-store";
import { normalizePublicBaseUrl } from "@/lib/public-base-url";

type PaymeLang = "ru" | "uz";

function toBool(value: string | undefined): boolean {
  return (value ?? "").trim().toLowerCase() === "true";
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function paymeMerchantId(): string {
  return (process.env.PAYME_MERCHANT_ID ?? "").trim();
}

function paymeCallbackUrl(): string {
  return normalizePublicBaseUrl(process.env.PAYME_CALLBACK_URL);
}

function siteBaseUrl(): string {
  return (
    normalizePublicBaseUrl(process.env.SITE_BASE_URL) ||
    normalizePublicBaseUrl(process.env.NEXT_PUBLIC_SITE_BASE_URL) ||
    normalizePublicBaseUrl(process.env.NEXT_PUBLIC_SITE_URL)
  );
}

function checkoutHost(): string {
  return toBool(process.env.PAYME_USE_TEST) ? "https://test.paycom.uz" : "https://checkout.paycom.uz";
}

export function buildOrderShowDataPath(order: StoredOrder): string {
  return `/orders/${order.id}/${order.orderKey}/showDataNew/`;
}

export function buildOrderShowDataUrl(order: StoredOrder): string | null {
  const baseUrl = siteBaseUrl();
  if (!baseUrl) {
    return null;
  }
  return `${baseUrl}${buildOrderShowDataPath(order)}`;
}

function buildPayload(input: {
  merchantId: string;
  amountTiyin: number;
  orderId: number;
  name: string;
  phone: string;
  lang: PaymeLang;
  callbackUrl?: string;
  returnUrl?: string;
}): string {
  const parts: string[] = [
    `m=${input.merchantId}`,
    `a=${input.amountTiyin}`,
    `ac.order_id=${input.orderId}`,
    `ac.name=${input.name || "-"}`,
    `ac.phone=${onlyDigits(input.phone) || "-"}`,
    "ac.email=null",
    `l=${input.lang}`,
  ];

  if (input.callbackUrl) {
    parts.push(`c=${encodeURIComponent(input.callbackUrl)}`);
  }
  if (input.returnUrl) {
    parts.push(`r=${encodeURIComponent(input.returnUrl)}`);
  }

  return parts.join(";");
}

export function buildPaymeCheckoutUrl(input: {
  order: StoredOrder;
  amountTiyin: number;
  name: string;
  phone: string;
  lang: PaymeLang;
}): string | null {
  const merchantId = paymeMerchantId();
  if (!merchantId) {
    return null;
  }

  const amountTiyin = Math.max(0, Math.round(input.amountTiyin));
  const returnUrl = buildOrderShowDataUrl(input.order) ?? undefined;
  const callbackUrl = paymeCallbackUrl() || undefined;

  const payload = buildPayload({
    merchantId,
    amountTiyin,
    orderId: input.order.id,
    name: input.name,
    phone: input.phone,
    lang: input.lang,
    callbackUrl,
    returnUrl,
  });

  const encoded = Buffer.from(payload, "utf-8").toString("base64");
  return `${checkoutHost()}/${encoded}`;
}

export function buildLegacyPaymentLinks(input: {
  order: StoredOrder;
  amountTiyin: number;
  name: string;
  phone: string;
}): { paymeLinkRu: string; paymeLinkUz: string } {
  const fallback = buildOrderShowDataPath(input.order);
  const ru = buildPaymeCheckoutUrl({
    order: input.order,
    amountTiyin: input.amountTiyin,
    name: input.name,
    phone: input.phone,
    lang: "ru",
  });
  const uz = buildPaymeCheckoutUrl({
    order: input.order,
    amountTiyin: input.amountTiyin,
    name: input.name,
    phone: input.phone,
    lang: "uz",
  });

  return {
    paymeLinkRu: ru ?? fallback,
    paymeLinkUz: uz ?? fallback,
  };
}
