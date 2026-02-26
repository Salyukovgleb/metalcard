import type { QueryResultRow } from "pg";
import { query } from "@/lib/db";

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

function asBool(value: unknown): boolean {
  return value === true || value === "t" || value === "true" || value === 1 || value === "1";
}

function asString(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
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

export type DashboardOrder = {
  id: number;
  createdAt: string;
  state: string;
  customerName: string;
  customerPhone: string;
  total: number;
  currency: string;
};

export type DashboardData = {
  ordersTotal: number;
  paymentsTotal: number;
  revenue: number;
  designsWithPrice: number;
  designsTotal: number;
  colorsActive: number;
  recentOrders: DashboardOrder[];
};

export async function getDashboardData(): Promise<DashboardData> {
  const [ordersTotalRes, paymentsTotalRes, revenueRes, designsWithPriceRes, designsTotalRes, colorsActiveRes, recentOrdersRes] =
    await Promise.all([
      query<{ count: string }>("SELECT count(*)::text AS count FROM orders"),
      query<{ count: string }>("SELECT count(*)::text AS count FROM payments"),
      query<{ sum: string | null }>(
        "SELECT COALESCE(sum(amount), 0)::text AS sum FROM payments WHERE status = 'succeeded'",
      ),
      query<{ count: string }>("SELECT count(*)::text AS count FROM designs WHERE active IS TRUE AND base_price > 0"),
      query<{ count: string }>("SELECT count(*)::text AS count FROM designs WHERE active IS TRUE"),
      query<{ count: string }>("SELECT count(*)::text AS count FROM colors WHERE active IS TRUE"),
      query<QueryResultRow & {
        id: number;
        created_at: Date | string;
        state: string;
        customer_name: string;
        customer_phone: string;
        total: string | number;
        currency: string;
      }>(
        `
        SELECT id, created_at, state, customer_name, customer_phone, total, currency
        FROM orders
        ORDER BY created_at DESC
        LIMIT 10
      `,
      ),
    ]);

  return {
    ordersTotal: Number.parseInt(ordersTotalRes.rows[0]?.count ?? "0", 10) || 0,
    paymentsTotal: Number.parseInt(paymentsTotalRes.rows[0]?.count ?? "0", 10) || 0,
    revenue: asNumber(revenueRes.rows[0]?.sum, 0),
    designsWithPrice: Number.parseInt(designsWithPriceRes.rows[0]?.count ?? "0", 10) || 0,
    designsTotal: Number.parseInt(designsTotalRes.rows[0]?.count ?? "0", 10) || 0,
    colorsActive: Number.parseInt(colorsActiveRes.rows[0]?.count ?? "0", 10) || 0,
    recentOrders: recentOrdersRes.rows.map((row) => ({
      id: row.id,
      createdAt: asString(row.created_at),
      state: row.state,
      customerName: row.customer_name,
      customerPhone: row.customer_phone,
      total: asNumber(row.total, 0),
      currency: row.currency,
    })),
  };
}

export type DesignRow = {
  id: number;
  title: string;
  category: string;
  svgOrig: string;
  previewWebp: string;
  basePrice: number;
  sortOrder: number | null;
  priceOverrides: Record<string, unknown>;
  active: boolean;
};

export async function listDesignCategories(): Promise<string[]> {
  const result = await query<{ category: string }>(
    `
      SELECT DISTINCT category
      FROM designs
      WHERE category IS NOT NULL
        AND category <> ''
      ORDER BY category
    `,
  );

  return result.rows.map((row) => row.category);
}

export async function listDesigns(category?: string): Promise<DesignRow[]> {
  const hasCategory = Boolean(category?.trim());
  const result = await query<QueryResultRow & {
    id: number;
    title: string;
    category: string | null;
    svg_orig: string;
    preview_webp: string | null;
    base_price: string | number;
    sort_order: number | null;
    price_overrides: unknown;
    active: boolean;
  }>(
    `
      SELECT id, title, category, svg_orig, preview_webp, base_price, sort_order,
             COALESCE(price_overrides, '{}'::jsonb) AS price_overrides,
             active
      FROM designs
      ${hasCategory ? "WHERE category = $1" : ""}
      ORDER BY COALESCE(sort_order, 1000000), id
    `,
    hasCategory ? [category?.trim() ?? ""] : [],
  );

  return result.rows.map((row) => ({
    id: row.id,
    title: row.title,
    category: row.category ?? "",
    svgOrig: row.svg_orig,
    previewWebp: row.preview_webp ?? "",
    basePrice: asNumber(row.base_price, 0),
    sortOrder: row.sort_order,
    priceOverrides: asObject(row.price_overrides),
    active: asBool(row.active),
  }));
}

export async function getDesignById(id: number): Promise<DesignRow | null> {
  const result = await query<QueryResultRow & {
    id: number;
    title: string;
    category: string | null;
    svg_orig: string;
    preview_webp: string | null;
    base_price: string | number;
    sort_order: number | null;
    price_overrides: unknown;
    active: boolean;
  }>(
    `
      SELECT id, title, category, svg_orig, preview_webp, base_price, sort_order,
             COALESCE(price_overrides, '{}'::jsonb) AS price_overrides,
             active
      FROM designs
      WHERE id = $1
      LIMIT 1
    `,
    [id],
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    title: row.title,
    category: row.category ?? "",
    svgOrig: row.svg_orig,
    previewWebp: row.preview_webp ?? "",
    basePrice: asNumber(row.base_price, 0),
    sortOrder: row.sort_order,
    priceOverrides: asObject(row.price_overrides),
    active: asBool(row.active),
  };
}

export type ColorRow = {
  id: number;
  code: string;
  title: string;
  markup: number;
  params: Record<string, unknown>;
  active: boolean;
};

export async function listColors(): Promise<ColorRow[]> {
  const result = await query<QueryResultRow & {
    id: number;
    code: string;
    title: string;
    markup: string | number;
    params: unknown;
    active: boolean;
  }>(
    `
      SELECT id, code, title, markup, params, active
      FROM colors
      ORDER BY markup, id
    `,
  );

  return result.rows.map((row) => ({
    id: row.id,
    code: row.code,
    title: row.title,
    markup: asNumber(row.markup, 0),
    params: asObject(row.params),
    active: asBool(row.active),
  }));
}

export async function getColorById(id: number): Promise<ColorRow | null> {
  const result = await query<QueryResultRow & {
    id: number;
    code: string;
    title: string;
    markup: string | number;
    params: unknown;
    active: boolean;
  }>(
    `
      SELECT id, code, title, markup, params, active
      FROM colors
      WHERE id = $1
      LIMIT 1
    `,
    [id],
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    code: row.code,
    title: row.title,
    markup: asNumber(row.markup, 0),
    params: asObject(row.params),
    active: asBool(row.active),
  };
}

export type PromoRow = {
  id: number;
  code: string;
  active: boolean;
  fixedPrice: number | null;
  designId: number | null;
  designTitle: string;
  colorId: number | null;
  colorTitle: string;
  startsAt: string;
  endsAt: string;
};

export async function listPromos(): Promise<PromoRow[]> {
  const result = await query<QueryResultRow & {
    id: number;
    code: string;
    active: boolean;
    fixed_price: string | number | null;
    design_id: number | null;
    color_id: number | null;
    starts_at: string | Date | null;
    ends_at: string | Date | null;
    design_title: string | null;
    color_title: string | null;
  }>(
    `
      SELECT
        p.id,
        p.code,
        p.active,
        p.fixed_price,
        p.design_id,
        p.color_id,
        p.starts_at,
        p.ends_at,
        d.title AS design_title,
        c.title AS color_title
      FROM promos p
      LEFT JOIN designs d ON d.id = p.design_id
      LEFT JOIN colors c ON c.id = p.color_id
      ORDER BY p.id DESC
    `,
  );

  return result.rows.map((row) => ({
    id: row.id,
    code: row.code,
    active: asBool(row.active),
    fixedPrice: row.fixed_price === null ? null : asNumber(row.fixed_price, 0),
    designId: row.design_id,
    designTitle: row.design_title ?? "",
    colorId: row.color_id,
    colorTitle: row.color_title ?? "",
    startsAt: asString(row.starts_at),
    endsAt: asString(row.ends_at),
  }));
}

export async function getPromoById(id: number): Promise<PromoRow | null> {
  const result = await query<QueryResultRow & {
    id: number;
    code: string;
    active: boolean;
    fixed_price: string | number | null;
    design_id: number | null;
    color_id: number | null;
    starts_at: string | Date | null;
    ends_at: string | Date | null;
    design_title: string | null;
    color_title: string | null;
  }>(
    `
      SELECT
        p.id,
        p.code,
        p.active,
        p.fixed_price,
        p.design_id,
        p.color_id,
        p.starts_at,
        p.ends_at,
        d.title AS design_title,
        c.title AS color_title
      FROM promos p
      LEFT JOIN designs d ON d.id = p.design_id
      LEFT JOIN colors c ON c.id = p.color_id
      WHERE p.id = $1
      LIMIT 1
    `,
    [id],
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    code: row.code,
    active: asBool(row.active),
    fixedPrice: row.fixed_price === null ? null : asNumber(row.fixed_price, 0),
    designId: row.design_id,
    designTitle: row.design_title ?? "",
    colorId: row.color_id,
    colorTitle: row.color_title ?? "",
    startsAt: asString(row.starts_at),
    endsAt: asString(row.ends_at),
  };
}

export type AppUserRow = {
  id: number;
  fullName: string;
  email: string;
  telegramId: number | null;
  createdAt: string;
  updatedAt: string;
};

export async function listAppUsers(): Promise<AppUserRow[]> {
  const result = await query<QueryResultRow & {
    id: number;
    full_name: string;
    email: string;
    telegram_id: number | null;
    created_at: string | Date;
    updated_at: string | Date;
  }>(
    `
      SELECT id, full_name, email, telegram_id, created_at, updated_at
      FROM users
      ORDER BY id DESC
    `,
  );

  return result.rows.map((row) => ({
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    telegramId: row.telegram_id,
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
  }));
}

export async function getAppUserById(id: number): Promise<AppUserRow | null> {
  const result = await query<QueryResultRow & {
    id: number;
    full_name: string;
    email: string;
    telegram_id: number | null;
    created_at: string | Date;
    updated_at: string | Date;
  }>(
    `
      SELECT id, full_name, email, telegram_id, created_at, updated_at
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [id],
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    telegramId: row.telegram_id,
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
  };
}

export type OrderRow = {
  id: number;
  createdAt: string;
  state: string;
  customerName: string;
  customerPhone: string;
  receiveMethod: string;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  currency: string;
  promoId: number | null;
};

export async function listOrders(state?: string): Promise<OrderRow[]> {
  const hasState = Boolean(state?.trim());
  const result = await query<QueryResultRow & {
    id: number;
    created_at: Date | string;
    state: string;
    customer_name: string;
    customer_phone: string;
    receive_method: string;
    subtotal: string | number;
    delivery_fee: string | number;
    discount: string | number;
    total: string | number;
    currency: string;
    promo_id: number | null;
  }>(
    `
      SELECT id, created_at, state, customer_name, customer_phone, receive_method,
             subtotal, delivery_fee, discount, total, currency, promo_id
      FROM orders
      ${hasState ? "WHERE state = $1" : ""}
      ORDER BY created_at DESC
    `,
    hasState ? [state?.trim() ?? ""] : [],
  );

  return result.rows.map((row) => ({
    id: row.id,
    createdAt: asString(row.created_at),
    state: row.state,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    receiveMethod: row.receive_method,
    subtotal: asNumber(row.subtotal, 0),
    deliveryFee: asNumber(row.delivery_fee, 0),
    discount: asNumber(row.discount, 0),
    total: asNumber(row.total, 0),
    currency: row.currency,
    promoId: row.promo_id,
  }));
}

export type OrderItemRow = {
  id: number;
  orderId: number;
  designId: number | null;
  designTitle: string;
  colorId: number | null;
  colorTitle: string;
  quantity: number;
  texts: Record<string, unknown>;
  options: Record<string, unknown>;
  renders: Record<string, unknown>;
  itemTotal: number;
};

export type PaymentRow = {
  id: number;
  orderId: number;
  provider: string;
  status: string;
  amount: number;
  currency: string;
  providerInvoiceId: string;
  returnUrl: string;
  createdAt: string;
  updatedAt: string;
};

export async function getOrderById(id: number): Promise<OrderRow | null> {
  const result = await query<QueryResultRow & {
    id: number;
    created_at: Date | string;
    state: string;
    customer_name: string;
    customer_phone: string;
    receive_method: string;
    subtotal: string | number;
    delivery_fee: string | number;
    discount: string | number;
    total: string | number;
    currency: string;
    promo_id: number | null;
  }>(
    `
      SELECT id, created_at, state, customer_name, customer_phone, receive_method,
             subtotal, delivery_fee, discount, total, currency, promo_id
      FROM orders
      WHERE id = $1
      LIMIT 1
    `,
    [id],
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    createdAt: asString(row.created_at),
    state: row.state,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    receiveMethod: row.receive_method,
    subtotal: asNumber(row.subtotal, 0),
    deliveryFee: asNumber(row.delivery_fee, 0),
    discount: asNumber(row.discount, 0),
    total: asNumber(row.total, 0),
    currency: row.currency,
    promoId: row.promo_id,
  };
}

export async function listOrderItems(orderId: number): Promise<OrderItemRow[]> {
  const result = await query<QueryResultRow & {
    id: number;
    order_id: number;
    design_id: number | null;
    color_id: number | null;
    quantity: number;
    texts: unknown;
    options: unknown;
    renders: unknown;
    item_total: string | number;
    design_title: string | null;
    color_title: string | null;
  }>(
    `
      SELECT
        oi.id,
        oi.order_id,
        oi.design_id,
        oi.color_id,
        oi.quantity,
        oi.texts,
        oi.options,
        oi.renders,
        oi.item_total,
        d.title AS design_title,
        c.title AS color_title
      FROM order_items oi
      LEFT JOIN designs d ON d.id = oi.design_id
      LEFT JOIN colors c ON c.id = oi.color_id
      WHERE oi.order_id = $1
      ORDER BY oi.id ASC
    `,
    [orderId],
  );

  return result.rows.map((row) => ({
    id: row.id,
    orderId: row.order_id,
    designId: row.design_id,
    designTitle: row.design_title ?? "",
    colorId: row.color_id,
    colorTitle: row.color_title ?? "",
    quantity: row.quantity,
    texts: asObject(row.texts),
    options: asObject(row.options),
    renders: asObject(row.renders),
    itemTotal: asNumber(row.item_total, 0),
  }));
}

export async function listPayments(orderId?: number): Promise<PaymentRow[]> {
  const hasOrder = typeof orderId === "number" && Number.isFinite(orderId);
  const result = await query<QueryResultRow & {
    id: number;
    order_id: number;
    provider: string;
    status: string;
    amount: string | number;
    currency: string;
    provider_invoice_id: string | null;
    return_url: string | null;
    created_at: string | Date;
    updated_at: string | Date;
  }>(
    `
      SELECT id, order_id, provider, status, amount, currency, provider_invoice_id,
             return_url, created_at, updated_at
      FROM payments
      ${hasOrder ? "WHERE order_id = $1" : ""}
      ORDER BY created_at DESC
    `,
    hasOrder ? [orderId as number] : [],
  );

  return result.rows.map((row) => ({
    id: row.id,
    orderId: row.order_id,
    provider: row.provider,
    status: row.status,
    amount: asNumber(row.amount, 0),
    currency: row.currency,
    providerInvoiceId: row.provider_invoice_id ?? "",
    returnUrl: row.return_url ?? "",
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
  }));
}

export async function getPaymentById(id: number): Promise<PaymentRow | null> {
  const result = await query<QueryResultRow & {
    id: number;
    order_id: number;
    provider: string;
    status: string;
    amount: string | number;
    currency: string;
    provider_invoice_id: string | null;
    return_url: string | null;
    created_at: string | Date;
    updated_at: string | Date;
  }>(
    `
      SELECT id, order_id, provider, status, amount, currency, provider_invoice_id,
             return_url, created_at, updated_at
      FROM payments
      WHERE id = $1
      LIMIT 1
    `,
    [id],
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    orderId: row.order_id,
    provider: row.provider,
    status: row.status,
    amount: asNumber(row.amount, 0),
    currency: row.currency,
    providerInvoiceId: row.provider_invoice_id ?? "",
    returnUrl: row.return_url ?? "",
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
  };
}

export async function listActiveDesignOptions(): Promise<Array<{ id: number; title: string }>> {
  const result = await query<QueryResultRow & { id: number; title: string }>(
    `
      SELECT id, title
      FROM designs
      WHERE active IS TRUE
      ORDER BY COALESCE(sort_order, 1000000), id
    `,
  );

  return result.rows.map((row) => ({ id: row.id, title: row.title }));
}

export async function listActiveColorOptions(): Promise<Array<{ id: number; code: string; title: string }>> {
  const result = await query<QueryResultRow & { id: number; code: string; title: string }>(
    `
      SELECT id, code, title
      FROM colors
      WHERE active IS TRUE
      ORDER BY markup, id
    `,
  );

  return result.rows.map((row) => ({ id: row.id, code: row.code, title: row.title }));
}
