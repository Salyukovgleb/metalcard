"use server";

import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { clearAdminSession, getSessionAdminUser, makeDjangoPasswordHash } from "@/lib/auth";
import { query, withTransaction } from "@/lib/db";
import { uploadSvg } from "@/lib/storage";

function asText(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function asBool(value: FormDataEntryValue | null): boolean {
  if (typeof value !== "string") {
    return false;
  }
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function asDecimal(value: FormDataEntryValue | null, fallback = 0): number {
  const raw = asText(value);
  if (!raw) {
    return fallback;
  }
  const parsed = Number.parseFloat(raw.replace(/,/g, "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asNullableInt(value: FormDataEntryValue | null): number | null {
  const raw = asText(value);
  if (!raw) {
    return null;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function asInt(value: FormDataEntryValue | null, fallback = 0): number {
  const raw = asText(value);
  if (!raw) {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asJsonObject(value: FormDataEntryValue | null, fallback: Record<string, unknown> = {}): Record<string, unknown> {
  const raw = asText(value);
  if (!raw) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return fallback;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return fallback;
  }
}

function asDateTimeIso(value: FormDataEntryValue | null): string | null {
  const raw = asText(value);
  if (!raw) {
    return null;
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function safeRedirectPath(value: string, fallback: string): string {
  if (!value || !value.startsWith("/")) {
    return fallback;
  }
  return value;
}

async function requireAdmin(): Promise<void> {
  const user = await getSessionAdminUser();
  if (!user) {
    redirect("/login");
  }
}

function randomOrderKey(): string {
  return crypto.randomBytes(6).toString("hex");
}

async function recalcOrderTotals(orderId: number): Promise<void> {
  const subtotalRes = await query<{ subtotal: string }>(
    `
      SELECT COALESCE(sum(item_total), 0)::text AS subtotal
      FROM order_items
      WHERE order_id = $1
    `,
    [orderId],
  );
  const subtotal = Number.parseFloat(subtotalRes.rows[0]?.subtotal ?? "0") || 0;

  await query(
    `
      UPDATE orders
      SET subtotal = $2,
          total = $2 + COALESCE(delivery_fee, 0) - COALESCE(discount, 0)
      WHERE id = $1
    `,
    [orderId, subtotal],
  );
}

export async function logoutAction(): Promise<void> {
  await clearAdminSession();
  redirect("/login");
}

export async function updateDesignSortAction(formData: FormData): Promise<void> {
  await requireAdmin();

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("order_")) {
      continue;
    }

    const id = Number.parseInt(key.slice("order_".length), 10);
    if (!Number.isFinite(id) || id <= 0) {
      continue;
    }

    const rawSort = asText(value);
    const sortOrder = rawSort ? asInt(value, 0) : null;

    await query("UPDATE designs SET sort_order = $1 WHERE id = $2", [sortOrder, id]);
  }

  const redirectTo = safeRedirectPath(asText(formData.get("redirect_to")), "/designs");
  redirect(redirectTo);
}

export async function createDesignAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const title = asText(formData.get("title"));
  const category = asText(formData.get("category"));
  const basePrice = asDecimal(formData.get("base_price"), 0);
  const priceOverrides = asJsonObject(formData.get("price_overrides"), {});
  const active = asBool(formData.get("active"));
  const previewWebp = asText(formData.get("preview_webp"));
  const sortOrderRaw = asText(formData.get("sort_order"));
  const sortOrder = sortOrderRaw ? asInt(formData.get("sort_order"), 0) : null;

  const svgFile = formData.get("svg_file");
  let svgOrig = asText(formData.get("svg_orig"));
  if (svgFile instanceof File && svgFile.size > 0) {
    try {
      svgOrig = await uploadSvg(svgFile);
    } catch {
      redirect("/designs/new?error=upload");
    }
  }

  if (!title || !svgOrig) {
    redirect("/designs/new?error=1");
  }

  await query(
    `
      INSERT INTO designs (title, category, svg_orig, preview_webp, base_price, sort_order, price_overrides, active)
      VALUES ($1, NULLIF($2, ''), $3, NULLIF($4, ''), $5, $6, $7::jsonb, $8)
    `,
    [title, category, svgOrig, previewWebp, basePrice, sortOrder, JSON.stringify(priceOverrides), active],
  );

  redirect("/designs");
}

export async function updateDesignAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = asInt(formData.get("id"));
  if (id <= 0) {
    redirect("/designs?error=1");
  }

  const existing = await query<{ svg_orig: string }>("SELECT svg_orig FROM designs WHERE id = $1 LIMIT 1", [id]);
  const currentSvg = existing.rows[0]?.svg_orig ?? "";

  const title = asText(formData.get("title"));
  const category = asText(formData.get("category"));
  const basePrice = asDecimal(formData.get("base_price"), 0);
  const priceOverrides = asJsonObject(formData.get("price_overrides"), {});
  const active = asBool(formData.get("active"));
  const previewWebp = asText(formData.get("preview_webp"));
  const sortOrderRaw = asText(formData.get("sort_order"));
  const sortOrder = sortOrderRaw ? asInt(formData.get("sort_order"), 0) : null;

  const svgFile = formData.get("svg_file");
  let svgOrig = asText(formData.get("svg_orig"));
  if (svgFile instanceof File && svgFile.size > 0) {
    try {
      svgOrig = await uploadSvg(svgFile);
    } catch {
      redirect(`/designs/${id}/edit?error=upload`);
    }
  }
  if (!svgOrig) {
    svgOrig = currentSvg;
  }

  if (!title || !svgOrig) {
    redirect(`/designs/${id}/edit?error=1`);
  }

  await query(
    `
      UPDATE designs
      SET title = $2,
          category = NULLIF($3, ''),
          svg_orig = $4,
          preview_webp = NULLIF($5, ''),
          base_price = $6,
          sort_order = $7,
          price_overrides = $8::jsonb,
          active = $9
      WHERE id = $1
    `,
    [id, title, category, svgOrig, previewWebp, basePrice, sortOrder, JSON.stringify(priceOverrides), active],
  );

  redirect("/designs");
}

export async function deleteDesignAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = asInt(formData.get("id"));
  if (id > 0) {
    await query("DELETE FROM designs WHERE id = $1", [id]);
  }
  redirect("/designs");
}

export async function createColorAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const code = asText(formData.get("code"));
  const title = asText(formData.get("title"));
  const markup = asDecimal(formData.get("markup"), 0);
  const params = asJsonObject(formData.get("params"), {});
  const active = asBool(formData.get("active"));

  if (!code || !title) {
    redirect("/colors/new?error=1");
  }

  await query(
    `
      INSERT INTO colors (code, title, markup, params, active)
      VALUES ($1, $2, $3, $4::jsonb, $5)
    `,
    [code, title, markup, JSON.stringify(params), active],
  );

  redirect("/colors");
}

export async function updateColorAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = asInt(formData.get("id"));
  if (id <= 0) {
    redirect("/colors?error=1");
  }

  const code = asText(formData.get("code"));
  const title = asText(formData.get("title"));
  const markup = asDecimal(formData.get("markup"), 0);
  const params = asJsonObject(formData.get("params"), {});
  const active = asBool(formData.get("active"));

  if (!code || !title) {
    redirect(`/colors/${id}/edit?error=1`);
  }

  await query(
    `
      UPDATE colors
      SET code = $2,
          title = $3,
          markup = $4,
          params = $5::jsonb,
          active = $6
      WHERE id = $1
    `,
    [id, code, title, markup, JSON.stringify(params), active],
  );

  redirect("/colors");
}

export async function deleteColorAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = asInt(formData.get("id"));
  if (id > 0) {
    await query("DELETE FROM colors WHERE id = $1", [id]);
  }
  redirect("/colors");
}

export async function createPromoAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const code = asText(formData.get("code"));
  const active = asBool(formData.get("active"));
  const fixedPriceRaw = asText(formData.get("fixed_price"));
  const fixedPrice = fixedPriceRaw ? asDecimal(formData.get("fixed_price"), 0) : null;
  const designId = asNullableInt(formData.get("design_id"));
  const colorId = asNullableInt(formData.get("color_id"));
  const startsAt = asDateTimeIso(formData.get("starts_at"));
  const endsAt = asDateTimeIso(formData.get("ends_at"));

  if (!code) {
    redirect("/promos/new?error=1");
  }

  await query(
    `
      INSERT INTO promos (code, active, fixed_price, design_id, color_id, starts_at, ends_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
    [code, active, fixedPrice, designId, colorId, startsAt, endsAt],
  );

  redirect("/promos");
}

export async function updatePromoAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = asInt(formData.get("id"));
  if (id <= 0) {
    redirect("/promos?error=1");
  }

  const code = asText(formData.get("code"));
  const active = asBool(formData.get("active"));
  const fixedPriceRaw = asText(formData.get("fixed_price"));
  const fixedPrice = fixedPriceRaw ? asDecimal(formData.get("fixed_price"), 0) : null;
  const designId = asNullableInt(formData.get("design_id"));
  const colorId = asNullableInt(formData.get("color_id"));
  const startsAt = asDateTimeIso(formData.get("starts_at"));
  const endsAt = asDateTimeIso(formData.get("ends_at"));

  if (!code) {
    redirect(`/promos/${id}/edit?error=1`);
  }

  await query(
    `
      UPDATE promos
      SET code = $2,
          active = $3,
          fixed_price = $4,
          design_id = $5,
          color_id = $6,
          starts_at = $7,
          ends_at = $8
      WHERE id = $1
    `,
    [id, code, active, fixedPrice, designId, colorId, startsAt, endsAt],
  );

  redirect("/promos");
}

export async function deletePromoAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = asInt(formData.get("id"));
  if (id > 0) {
    await query("DELETE FROM promos WHERE id = $1", [id]);
  }
  redirect("/promos");
}

export async function createAppUserAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const fullName = asText(formData.get("full_name"));
  const email = asText(formData.get("email")).toLowerCase();
  const telegramId = asNullableInt(formData.get("telegram_id"));
  const newPassword = asText(formData.get("new_password"));
  const confirmPassword = asText(formData.get("confirm_password"));

  if (!fullName || !email || !newPassword || newPassword !== confirmPassword || newPassword.length < 6) {
    redirect("/users/new?error=1");
  }

  await query(
    `
      INSERT INTO users (full_name, email, password_hash, telegram_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, now(), now())
    `,
    [fullName, email, makeDjangoPasswordHash(newPassword), telegramId],
  );

  redirect("/users");
}

export async function updateAppUserAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = asInt(formData.get("id"));
  if (id <= 0) {
    redirect("/users?error=1");
  }

  const fullName = asText(formData.get("full_name"));
  const email = asText(formData.get("email")).toLowerCase();
  const telegramId = asNullableInt(formData.get("telegram_id"));
  const newPassword = asText(formData.get("new_password"));
  const confirmPassword = asText(formData.get("confirm_password"));

  if (!fullName || !email) {
    redirect(`/users/${id}/edit?error=1`);
  }

  if ((newPassword || confirmPassword) && (newPassword !== confirmPassword || newPassword.length < 6)) {
    redirect(`/users/${id}/edit?error=1`);
  }

  if (newPassword) {
    await query(
      `
        UPDATE users
        SET full_name = $2,
            email = $3,
            telegram_id = $4,
            password_hash = $5,
            updated_at = now()
        WHERE id = $1
      `,
      [id, fullName, email, telegramId, makeDjangoPasswordHash(newPassword)],
    );
  } else {
    await query(
      `
        UPDATE users
        SET full_name = $2,
            email = $3,
            telegram_id = $4,
            updated_at = now()
        WHERE id = $1
      `,
      [id, fullName, email, telegramId],
    );
  }

  redirect("/users");
}

export async function deleteAppUserAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = asInt(formData.get("id"));
  if (id > 0) {
    await query("DELETE FROM users WHERE id = $1", [id]);
  }
  redirect("/users");
}

export async function createOrderAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const customerName = asText(formData.get("customer_name"));
  const customerPhone = asText(formData.get("customer_phone"));
  const receiveMethod = asText(formData.get("receive_method"));
  const promoId = asNullableInt(formData.get("promo_id"));
  const deliveryFee = asDecimal(formData.get("delivery_fee"), 0);
  const discount = asDecimal(formData.get("discount"), 0);
  const currency = asText(formData.get("currency")) || "UZS";
  const notes = asText(formData.get("notes"));

  if (!customerName || !customerPhone || !(receiveMethod === "delivery" || receiveMethod === "pickup")) {
    redirect("/orders/new?error=1");
  }

  const result = await query<{ id: number }>(
    `
      INSERT INTO orders (
        created_at, state, customer_name, customer_phone, receive_method,
        order_key, manage_key, promo_id, subtotal, delivery_fee, discount, total, currency, utm, notes
      )
      VALUES (
        now(), 'created', $1, $2, $3,
        $4, $5, $6, 0, $7, $8, $7 - $8, $9, '{}'::jsonb, NULLIF($10, '')
      )
      RETURNING id
    `,
    [customerName, customerPhone, receiveMethod, randomOrderKey(), randomOrderKey(), promoId, deliveryFee, discount, currency, notes],
  );

  const id = result.rows[0]?.id;
  redirect(id ? `/orders/${id}` : "/orders");
}

export async function updateOrderStatusAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const orderId = asInt(formData.get("order_id"));
  const state = asText(formData.get("state"));
  const validStates = new Set(["created", "paid", "cash", "canceled", "production", "shipped", "done"]);

  if (orderId > 0 && validStates.has(state)) {
    await query("UPDATE orders SET state = $2 WHERE id = $1", [orderId, state]);
  }

  redirect(`/orders/${orderId}`);
}

export async function addOrderItemAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const orderId = asInt(formData.get("order_id"));
  if (orderId <= 0) {
    redirect("/orders");
  }

  const designId = asNullableInt(formData.get("design_id"));
  const colorId = asNullableInt(formData.get("color_id"));
  const quantity = Math.max(1, asInt(formData.get("quantity"), 1));
  const texts = asJsonObject(formData.get("texts"), {});
  const options = asJsonObject(formData.get("options"), {});
  const renders = asJsonObject(formData.get("renders"), {});
  const itemTotal = asDecimal(formData.get("item_total"), 0);

  await withTransaction(async (client) => {
    await client.query(
      `
        INSERT INTO order_items (order_id, design_id, color_id, quantity, options, texts, renders, item_total)
        VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8)
      `,
      [orderId, designId, colorId, quantity, JSON.stringify(options), JSON.stringify(texts), JSON.stringify(renders), itemTotal],
    );

    const subtotalRes = await client.query<{ subtotal: string }>(
      `
        SELECT COALESCE(sum(item_total), 0)::text AS subtotal
        FROM order_items
        WHERE order_id = $1
      `,
      [orderId],
    );
    const subtotal = Number.parseFloat(subtotalRes.rows[0]?.subtotal ?? "0") || 0;

    await client.query(
      `
        UPDATE orders
        SET subtotal = $2,
            total = $2 + COALESCE(delivery_fee, 0) - COALESCE(discount, 0)
        WHERE id = $1
      `,
      [orderId, subtotal],
    );
  });

  redirect(`/orders/${orderId}`);
}

export async function deleteOrderItemAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const orderId = asInt(formData.get("order_id"));
  const itemId = asInt(formData.get("item_id"));

  if (orderId > 0 && itemId > 0) {
    await query("DELETE FROM order_items WHERE id = $1 AND order_id = $2", [itemId, orderId]);
    await recalcOrderTotals(orderId);
  }

  redirect(`/orders/${orderId}`);
}

export async function updatePaymentAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = asInt(formData.get("id"));
  const orderId = asInt(formData.get("order_id"));
  const provider = asText(formData.get("provider"));
  const status = asText(formData.get("status"));
  const amount = asDecimal(formData.get("amount"), 0);
  const currency = asText(formData.get("currency")) || "UZS";
  const providerInvoiceId = asText(formData.get("provider_invoice_id"));
  const returnUrl = asText(formData.get("return_url"));

  if (id <= 0 || orderId <= 0 || !provider || !status) {
    redirect("/payments?error=1");
  }

  await query(
    `
      UPDATE payments
      SET order_id = $2,
          provider = $3,
          status = $4,
          amount = $5,
          currency = $6,
          provider_invoice_id = NULLIF($7, ''),
          return_url = NULLIF($8, ''),
          updated_at = now()
      WHERE id = $1
    `,
    [id, orderId, provider, status, amount, currency, providerInvoiceId, returnUrl],
  );

  redirect("/payments");
}
