import { NextResponse } from "next/server";
import type { QueryResultRow } from "pg";
import { POST as merchantPost } from "@/app/api/payme/merchant/route";
import { query } from "@/lib/db";
import { rateLimitResponse } from "@/lib/rate-limit";

type ParsedBody = {
  json: Record<string, unknown> | null;
  form: URLSearchParams;
};

function asString(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

function asInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

async function parseBody(request: Request): Promise<ParsedBody> {
  const text = await request.text();
  if (!text.trim()) {
    return { json: null, form: new URLSearchParams() };
  }

  try {
    const parsed = JSON.parse(text) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return { json: parsed as Record<string, unknown>, form: new URLSearchParams() };
    }
  } catch {
    // Ignore JSON parse failures and treat as form payload.
  }

  return { json: null, form: new URLSearchParams(text) };
}

function findParam(
  search: URLSearchParams,
  bodyJson: Record<string, unknown> | null,
  bodyForm: URLSearchParams,
  keys: string[],
): string {
  for (const key of keys) {
    const fromSearch = search.get(key);
    if (fromSearch !== null) {
      return fromSearch;
    }
    const fromForm = bodyForm.get(key);
    if (fromForm !== null) {
      return fromForm;
    }
    if (bodyJson && key in bodyJson) {
      return asString(bodyJson[key]);
    }
  }

  if (bodyJson) {
    for (const [key, value] of Object.entries(bodyJson)) {
      const normalized = key.replaceAll("[", ".").replaceAll("]", "");
      if (normalized.endsWith(".order_id")) {
        return asString(value);
      }
    }
  }

  for (const [key, value] of bodyForm.entries()) {
    const normalized = key.replaceAll("[", ".").replaceAll("]", "");
    if (normalized.endsWith(".order_id")) {
      return value;
    }
  }

  return "";
}

async function handleCallback(request: Request) {
  const limited = rateLimitResponse(request, "payme_callback", {
    limit: 60,
    windowSec: 60,
  });
  if (limited) {
    return limited;
  }

  const merchantRequest = request.clone();
  const url = new URL(request.url);
  const { json: bodyJson, form: bodyForm } = await parseBody(request);

  if (
    bodyJson &&
    asString(bodyJson.jsonrpc) === "2.0" &&
    typeof bodyJson.method === "string"
  ) {
    // Some Paycom кабинеты are configured with merchant endpoint = root URL.
    // Route JSON-RPC calls to merchant handler to keep payments working.
    return merchantPost(merchantRequest);
  }

  const orderIdRaw = findParam(url.searchParams, bodyJson, bodyForm, ["order_id", "ac.order_id", "ac_order_id"]);
  const txnId = findParam(url.searchParams, bodyJson, bodyForm, ["t", "transaction", "paycom_transaction_id"]);
  const orderId = asInt(orderIdRaw);

  if (orderId && orderId > 0) {
    const result = await query<QueryResultRow & { id: number }>(
      `
        SELECT id
        FROM payments
        WHERE order_id = $1
          AND provider = 'payme'
          AND status = 'succeeded'
          AND ($2::text IS NULL OR provider_invoice_id = $2::text)
        ORDER BY id DESC
        LIMIT 1
      `,
      [orderId, txnId || null],
    );

    if (result.rows[0]) {
      await query(
        `
          UPDATE orders
          SET state = 'paid'
          WHERE id = $1
            AND state <> 'paid'
        `,
        [orderId],
      );
    }
  }

  return NextResponse.json({ status: "ok" });
}

export async function POST(request: Request) {
  return handleCallback(request);
}

export async function GET(request: Request) {
  return handleCallback(request);
}
