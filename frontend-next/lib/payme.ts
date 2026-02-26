import type { StoredOrder } from "@/lib/order-store";
import { normalizePublicBaseUrl } from "@/lib/public-base-url";

type PaymeLang = "ru" | "uz";

function toBool(value: string | undefined): boolean {
  return (value ?? "").trim().toLowerCase() === "true";
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function normalizeEmail(value: string | undefined): string {
  const trimmed = (value ?? "").trim().toLowerCase();
  if (!trimmed) {
    return "";
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? trimmed : "";
}

function fallbackEmail(): string {
  return normalizeEmail(process.env.PAYME_DEFAULT_EMAIL) || "noreply@metalcards.uz";
}

function paymeMerchantId(): string {
  return (process.env.PAYME_MERCHANT_ID ?? "").trim();
}

function paymeCallbackUrl(): string {
  return normalizePublicBaseUrl(process.env.PAYME_CALLBACK_URL);
}

function callbackBaseUrl(): string {
  const callback = paymeCallbackUrl();
  if (!callback) {
    return "";
  }
  try {
    return new URL(callback).origin;
  } catch {
    return "";
  }
}

function siteBaseUrl(): string {
  return (
    normalizePublicBaseUrl(process.env.SITE_BASE_URL) ||
    normalizePublicBaseUrl(process.env.NEXT_PUBLIC_SITE_BASE_URL) ||
    normalizePublicBaseUrl(process.env.NEXT_PUBLIC_SITE_URL)
  );
}

function paymeGatewayBaseUrl(): string {
  return (
    normalizePublicBaseUrl(process.env.PAYME_PUBLIC_BASE_URL) ||
    callbackBaseUrl() ||
    siteBaseUrl()
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
  email?: string;
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
    `ac.email=${normalizeEmail(input.email) || fallbackEmail()}`,
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
  email?: string;
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
    email: input.email,
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
  email?: string;
}): { paymeLinkRu: string; paymeLinkUz: string } {
  const fallback = buildOrderShowDataPath(input.order);
  const gatewayBase = paymeGatewayBaseUrl();
  const amountSum = Math.max(0, Math.round(input.amountTiyin / 100));

  const buildGatewayUrl = (lang: PaymeLang): string | null => {
    if (!gatewayBase) {
      return null;
    }
    const params = new URLSearchParams({
      order_id: String(input.order.id),
      amount: String(amountSum),
      lang,
      name: input.name,
      phone: input.phone,
    });
    return `${gatewayBase}/api/payme/checkout?${params.toString()}`;
  };

  const ru = buildGatewayUrl("ru") ?? buildPaymeCheckoutUrl({
    order: input.order,
    amountTiyin: input.amountTiyin,
    name: input.name,
    phone: input.phone,
    email: input.email,
    lang: "ru",
  });
  const uz = buildGatewayUrl("uz") ?? buildPaymeCheckoutUrl({
    order: input.order,
    amountTiyin: input.amountTiyin,
    name: input.name,
    phone: input.phone,
    email: input.email,
    lang: "uz",
  });

  return {
    paymeLinkRu: ru ?? fallback,
    paymeLinkUz: uz ?? fallback,
  };
}
