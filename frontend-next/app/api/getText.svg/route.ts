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

function buildReadableFallbackSvg(text: string, fontFamily: string): string {
  const fontSize = 84;
  const viewBoxHeight = 120;
  const avgGlyphWidth = 0.62;
  const viewBoxWidth = Math.max(140, Math.ceil(text.length * fontSize * avgGlyphWidth));

  return `<svg viewBox="0 0 ${viewBoxWidth} ${viewBoxHeight}" xmlns="http://www.w3.org/2000/svg"><style>.svgdevtextmc{fill:#f5f5f5;stroke:#0f0f0f;stroke-width:4;paint-order:stroke fill;stroke-linejoin:round;}</style><text class="svgdevtextmc" x="0" y="${Math.round(fontSize * 0.9)}" style="font-family:'${escapeXml(fontFamily)}';font-size:${fontSize}px;dominant-baseline:alphabetic">${escapeXml(text)}</text></svg>`;
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
    // Last-resort fallback with tight viewBox to keep inscription readable in editor.
    const fallbackSvg = buildReadableFallbackSvg(safeText, fontFamily);
    return new Response(fallbackSvg, {
      headers: {
        "Content-Type": "image/svg+xml",
      },
    });
  }
}
