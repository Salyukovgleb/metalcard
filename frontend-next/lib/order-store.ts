import crypto from "node:crypto";
import type { QueryResultRow } from "pg";
import { query, withTransaction, type DbClient } from "@/lib/db";
import { extractFolderFromSvg, extractRenderIdFromSvg } from "@/lib/design-media";

export type OrderCardDataItem = {
  text: string;
  fontName: string;
  pos: {
    top: number;
    left: number;
    width: number;
  };
};

export type OrderPayload = {
  design?: number;
  promoID?: number;
  color: string;
  logoDeactive: boolean;
  delivery: "pickup" | "delivery" | "delivery-yandex";
  bigChip: boolean;
  cardAData: OrderCardDataItem[];
  cardBData: OrderCardDataItem[];
  cardNum: string;
  cardTime: string;
};

export type StoredOrder = {
  id: number;
  orderKey: string;
  manageKey: string;
  state: 1 | 2 | 6;
  name: string;
  phone: string;
  amount: number;
  design?: number;
  promo?: string;
  color: string;
  logoDeactive: boolean;
  bigChip: boolean;
  delivery: "pickup" | "delivery" | "delivery-yandex";
  folderName?: string | null;
  orderData: {
    cardAData: OrderCardDataItem[];
    cardBData: OrderCardDataItem[];
    cardNum: string;
    cardTime: string;
  };
  createdAt: string;
};

export type CreateOrderInput = {
  name: string;
  phone: string;
  payload: OrderPayload;
  paymentMethod?: string;
  strictPromo?: boolean;
  promoName?: string;
};

type DbDesignRow = QueryResultRow & {
  id: number;
  title: string;
  category: string | null;
  svg_orig: string;
  base_price: string | number | null;
  price_overrides: unknown;
};

type DbColorRow = QueryResultRow & {
  id: number;
  code: string;
  title: string | null;
  markup: string | number | null;
};

type DbPromoRow = QueryResultRow & {
  id: number;
  code: string;
  fixed_price: string | number | null;
  design_id: number | null;
  color_code: string | null;
};

type DbStoredOrderRow = QueryResultRow & {
  id: number;
  state: string;
  customer_name: string;
  customer_phone: string;
  total: string | number | null;
  receive_method: string;
  order_key: string;
  manage_key: string;
  created_at: Date | string;
  promo_code: string | null;
  design_id: number | null;
  texts: unknown;
  options: unknown;
  svg_orig: string | null;
};

const FALLBACK_COLOR_MARKUP: Record<string, number> = {
  "black-silver-mat": 300000,
  "black-gold-mat": 300000,
  "black-gold-rib": 300000,
  "gold-mirror": 400000,
  "gold-mirror-black": 400000,
  red: 400000,
  blue: 400000,
  green: 10000,
};

const FALLBACK_COLOR_TITLE: Record<string, string> = {
  "black-silver-mat": "Черный/белый",
  "black-gold-mat": "Черный/золотой",
  "gold-mirror": "Золотой/белый",
  "gold-mirror-black": "Золотой/черный",
  "black-gold-rib": "Матовый черный/золотой",
  red: "Красный/белый",
  blue: "Синий/белый",
  green: "Зеленый/белый",
};

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

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return fallback;
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

function asObject(value: unknown): Record<string, unknown> {
  if (!value) {
    return {};
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // Ignore malformed JSON.
    }
  }
  return {};
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function normalizePos(value: unknown): OrderCardDataItem["pos"] {
  const src = asObject(value);
  return {
    top: asNumber(src.top, 0),
    left: asNumber(src.left, 0),
    width: asNumber(src.width, 100),
  };
}

function normalizeCardLine(value: unknown): OrderCardDataItem | null {
  const src = asObject(value);
  const text = asString(src.text, "").trim();
  if (!text) {
    return null;
  }
  const fontName = asString(src.fontName ?? src.font, "Gilroy").trim() || "Gilroy";
  const pos = normalizePos(src.pos);
  return { text, fontName, pos };
}

function normalizeCardLines(value: unknown): OrderCardDataItem[] {
  return asArray(value)
    .map((item) => normalizeCardLine(item))
    .filter((item): item is OrderCardDataItem => item !== null);
}

function normalizeDelivery(value: string): StoredOrder["delivery"] {
  const normalized = value.trim().toLowerCase();
  if (normalized === "delivery" || normalized === "delivery-yandex" || normalized === "pickup") {
    return normalized;
  }
  return "pickup";
}

function legacyState(state: string): StoredOrder["state"] {
  if (state === "paid") {
    return 2;
  }
  if (state === "cash") {
    return 6;
  }
  return 1;
}

function randomKey(length = 12): string {
  return crypto.randomBytes(length).toString("hex").slice(0, length);
}

async function getFirstActiveDesign(client: DbClient): Promise<DbDesignRow | null> {
  const result = await client.query<DbDesignRow>(
    `
      SELECT
        id,
        title,
        category,
        svg_orig,
        base_price,
        COALESCE(price_overrides, '{}'::jsonb) AS price_overrides
      FROM designs
      WHERE active IS TRUE
      ORDER BY COALESCE(sort_order, 1000000), id
      LIMIT 1
    `,
  );
  return result.rows[0] ?? null;
}

async function getActiveDesignById(client: DbClient, id: number): Promise<DbDesignRow | null> {
  const result = await client.query<DbDesignRow>(
    `
      SELECT
        id,
        title,
        category,
        svg_orig,
        base_price,
        COALESCE(price_overrides, '{}'::jsonb) AS price_overrides
      FROM designs
      WHERE id = $1 AND active IS TRUE
      LIMIT 1
    `,
    [id],
  );
  return result.rows[0] ?? null;
}

async function getActiveDesignByAnyId(client: DbClient, id: number): Promise<DbDesignRow | null> {
  const byDbId = await getActiveDesignById(client, id);
  if (byDbId) {
    return byDbId;
  }

  const candidates = await client.query<QueryResultRow & { id: number; svg_orig: string }>(
    `
      SELECT id, svg_orig
      FROM designs
      WHERE active IS TRUE
    `,
  );

  const matched = candidates.rows.find((row) => extractRenderIdFromSvg(row.svg_orig) === id);
  if (!matched) {
    return null;
  }

  return getActiveDesignById(client, matched.id);
}

async function getActiveColorByCode(client: DbClient, code: string): Promise<DbColorRow | null> {
  if (!code.trim()) {
    return null;
  }
  const result = await client.query<DbColorRow>(
    `
      SELECT id, code, title, markup
      FROM colors
      WHERE code = $1 AND active IS TRUE
      LIMIT 1
    `,
    [code],
  );
  return result.rows[0] ?? null;
}

async function getActivePromoById(client: DbClient, promoId: number): Promise<DbPromoRow | null> {
  const result = await client.query<DbPromoRow>(
    `
      SELECT
        p.id,
        p.code,
        p.fixed_price,
        p.design_id,
        c.code AS color_code
      FROM promos p
      LEFT JOIN colors c ON c.id = p.color_id
      WHERE p.id = $1
        AND p.active IS TRUE
        AND (p.starts_at IS NULL OR p.starts_at <= now())
        AND (p.ends_at IS NULL OR p.ends_at >= now())
      LIMIT 1
    `,
    [promoId],
  );
  return result.rows[0] ?? null;
}

function priceFromOverrides(overridesRaw: unknown, colorCode: string): number | null {
  if (!colorCode) {
    return null;
  }
  const overrides = asObject(overridesRaw);
  if (!(colorCode in overrides)) {
    return null;
  }
  const value = asNumber(overrides[colorCode], Number.NaN);
  return Number.isFinite(value) ? value : null;
}

function toStoredOrder(row: DbStoredOrderRow): StoredOrder {
  const texts = asObject(row.texts);
  const options = asObject(row.options);
  const color = asObject(options.color);
  const card = asObject(texts.card);

  const deliveryRaw = asString(options.delivery_method, row.receive_method || "pickup");

  return {
    id: row.id,
    orderKey: row.order_key,
    manageKey: row.manage_key,
    state: legacyState(asString(row.state)),
    name: asString(row.customer_name, "—"),
    phone: asString(row.customer_phone, "—"),
    amount: Math.round(asNumber(row.total, 0)),
    promo: asString(row.promo_code ?? options.promo, "").trim() || undefined,
    color: asString(color.code, ""),
    logoDeactive: asBool(options.logoDeactive ?? options.logo_deactive),
    bigChip: asBool(options.bigChip ?? options.big_chip),
    delivery: normalizeDelivery(deliveryRaw),
    design: extractRenderIdFromSvg(row.svg_orig) ?? row.design_id ?? undefined,
    folderName: extractFolderFromSvg(row.svg_orig),
    orderData: {
      cardAData: normalizeCardLines(texts.A),
      cardBData: normalizeCardLines(texts.B),
      cardNum: asString(card.num, ""),
      cardTime: asString(card.time, ""),
    },
    createdAt: new Date(row.created_at).toISOString(),
  };
}

async function findStoredOrderByWhere(whereSql: string, params: readonly unknown[]): Promise<StoredOrder | undefined> {
  const result = await query<DbStoredOrderRow>(
    `
      SELECT
        o.id,
        o.state::text AS state,
        o.customer_name,
        o.customer_phone,
        o.total,
        o.receive_method,
        o.order_key,
        o.manage_key,
        o.created_at,
        p.code AS promo_code,
        oi.design_id,
        oi.texts,
        oi.options,
        d.svg_orig
      FROM orders o
      LEFT JOIN promos p ON p.id = o.promo_id
      LEFT JOIN LATERAL (
        SELECT design_id, texts, options
        FROM order_items
        WHERE order_id = o.id
        ORDER BY id ASC
        LIMIT 1
      ) oi ON TRUE
      LEFT JOIN designs d ON d.id = oi.design_id
      WHERE ${whereSql}
      LIMIT 1
    `,
    params,
  );

  const row = result.rows[0];
  return row ? toStoredOrder(row) : undefined;
}

export async function createOrder(input: CreateOrderInput): Promise<StoredOrder> {
  return withTransaction(async (client) => {
    const payload: OrderPayload = {
      ...input.payload,
      // Large chip and logo toggle are deprecated in the new flow.
      bigChip: false,
      logoDeactive: false,
    };
    const promoId = typeof payload.promoID === "number" && Number.isFinite(payload.promoID) ? payload.promoID : null;

    const promo = promoId ? await getActivePromoById(client, promoId) : null;
    if (input.strictPromo && !promo) {
      throw new Error("promo_not_found");
    }

    const designIdCandidate = promo?.design_id ?? payload.design ?? null;
    const design = designIdCandidate ? await getActiveDesignByAnyId(client, designIdCandidate) : await getFirstActiveDesign(client);
    if (!design) {
      throw new Error("design_not_found");
    }

    const colorCode = asString(promo?.color_code ?? payload.color, "").trim();
    const color = await getActiveColorByCode(client, colorCode);

    const colorMarkup = color ? asNumber(color.markup, 0) : FALLBACK_COLOR_MARKUP[colorCode] ?? 0;
    const colorTitle = color ? asString(color.title, color.code) : FALLBACK_COLOR_TITLE[colorCode] ?? colorCode;
    const promoFixedPrice = promo ? asNumber(promo.fixed_price, 0) : 0;
    const designBasePrice = asNumber(design.base_price, 0);
    const overridePrice = priceFromOverrides(design.price_overrides, colorCode);

    let cardPrice = colorMarkup;
    if (promoFixedPrice > 0) {
      cardPrice = promoFixedPrice;
    } else if (designBasePrice > 0) {
      cardPrice = designBasePrice;
    } else if (overridePrice !== null) {
      cardPrice = overridePrice;
    }

    const deliveryRaw = normalizeDelivery(payload.delivery);
    const receiveMethod = deliveryRaw === "pickup" ? "pickup" : "delivery";
    const deliveryFee = deliveryRaw === "delivery" ? 50000 : 0;
    const subtotal = cardPrice;
    const total = subtotal + deliveryFee;
    const orderState = (input.paymentMethod ?? "").trim().toLowerCase() === "cash" ? "cash" : "created";

    const orderKey = randomKey(12);
    const manageKey = randomKey(12);

    const orderResult = await client.query<
      QueryResultRow & { id: number; created_at: Date; order_key: string; manage_key: string; state: string }
    >(
      `
        INSERT INTO orders (
          created_at,
          state,
          customer_name,
          customer_phone,
          receive_method,
          order_key,
          manage_key,
          promo_id,
          subtotal,
          delivery_fee,
          total,
          currency
        )
        VALUES (
          now(),
          $1::order_state,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          'UZS'
        )
        RETURNING id, created_at, order_key, manage_key, state::text AS state
      `,
      [
        orderState,
        input.name.trim() || "—",
        input.phone.trim() || "—",
        receiveMethod,
        orderKey,
        manageKey,
        promo?.id ?? null,
        subtotal,
        deliveryFee,
        total,
      ],
    );

    const orderRow = orderResult.rows[0];
    if (!orderRow) {
      throw new Error("order_create_failed");
    }

    const options = {
      color: {
        id: color?.id ?? null,
        code: colorCode,
        title: colorTitle,
        markup: colorMarkup,
      },
      delivery: receiveMethod,
      delivery_method: deliveryRaw,
      payment_method: (input.paymentMethod ?? "card").trim().toLowerCase() || "card",
      logoDeactive: Boolean(payload.logoDeactive),
      bigChip: Boolean(payload.bigChip),
      promo: promo?.code ?? input.promoName ?? null,
    };

    const texts = {
      A: normalizeCardLines(payload.cardAData),
      B: normalizeCardLines(payload.cardBData),
      card: {
        num: asString(payload.cardNum, "").trim(),
        time: asString(payload.cardTime, "").trim(),
      },
    };

    await client.query(
      `
        INSERT INTO order_items (
          order_id,
          design_id,
          color_id,
          quantity,
          options,
          texts,
          renders,
          item_total
        )
        VALUES (
          $1,
          $2,
          $3,
          1,
          $4::jsonb,
          $5::jsonb,
          '{}'::jsonb,
          $6
        )
      `,
      [
        orderRow.id,
        design.id,
        color?.id ?? null,
        JSON.stringify(options),
        JSON.stringify(texts),
        subtotal,
      ],
    );

    return {
      id: orderRow.id,
      orderKey: asString(orderRow.order_key),
      manageKey: asString(orderRow.manage_key),
      state: legacyState(asString(orderRow.state)),
      name: input.name.trim() || "—",
      phone: input.phone.trim() || "—",
      amount: Math.round(total),
      design: extractRenderIdFromSvg(design.svg_orig) ?? design.id,
      promo: promo?.code ?? input.promoName,
      color: colorCode,
      logoDeactive: Boolean(payload.logoDeactive),
      bigChip: Boolean(payload.bigChip),
      delivery: deliveryRaw,
      folderName: extractFolderFromSvg(design.svg_orig),
      orderData: {
        cardAData: normalizeCardLines(payload.cardAData),
        cardBData: normalizeCardLines(payload.cardBData),
        cardNum: asString(payload.cardNum, "").trim(),
        cardTime: asString(payload.cardTime, "").trim(),
      },
      createdAt: new Date(orderRow.created_at).toISOString(),
    };
  });
}

export async function findOrderByIdAndKey(id: number, keyValue: string): Promise<StoredOrder | undefined> {
  if (!Number.isFinite(id) || id <= 0 || !keyValue.trim()) {
    return undefined;
  }
  return findStoredOrderByWhere("o.id = $1 AND o.order_key = $2", [id, keyValue]);
}

export async function findOrderById(id: number): Promise<StoredOrder | undefined> {
  if (!Number.isFinite(id) || id <= 0) {
    return undefined;
  }
  return findStoredOrderByWhere("o.id = $1", [id]);
}

export async function findOrderByIdAndManageKey(id: number, manageKey: string): Promise<StoredOrder | undefined> {
  if (!Number.isFinite(id) || id <= 0 || !manageKey.trim()) {
    return undefined;
  }
  return findStoredOrderByWhere("o.id = $1 AND o.manage_key = $2", [id, manageKey]);
}

export async function markOrderAsCash(order: StoredOrder): Promise<StoredOrder> {
  await query(
    `
      UPDATE orders
      SET state = 'cash'
      WHERE id = $1
        AND state = 'created'
    `,
    [order.id],
  );

  const refreshed = await findOrderByIdAndKey(order.id, order.orderKey);
  if (refreshed) {
    return refreshed;
  }

  return {
    ...order,
    state: order.state === 2 ? 2 : 6,
  };
}
