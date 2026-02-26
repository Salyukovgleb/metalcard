import { NextResponse } from "next/server";
import { applyAnalyticsCookies, recordAnalyticsEvent } from "@/lib/analytics";

type TrackBody = {
  eventName?: unknown;
  path?: unknown;
  payload?: unknown;
};

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

export async function POST(request: Request) {
  let body: TrackBody = {};
  try {
    body = (await request.json()) as TrackBody;
  } catch {
    // keep empty body
  }

  const eventName = asString(body.eventName, "page_view");
  const path = asString(body.path, "");
  const payload = body.payload;

  const identity = await recordAnalyticsEvent(request, {
    eventName,
    path,
    payload,
  });

  const response = NextResponse.json({ ok: true });
  applyAnalyticsCookies(response, identity);
  return response;
}
