import type { QueryResultRow } from "pg";
import { query } from "@/lib/db";

type DbOrderNotifyRow = QueryResultRow & {
  id: number;
  customer_name: string | null;
  customer_phone: string | null;
  total: string | number | null;
  delivery_fee: string | number | null;
  manage_key: string | null;
  texts: unknown;
  options: unknown;
  color_id: number | null;
  design_id: number | null;
  svg_orig: string | null;
  design_title: string | null;
  color_code_db: string | null;
  color_title_db: string | null;
};

type DbColorByCodeRow = QueryResultRow & {
  title: string | null;
};

type DbColorByIdRow = QueryResultRow & {
  code: string | null;
  title: string | null;
};

type DbPaymentStatusRow = QueryResultRow & {
  status: string;
};

type DbTelegramUserRow = QueryResultRow & {
  telegram_id: string | number | null;
};

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return fallback;
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

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
  }
  return {};
}

function asBool(value: string | undefined, fallback: boolean): boolean {
  const normalized = (value ?? "").trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }
  return ["1", "true", "yes", "on"].includes(normalized);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeBaseUrl(value: string | undefined): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed) {
    return "";
  }
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}

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

  const proto = asBool(process.env.PAYME_FORCE_HTTPS, false) ? "https" : protoRaw;
  return `${proto}://${host}`;
}

function baseFromPaymeUrls(): string {
  const candidates = [process.env.PAYME_RETURN_URL, process.env.PAYME_CALLBACK_URL];
  for (const candidate of candidates) {
    const raw = (candidate ?? "").trim();
    if (!raw) {
      continue;
    }
    try {
      const parsed = new URL(raw);
      return `${parsed.protocol}//${parsed.host}`;
    } catch {
      continue;
    }
  }
  return "";
}

function publicBaseUrl(): string {
  return normalizeBaseUrl(process.env.SITE_BASE_URL) || normalizeBaseUrl(baseFromPaymeUrls()) || "https://metalcards.uz";
}

function telegramApiUrl(): string {
  return normalizeBaseUrl(process.env.TELEGRAM_API_URL) || "https://api.telegram.org";
}

function telegramDebugEnabled(): boolean {
  const explicit = process.env.TELEGRAM_DEBUG ?? process.env.TG_DEBUG;
  if (explicit !== undefined) {
    return asBool(explicit, false);
  }
  return process.env.NODE_ENV !== "production";
}

function dbg(tag: string, payload?: unknown): void {
  if (!telegramDebugEnabled()) {
    return;
  }
  try {
    if (payload === undefined) {
      console.log(`[TG_DEBUG][${tag}]`);
      return;
    }
    if (typeof payload === "string") {
      console.log(`[TG_DEBUG][${tag}]`, payload);
      return;
    }
    console.log(`[TG_DEBUG][${tag}]`, JSON.stringify(payload));
  } catch {
    // Ignore debug serialization errors.
  }
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function tgSendMessageTo(chatId: string, text: string): Promise<boolean> {
  const token = (process.env.TELEGRAM_BOT_TOKEN ?? "").trim();
  if (!token || !chatId.trim()) {
    return false;
  }

  const url = `${telegramApiUrl()}/bot${token}/sendMessage`;
  const payload = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  };

  try {
    const response = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
      10_000,
    );
    const ok = response.ok;
    dbg("send_result", { chat_id: chatId, ok });
    return ok;
  } catch (error) {
    dbg("send_exc", {
      chat_id: chatId,
      error: asString((error as { message?: unknown })?.message, "unknown_error"),
    });
    return false;
  }
}

async function telegramAdminChatIds(): Promise<string[]> {
  let values: string[] = [];
  try {
    const result = await query<DbTelegramUserRow>(
      `
        SELECT telegram_id
        FROM users
        WHERE telegram_id IS NOT NULL
      `,
    );
    values = result.rows
      .map((row) => asString(row.telegram_id, "").trim())
      .filter((value) => value.length > 0);
  } catch {
    values = [];
  }

  const fallbackRaw = (process.env.TELEGRAM_CHAT_ID ?? "").trim();
  if (fallbackRaw) {
    values.push(...fallbackRaw.split(/[\s,]+/).map((item) => item.trim()).filter(Boolean));
  }

  values.push("5344703901", "1719017124", "5470460896", "1601804797");

  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const value of values) {
    if (!seen.has(value)) {
      seen.add(value);
      deduped.push(value);
    }
  }
  dbg("recipients", { count: deduped.length, ids: deduped });
  return deduped;
}

async function tgBroadcast(text: string): Promise<number> {
  const ids = await telegramAdminChatIds();
  let sent = 0;
  for (const id of ids) {
    if (await tgSendMessageTo(id, text)) {
      sent += 1;
    }
  }
  dbg("broadcast_done", { sent, total: ids.length });
  return sent;
}

const COLOR_TITLE_FALLBACK: Record<string, string> = {
  "black-silver-mat": "Черный/белый",
  "black-gold-mat": "Черный/золотой",
  "gold-mirror": "Золотой/белый",
  "gold-mirror-black": "Золотой/черный",
  "black-gold-rib": "Матовый черный/золотой",
  red: "Красный/белый",
  blue: "Синий/белый",
  green: "Зеленый/белый",
};

async function colorTitleForCode(code: string): Promise<string> {
  const normalized = code.trim();
  if (!normalized) {
    return "";
  }

  try {
    const result = await query<DbColorByCodeRow>(
      `
        SELECT title
        FROM colors
        WHERE code = $1
          AND active IS TRUE
        LIMIT 1
      `,
      [normalized],
    );
    const fromDb = asString(result.rows[0]?.title, "").trim();
    if (fromDb) {
      return fromDb;
    }
  } catch {
    // Ignore DB errors and use fallback mapping.
  }

  return COLOR_TITLE_FALLBACK[normalized] ?? normalized;
}

function colorCodeFromOptions(optionsRaw: unknown): string {
  const options = asObject(optionsRaw);
  const color = asObject(options.color);
  return asString(color.code, "").trim();
}

function formatUzs(value: unknown): string {
  try {
    return Math.round(asNumber(value, 0))
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  } catch {
    return asString(value, "0");
  }
}

async function notifyOrderGeneric(orderId: number, statusLabel: string, request?: Request): Promise<boolean> {
  const botToken = (process.env.TELEGRAM_BOT_TOKEN ?? "").trim();
  if (!botToken) {
    return false;
  }

  const publicBase = publicBaseUrl();
  let base = publicBase;

  if (request) {
    try {
      base = externalBaseUrl(request);
    } catch {
      base = publicBase;
    }
  }

  try {
    const parsed = new URL(base);
    const host = (parsed.hostname ?? "").toLowerCase();
    if (host.startsWith("paycom.")) {
      base = publicBase;
    } else {
      base = `${parsed.protocol}//${parsed.host}`;
    }
  } catch {
    if (base.toLowerCase().includes("paycom.")) {
      base = publicBase;
    }
  }

  const result = await query<DbOrderNotifyRow>(
    `
      SELECT
        o.id,
        o.customer_name,
        o.customer_phone,
        o.total,
        o.delivery_fee,
        o.manage_key,
        oi.texts,
        oi.options,
        oi.color_id,
        oi.design_id,
        d.svg_orig,
        d.title AS design_title,
        c.code AS color_code_db,
        c.title AS color_title_db
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      LEFT JOIN designs d ON d.id = oi.design_id
      LEFT JOIN colors c ON c.id = oi.color_id
      WHERE o.id = $1
      ORDER BY oi.id ASC NULLS LAST
      LIMIT 1
    `,
    [orderId],
  );
  const row = result.rows[0];

  if (!row) {
    dbg("notify_order_not_found", { order_id: orderId });
    return false;
  }

  dbg("notify_order_data", {
    order_id: orderId,
    has_order_items: Boolean(row.texts || row.options || row.color_id || row.design_id),
    color_id: row.color_id,
    color_code_db: row.color_code_db,
    color_title_db: row.color_title_db,
    design_id: row.design_id,
    has_manage_key: Boolean(row.manage_key),
  });

  let colorTitle = asString(row.color_title_db, "").trim();
  if (!colorTitle) {
    const colorCodeDb = asString(row.color_code_db, "").trim();
    if (colorCodeDb) {
      colorTitle = await colorTitleForCode(colorCodeDb);
    }
  }

  if (!colorTitle) {
    const fromOptions = colorCodeFromOptions(row.options);
    if (fromOptions) {
      colorTitle = await colorTitleForCode(fromOptions);
    }
  }

  if (!colorTitle && row.color_id) {
    try {
      const colorById = await query<DbColorByIdRow>(
        `
          SELECT code, title
          FROM colors
          WHERE id = $1
            AND active IS TRUE
          LIMIT 1
        `,
        [row.color_id],
      );
      const colorRow = colorById.rows[0];
      if (colorRow) {
        colorTitle = asString(colorRow.title, "").trim();
        if (!colorTitle) {
          const fallbackCode = asString(colorRow.code, "").trim();
          if (fallbackCode) {
            colorTitle = await colorTitleForCode(fallbackCode);
          }
        }
      }
    } catch {
      // Ignore fallback read errors.
    }
  }

  if (!colorTitle) {
    colorTitle = "—";
  }

  let manageKey = asString(row.manage_key, "").trim();
  if (!manageKey) {
    try {
      const manageResult = await query<QueryResultRow & { manage_key: string | null }>(
        `
          SELECT manage_key
          FROM orders
          WHERE id = $1
          LIMIT 1
        `,
        [orderId],
      );
      manageKey = asString(manageResult.rows[0]?.manage_key, "").trim();
    } catch {
      // Ignore and continue without manage key.
    }
  }

  const svgOrig = asString(row.svg_orig, "").trim();
  let printInfo = "";
  if (svgOrig) {
    const isAbsoluteUrl = svgOrig.startsWith("http://") || svgOrig.startsWith("https://");
    const svgPath = isAbsoluteUrl ? svgOrig : svgOrig.startsWith("/") ? svgOrig : `/${svgOrig}`;
    const designLink = isAbsoluteUrl ? svgPath : `${base}${svgPath}`;
    const designTitle = asString(row.design_title, "").trim();
    const designTitleStr = designTitle ? `  |  <i>${escapeHtml(designTitle)}</i>` : "";
    printInfo = `<b>Принт</b>: <a href="${designLink}">скачать</a>${designTitleStr}\n`;
  }

  let svgLinks = "";
  if (manageKey) {
    const sideAUrl = `${base}/orders/${orderId}/${manageKey}/sideANew.svg`;
    const sideBUrl = `${base}/orders/${orderId}/${manageKey}/sideBNew.svg`;
    svgLinks = `\n<b>SVG</b>\nСторона A: <a href="${sideAUrl}">${sideAUrl}</a>\nСторона B: <a href="${sideBUrl}">${sideBUrl}</a>\n`;
  }

  const message =
    `📩 <b>Поступил заказ (${escapeHtml(statusLabel)})</b>\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `<b>Заказ №</b> <code>${orderId}</code>\n` +
    `<b>Имя</b>: ${escapeHtml(asString(row.customer_name, "—"))}\n` +
    `<b>Телефон</b>: ${escapeHtml(asString(row.customer_phone, "—"))}\n` +
    `<b>Цвет</b>: ${escapeHtml(colorTitle)}\n` +
    `${printInfo}` +
    `${svgLinks}` +
    `\n` +
    `<b>Итого</b>: <b>${formatUzs(row.total)} UZS</b> (доставка ${formatUzs(row.delivery_fee)} UZS)\n`;

  dbg("notify_message_preview", {
    order_id: orderId,
    length: message.length,
    snippet: message.slice(0, 400),
  });

  const sent = await tgBroadcast(message);
  return sent > 0;
}

export async function notifyCashOrder(orderId: number, request?: Request): Promise<boolean> {
  return notifyOrderGeneric(orderId, "наличными", request);
}

export async function notifyPaidOrder(orderId: number, request?: Request): Promise<boolean> {
  try {
    const statusResult = await query<DbPaymentStatusRow>(
      `
        SELECT status::text AS status
        FROM payments
        WHERE order_id = $1
        ORDER BY id DESC
        LIMIT 1
      `,
      [orderId],
    );
    const status = asString(statusResult.rows[0]?.status, "");
    if (status !== "succeeded") {
      dbg("payment_status_not_succeeded", { order_id: orderId, status });
      return false;
    }
  } catch {
    dbg("payment_status_exc", { order_id: orderId });
    return false;
  }

  return notifyOrderGeneric(orderId, "по карте", request);
}
