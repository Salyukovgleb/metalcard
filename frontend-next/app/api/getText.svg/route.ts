import { NextRequest } from "next/server";
import { getDrawApp } from "@/lib/draw-app";

const FONT_ALIASES: Record<string, string> = {
  gilroy: "gilroy",
  "alex-brush": "alex-brush",
  arabella: "arabella",
  bodoni: "bodoni",
  num: "num",
  card: "num",
  candlescript: "candlescript",
  castileo: "castileo",
  lombardia: "lombardia",
  "monotype-corsiva": "monotype-corsiva",
  porcelain: "porcelain",
  postmaster: "postmaster",
  "racing-catalogue": "racing-catalogue",
  resphekt: "resphekt",
};

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function resolveFontFamily(rawFont: string): string {
  const trimmed = rawFont.trim();
  if (!trimmed) {
    return "gilroy";
  }

  const direct = FONT_ALIASES[trimmed];
  if (direct) {
    return direct;
  }

  const lower = trimmed.toLowerCase();
  return FONT_ALIASES[lower] ?? "gilroy";
}

export async function GET(request: NextRequest) {
  const text = request.nextUrl.searchParams.get("text") ?? "";
  const font = request.nextUrl.searchParams.get("font") ?? "gilroy";
  const safeText = text.trim();
  const fontFamily = resolveFontFamily(font);

  if (!safeText) {
    return new Response("", {
      headers: {
        "Content-Type": "image/svg+xml",
      },
    });
  }

  try {
    const drawApp = await getDrawApp();
    const svg = drawApp.drawFullInscr(safeText, fontFamily);
    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
      },
    });
  } catch {
    // Last-resort fallback without forced text stretching.
    const fallbackSvg = `<svg viewBox="0 0 1000 180" xmlns="http://www.w3.org/2000/svg"><text class="svgdevtextmc" x="0" y="120" style="font-family:'${escapeXml(fontFamily)}';font-size:120px;dominant-baseline:alphabetic">${escapeXml(safeText)}</text></svg>`;
    return new Response(fallbackSvg, {
      headers: {
        "Content-Type": "image/svg+xml",
      },
    });
  }
}
