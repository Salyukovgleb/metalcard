import { NextRequest } from "next/server";

const FONT_ALIASES: Record<string, string> = {
  gilroy: "Gilroy",
  "alex-brush": "Alex Brush",
  arabella: "Arabella",
  bodoni: "Bodoni",
  num: "Card",
  card: "Card",
  candlescript: "Candlescript",
  castileo: "Castileo",
  lombardia: "Lombardia",
  "monotype-corsiva": "Monotype Corsiva",
  porcelain: "Porcelain",
  postmaster: "Postmaster",
  "racing-catalogue": "Racing Catalogue",
  resphekt: "Resphekt",
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
    return "Gilroy";
  }

  const direct = FONT_ALIASES[trimmed];
  if (direct) {
    return direct;
  }

  const lower = trimmed.toLowerCase();
  return FONT_ALIASES[lower] ?? trimmed;
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

  const svg = `<svg viewBox="0 0 1000 180" xmlns="http://www.w3.org/2000/svg"><text class="svgdevtextmc" x="0" y="120" textLength="980" lengthAdjust="spacingAndGlyphs" style="font-family:'${escapeXml(fontFamily)}';font-size:120px;dominant-baseline:alphabetic">${escapeXml(safeText)}</text></svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
    },
  });
}
