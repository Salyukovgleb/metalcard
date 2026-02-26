import { NextResponse } from "next/server";
import { clearAnalyticsCookies, setAnalyticsConsentCookie } from "@/lib/analytics";

type ConsentBody = {
  consent?: unknown;
};

type ConsentValue = "accepted" | "rejected";

function parseConsent(value: unknown): ConsentValue | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "accepted" || normalized === "rejected") {
    return normalized;
  }
  return null;
}

export async function POST(request: Request) {
  let body: ConsentBody = {};
  try {
    body = (await request.json()) as ConsentBody;
  } catch {
    // keep empty body
  }

  const consent = parseConsent(body.consent);
  if (!consent) {
    return NextResponse.json({ ok: false, message: "invalid_consent" }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true, consent });
  setAnalyticsConsentCookie(response, consent);
  if (consent === "rejected") {
    clearAnalyticsCookies(response);
  }
  return response;
}
