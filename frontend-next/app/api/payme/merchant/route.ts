import { NextResponse } from "next/server";
import type { QueryResultRow } from "pg";
import { query, withTransaction } from "@/lib/db";
import { rateLimitResponse } from "@/lib/rate-limit";
import { notifyPaidOrder } from "@/lib/telegram-notify";

type RpcRequest = {
  id?: unknown;
  method?: unknown;
  params?: Record<string, unknown>;
};

type DbOrderRow = QueryResultRow & {
  id: number;
  total: string | number | null;
  state: string;
};

type DbPaymentRow = QueryResultRow & {
  id: number;
  order_id: number;
  status: string;
  provider_invoice_id: string | null;
  updated_ms?: string | number | null;
};

function asBool(value: string | undefined, fallback = false): boolean {
  const normalized = (value ?? "").trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }
  return ["1", "true", "yes", "on"].includes(normalized);
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

function asInt(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
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

function nowMs(): number {
  return Date.now();
}

function paymentState(status: string): 1 | 2 | -1 {
  if (status === "succeeded") {
    return 2;
  }
  if (status === "failed" || status === "canceled") {
    return -1;
  }
  return 1;
}

function rpcOk(id: unknown, result: Record<string, unknown>) {
  return NextResponse.json({
    jsonrpc: "2.0",
    id: id ?? null,
    result,
  });
}

function rpcErr(id: unknown, code: number, message: string) {
  return NextResponse.json({
    jsonrpc: "2.0",
    id: id ?? null,
    error: {
      code,
      message,
    },
  });
}

function authOk(request: Request): boolean {
  const expectedKey = (process.env.PAYME_KEY ?? process.env.PAYME_KEY_PROD ?? "").trim();
  const expectedMerchantId = (process.env.PAYME_MERCHANT_ID ?? "").trim();
  const expectedLogin = (process.env.PAYME_LOGIN ?? "Paycom").trim();
  const requireBasic = asBool(process.env.PAYME_REQUIRE_BASIC, true);

  if (!expectedKey) {
    return false;
  }

  const authHeader = (request.headers.get("authorization") ?? "").trim();
  if (authHeader.toLowerCase().startsWith("basic ")) {
    try {
      const raw = authHeader.slice(6).trim();
      const decoded = Buffer.from(raw, "base64").toString("utf-8");
      const [login, password] = decoded.includes(":") ? decoded.split(":", 2) : ["", decoded];
      if (password === expectedKey && (!expectedLogin || login === expectedLogin)) {
        return true;
      }
    } catch {
      // Fall through to compatibility mode.
    }
  }

  if (requireBasic) {
    return false;
  }

  const rawAuth = (
    request.headers.get("x-auth") ??
    request.headers.get("x-auth-token") ??
    request.headers.get("authorization") ??
    ""
  ).trim();
  if (!rawAuth) {
    return false;
  }

  if (rawAuth === expectedKey) {
    return true;
  }

  const lowered = rawAuth.toLowerCase();
  for (const prefix of ["bearer ", "key "]) {
    if (lowered.startsWith(prefix)) {
      const token = rawAuth.slice(prefix.length).trim();
      return token === expectedKey;
    }
  }

  if (lowered.startsWith("basic ")) {
    try {
      const decoded = Buffer.from(rawAuth.slice(6).trim(), "base64").toString("utf-8");
      if (decoded.includes(":")) {
        const [left, right] = decoded.split(":", 2);
        if (
          right === expectedKey &&
          (!expectedMerchantId || !left || left === expectedMerchantId || left === expectedLogin)
        ) {
          return true;
        }
      } else if (decoded === expectedKey) {
        return true;
      }
    } catch {
      return false;
    }
  }

  return false;
}

async function findOrder(orderId: number): Promise<DbOrderRow | null> {
  const result = await query<DbOrderRow>(
    `
      SELECT id, total, state::text AS state
      FROM orders
      WHERE id = $1
      LIMIT 1
    `,
    [orderId],
  );
  return result.rows[0] ?? null;
}

async function findPaymentByProviderId(providerId: string): Promise<DbPaymentRow | null> {
  const result = await query<DbPaymentRow>(
    `
      SELECT id, order_id, status::text AS status, provider_invoice_id
      FROM payments
      WHERE provider = 'payme'
        AND provider_invoice_id = $1
      LIMIT 1
    `,
    [providerId],
  );
  return result.rows[0] ?? null;
}

async function getPaymentTimestampMs(id: number): Promise<number> {
  const result = await query<QueryResultRow & { updated_ms: string | number | null }>(
    `
      SELECT EXTRACT(EPOCH FROM COALESCE(updated_at, created_at)) * 1000 AS updated_ms
      FROM payments
      WHERE id = $1
      LIMIT 1
    `,
    [id],
  );
  return Math.round(asNumber(result.rows[0]?.updated_ms, nowMs()));
}

export async function POST(request: Request) {
  const limited = rateLimitResponse(request, "payme_merchant_api", {
    limit: 60,
    windowSec: 60,
  });
  if (limited) {
    return limited;
  }

  const paymeUseTest = asBool(process.env.PAYME_USE_TEST, false);
  if (!authOk(request) && !paymeUseTest) {
    return NextResponse.json({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32504, message: "Unauthorized" },
    });
  }

  let body: RpcRequest;
  try {
    body = (await request.json()) as RpcRequest;
  } catch {
    return NextResponse.json({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32700, message: "Parse error" },
    });
  }

  const method = asString(body.method, "");
  const params = body.params ?? {};

  if (method === "CheckPerformTransaction") {
    const amountTiyin = asInt(params.amount, 0);
    const account = (params.account ?? {}) as Record<string, unknown>;
    const orderId = asInt(account.order_id, 0);

    if (orderId <= 0) {
      return rpcErr(body.id, -31050, "Order not found");
    }

    const order = await findOrder(orderId);
    if (!order) {
      return rpcErr(body.id, -31050, "Order not found");
    }
    if (order.state === "paid") {
      return rpcErr(body.id, -31008, "Order already paid");
    }

    const expected = Math.round(asNumber(order.total, 0) * 100);
    if (amountTiyin !== expected) {
      return rpcErr(body.id, -31001, "Invalid amount");
    }

    return rpcOk(body.id, { allow: true });
  }

  if (method === "CreateTransaction") {
    const account = (params.account ?? {}) as Record<string, unknown>;
    const providerInvoiceId = asString(params.id, "");
    const amountTiyin = asInt(params.amount, 0);
    const orderId = asInt(account.order_id, 0);

    if (!providerInvoiceId || orderId <= 0) {
      return rpcErr(body.id, -31050, "Order not found");
    }

    const order = await findOrder(orderId);
    if (!order) {
      return rpcErr(body.id, -31050, "Order not found");
    }
    if (order.state === "paid" || order.state === "canceled") {
      return rpcErr(body.id, -31008, "Order is blocked");
    }

    const expectedTiyin = Math.round(asNumber(order.total, 0) * 100);
    if (amountTiyin !== expectedTiyin) {
      return rpcErr(body.id, -31001, "Invalid amount");
    }

    const lastPaymentResult = await query<DbPaymentRow>(
      `
        SELECT id, order_id, status::text AS status, provider_invoice_id
        FROM payments
        WHERE provider = 'payme'
          AND order_id = $1
        ORDER BY id DESC
        LIMIT 1
      `,
      [orderId],
    );
    const lastPayment = lastPaymentResult.rows[0];
    if (
      lastPayment &&
      (lastPayment.status === "pending" || lastPayment.status === "succeeded") &&
      lastPayment.provider_invoice_id &&
      lastPayment.provider_invoice_id !== providerInvoiceId
    ) {
      return rpcErr(body.id, -31052, "Account is being processed");
    }

    const existingByProvider = await findPaymentByProviderId(providerInvoiceId);
    if (existingByProvider) {
      return rpcOk(body.id, {
        create_time: await getPaymentTimestampMs(existingByProvider.id),
        transaction: String(existingByProvider.id),
        state: paymentState(existingByProvider.status),
      });
    }

    const paymentId = await withTransaction(async (client) => {
      const pendingWithoutProvider = await client.query<QueryResultRow & { id: number }>(
        `
          SELECT id
          FROM payments
          WHERE provider = 'payme'
            AND order_id = $1
            AND status = 'pending'
            AND provider_invoice_id IS NULL
          ORDER BY id DESC
          LIMIT 1
        `,
        [orderId],
      );
      const reuse = pendingWithoutProvider.rows[0];

      if (reuse) {
        await client.query(
          `
            UPDATE payments
            SET provider_invoice_id = $1, amount = $2, updated_at = now()
            WHERE id = $3
          `,
          [providerInvoiceId, Math.round(expectedTiyin / 100), reuse.id],
        );
        return reuse.id;
      }

      const inserted = await client.query<QueryResultRow & { id: number }>(
        `
          INSERT INTO payments (
            order_id,
            provider,
            status,
            amount,
            currency,
            return_url,
            provider_invoice_id,
            created_at,
            updated_at
          )
          VALUES (
            $1,
            'payme',
            'pending',
            $2,
            'UZS',
            NULL,
            $3,
            now(),
            now()
          )
          RETURNING id
        `,
        [orderId, Math.round(expectedTiyin / 100), providerInvoiceId],
      );
      return inserted.rows[0].id;
    });

    return rpcOk(body.id, {
      create_time: nowMs(),
      transaction: String(paymentId),
      state: 1,
    });
  }

  if (method === "CheckTransaction") {
    const providerInvoiceId = asString(params.id, "");
    if (!providerInvoiceId) {
      return rpcErr(body.id, -31003, "Transaction not found");
    }

    const payment = await findPaymentByProviderId(providerInvoiceId);
    if (!payment) {
      return rpcErr(body.id, -31003, "Transaction not found");
    }

    return rpcOk(body.id, {
      create_time: await getPaymentTimestampMs(payment.id),
      transaction: String(payment.id),
      state: paymentState(payment.status),
    });
  }

  if (method === "PerformTransaction") {
    const providerInvoiceId = asString(params.id, "");
    if (!providerInvoiceId) {
      return rpcErr(body.id, -31003, "Transaction not found");
    }

    const payment = await findPaymentByProviderId(providerInvoiceId);
    if (!payment) {
      return rpcErr(body.id, -31003, "Transaction not found");
    }

    if (payment.status === "succeeded") {
      return rpcOk(body.id, {
        perform_time: await getPaymentTimestampMs(payment.id),
        transaction: String(payment.id),
        state: 2,
      });
    }

    if (payment.status === "canceled" || payment.status === "failed") {
      return rpcErr(body.id, -31008, "Transaction is not active");
    }

    await withTransaction(async (client) => {
      await client.query(
        `
          UPDATE payments
          SET status = 'succeeded', updated_at = now()
          WHERE id = $1
        `,
        [payment.id],
      );
      await client.query(
        `
          UPDATE orders
          SET state = 'paid'
          WHERE id = $1
        `,
        [payment.order_id],
      );
    });

    try {
      await notifyPaidOrder(payment.order_id, request);
    } catch {
      // Ignore notify failures to keep Payme flow resilient.
    }

    return rpcOk(body.id, {
      perform_time: await getPaymentTimestampMs(payment.id),
      transaction: String(payment.id),
      state: 2,
    });
  }

  if (method === "CancelTransaction") {
    const providerInvoiceId = asString(params.id, "");
    if (!providerInvoiceId) {
      return rpcErr(body.id, -31003, "Transaction not found");
    }

    const payment = await findPaymentByProviderId(providerInvoiceId);
    if (!payment) {
      return rpcErr(body.id, -31003, "Transaction not found");
    }

    if (payment.status === "succeeded") {
      return rpcErr(body.id, -31007, "Cannot cancel performed transaction");
    }

    if (payment.status === "canceled" || payment.status === "failed") {
      return rpcOk(body.id, {
        cancel_time: await getPaymentTimestampMs(payment.id),
        transaction: String(payment.id),
        state: -1,
      });
    }

    await query(
      `
        UPDATE payments
        SET status = 'canceled', updated_at = now()
        WHERE id = $1
      `,
      [payment.id],
    );

    return rpcOk(body.id, {
      cancel_time: await getPaymentTimestampMs(payment.id),
      transaction: String(payment.id),
      state: -1,
    });
  }

  return rpcErr(body.id, -32601, "Method not found");
}

export async function GET() {
  return NextResponse.json({ error: "POST required" }, { status: 405 });
}
