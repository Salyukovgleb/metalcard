import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

type DrawTextItem = {
  text?: string;
  fontName?: string;
  pos?: {
    top?: number;
    left?: number;
    width?: number;
  };
};

type DrawTextInput = unknown;

type DrawApp = {
  drawTextOnSideA: (data: DrawTextInput) => string;
  drawTextOnSideB: (data: DrawTextInput, cardNum: string, cardTime: string) => string;
  drawFullInscr: (text: string, fontName: string) => string;
  drawOnSideANew?: (data: DrawTextInput, designFilePath?: string) => string;
  drawOnSideBNew?: (data: DrawTextInput, cardNum: string, cardTime: string) => string;
};

const SVG_WIDTH = 238.1;
const SVG_HEIGHT = 150.2;

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function toNumber(value: unknown, fallback: number): number {
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeFontName(fontName: string): string {
  const raw = fontName.trim();
  return raw || "Gilroy";
}

function normalizeItems(data: DrawTextInput): DrawTextItem[] {
  if (!Array.isArray(data)) {
    return [];
  }
  return data as DrawTextItem[];
}

function drawInscriptions(items: DrawTextItem[]): string {
  return items
    .map((item) => {
      const text = String(item.text ?? "").trim();
      if (!text) {
        return "";
      }

      const pos = item.pos ?? {};
      const top = clamp(toNumber(pos.top, 50), 0, 100);
      const left = clamp(toNumber(pos.left, 0), 0, 100);
      const x = (left / 100) * SVG_WIDTH;
      const y = (top / 100) * SVG_HEIGHT;
      const fontFamily = normalizeFontName(String(item.fontName ?? "Gilroy"));

      return `<text class="svgdevtextmc" x="${x.toFixed(3)}" y="${y.toFixed(3)}" style="font-family:'${escapeXml(fontFamily)}';font-size:20px;dominant-baseline:hanging">${escapeXml(text)}</text>`;
    })
    .join("");
}

function drawCardData(cardNum: string, cardTime: string): string {
  const num = escapeXml((cardNum ?? "").trim());
  const time = escapeXml((cardTime ?? "").trim());

  return [
    `<text class="svgdevtextmc" x="11.214" y="90.120" style="font-family:'Card';font-size:7.1px">${num}</text>`,
    `<text class="svgdevtextmc" x="190.480" y="90.120" style="font-family:'Card';font-size:7.1px">${time}</text>`,
  ].join("");
}

function drawSvg(contents: string): string {
  return `<svg viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" xmlns="http://www.w3.org/2000/svg"><style>.svgdevtextmc{fill:#373435;}</style>${contents}</svg>`;
}

function loadDesignSvg(designFilePath: string | undefined): string | null {
  const resolved = (designFilePath ?? "").trim();
  if (!resolved) {
    return null;
  }
  if (!fs.existsSync(resolved)) {
    return null;
  }
  try {
    return fs.readFileSync(resolved, "utf-8");
  } catch {
    return null;
  }
}

function extractViewBoxSize(svgText: string): { width: number; height: number } {
  const match = svgText.match(/view[Bb]ox\s*=\s*["']([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)["']/);
  if (!match) {
    return { width: SVG_WIDTH, height: SVG_HEIGHT };
  }

  const width = Number.parseFloat(match[3] ?? "");
  const height = Number.parseFloat(match[4] ?? "");
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    return { width: SVG_WIDTH, height: SVG_HEIGHT };
  }

  return { width, height };
}

function drawOnDesignSvg(designSvg: string, inscriptions: string): string {
  const viewport = extractViewBoxSize(designSvg);
  const prodRect = `<rect x="0" y="0" width="${viewport.width}" height="${viewport.height}" fill="none"/>`;
  return designSvg.replace("</svg>", `${inscriptions}${prodRect}</svg>`);
}

const fallbackDrawApp: DrawApp = {
  drawTextOnSideA(data: DrawTextInput): string {
    return drawSvg(drawInscriptions(normalizeItems(data)));
  },
  drawTextOnSideB(data: DrawTextInput, cardNum: string, cardTime: string): string {
    return drawSvg(drawInscriptions(normalizeItems(data)) + drawCardData(cardNum, cardTime));
  },
  drawFullInscr(text: string, fontName: string): string {
    const safeText = String(text ?? "").trim();
    if (!safeText) {
      return "";
    }
    const safeFont = normalizeFontName(fontName ?? "Gilroy");
    return `<svg viewBox="0 0 600 120" xmlns="http://www.w3.org/2000/svg"><style>.svgdevtextmc{fill:#373435;}</style><text class="svgdevtextmc" x="0" y="20" style="font-family:'${escapeXml(safeFont)}';font-size:20px;dominant-baseline:hanging">${escapeXml(safeText)}</text></svg>`;
  },
  drawOnSideANew(data: DrawTextInput, designFilePath?: string): string {
    const inscriptions = drawInscriptions(normalizeItems(data));
    const designSvg = loadDesignSvg(designFilePath);
    if (designSvg) {
      return drawOnDesignSvg(designSvg, inscriptions);
    }
    return drawSvg(inscriptions);
  },
  drawOnSideBNew(data: DrawTextInput, cardNum: string, cardTime: string): string {
    return drawSvg(
      `${drawInscriptions(normalizeItems(data))}${drawCardData(cardNum, cardTime)}<rect x="0" y="0" width="${SVG_WIDTH}" height="${SVG_HEIGHT}" fill="none"/>`,
    );
  },
};

let cachedDrawApp: DrawApp | null = null;
let attemptedLegacyLoad = false;

function resolveLegacyDrawModulePath(): string | null {
  const modulePath = path.resolve(process.cwd(), "lib/legacy-svg/app2.js");
  return fs.existsSync(modulePath) ? modulePath : null;
}

async function loadLegacyDrawApp(): Promise<DrawApp | null> {
  const modulePath = resolveLegacyDrawModulePath();
  if (!modulePath) {
    return null;
  }

  try {
    const loaded = await import(pathToFileURL(modulePath).href);
    const legacyModule = ((loaded as { default?: unknown }).default ?? loaded) as Partial<DrawApp>;

    if (typeof legacyModule.drawTextOnSideA !== "function" || typeof legacyModule.drawTextOnSideB !== "function") {
      return null;
    }

    return {
      drawTextOnSideA: legacyModule.drawTextOnSideA.bind(legacyModule),
      drawTextOnSideB: legacyModule.drawTextOnSideB.bind(legacyModule),
      drawFullInscr:
        typeof legacyModule.drawFullInscr === "function"
          ? legacyModule.drawFullInscr.bind(legacyModule)
          : fallbackDrawApp.drawFullInscr,
      drawOnSideANew:
        typeof legacyModule.drawOnSideANew === "function"
          ? legacyModule.drawOnSideANew.bind(legacyModule)
          : legacyModule.drawTextOnSideA.bind(legacyModule),
      drawOnSideBNew:
        typeof legacyModule.drawOnSideBNew === "function"
          ? legacyModule.drawOnSideBNew.bind(legacyModule)
          : legacyModule.drawTextOnSideB.bind(legacyModule),
    };
  } catch {
    return null;
  }
}

export async function getDrawApp(): Promise<DrawApp> {
  if (cachedDrawApp) {
    return cachedDrawApp;
  }

  if (!attemptedLegacyLoad) {
    attemptedLegacyLoad = true;
    const legacyDrawApp = await loadLegacyDrawApp();
    if (legacyDrawApp) {
      cachedDrawApp = legacyDrawApp;
      return legacyDrawApp;
    }
  }

  cachedDrawApp = fallbackDrawApp;
  return fallbackDrawApp;
}
