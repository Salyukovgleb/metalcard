import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import type { QueryResultRow } from "pg";
import { query } from "@/lib/db";
import { getDrawApp } from "@/lib/draw-app";

type SvgRouteResult = {
  status: number;
  body: string;
  contentType?: string;
};

type DbOrderManageRow = QueryResultRow & {
  manage_key: string | null;
};

type DbOrderItemRow = QueryResultRow & {
  design_id: number | null;
  texts: unknown;
  svg_orig: string | null;
  category: string | null;
};

type FormattedTextLine = {
  text: string;
  fontName: string;
  pos: {
    top: number;
    left: number;
    width: number;
  };
  size?: number;
};

const FONT_NAME_TO_NODE_KEY: Record<string, string> = {
  Gilroy: "gilroy",
  "Alex Brush": "alex-brush",
  Arabella: "arabella",
  Bodoni: "bodoni",
  Card: "num",
  Candlescript: "candlescript",
  Castileo: "castileo",
  Lombardia: "lombardia",
  "Monotype Corsiva": "monotype-corsiva",
  Porcelain: "porcelain",
  Postmaster: "postmaster",
  "Racing Catalogue": "racing-catalogue",
  Resphekt: "resphekt",
};

const NODE_FONT_KEYS = new Set<string>([
  "gilroy",
  "alex-brush",
  "arabella",
  "bodoni",
  "num",
  "candlescript",
  "castileo",
  "lombardia",
  "monotype-corsiva",
  "porcelain",
  "postmaster",
  "racing-catalogue",
  "resphekt",
]);

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return fallback;
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

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function asNumber(value: unknown, fallback: number): number {
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

function finiteNumberOrNull(value: unknown): number | null {
  const num = asNumber(value, Number.NaN);
  return Number.isFinite(num) ? num : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function mapFontNameForNode(value: unknown): string {
  const raw = asString(value, "").trim();
  if (!raw) {
    return "alex-brush";
  }

  const fromMap = FONT_NAME_TO_NODE_KEY[raw];
  if (fromMap) {
    return fromMap;
  }

  const lower = raw.toLowerCase();
  if (NODE_FONT_KEYS.has(lower)) {
    return lower;
  }

  const dashed = lower.replace(/\s+/g, "-");
  if (NODE_FONT_KEYS.has(dashed)) {
    return dashed;
  }

  return "alex-brush";
}

function normalizePos(
  line: Record<string, unknown>,
  options: { fallbackWidth: number; widthWhenZero?: number },
): FormattedTextLine["pos"] {
  const embeddedPos = asObject(line.pos);
  const rawTop = embeddedPos.top ?? line.top;
  const rawLeft = embeddedPos.left ?? line.left;
  const rawWidth = embeddedPos.width ?? line.width;

  let width = asNumber(rawWidth, options.fallbackWidth);
  if (options.widthWhenZero !== undefined && width === 0) {
    width = options.widthWhenZero;
  }

  return {
    top: clamp(asNumber(rawTop, 0), 0, 100),
    left: clamp(asNumber(rawLeft, 0), 0, 100),
    width: clamp(width, 0, 100),
  };
}

function sideALines(value: unknown): FormattedTextLine[] {
  return asArray(value).map((rawLine) => {
    const line = asObject(rawLine);
    const result: FormattedTextLine = {
      text: asString(line.text, ""),
      fontName: mapFontNameForNode(line.font ?? line.fontName),
      pos: normalizePos(line, { fallbackWidth: 100 }),
    };

    const size = finiteNumberOrNull(line.size ?? line.fontSize);
    if (size !== null) {
      result.size = size;
    }

    return result;
  });
}

function sideBLines(value: unknown): FormattedTextLine[] {
  return asArray(value)
    .map((rawLine) => {
      const line = asObject(rawLine);
      const text = asString(line.text, "").trim();
      if (!text) {
        return null;
      }

      const result: FormattedTextLine = {
        text,
        fontName: mapFontNameForNode(line.font ?? line.fontName),
        pos: normalizePos(line, { fallbackWidth: 100, widthWhenZero: 100 }),
      };

      const size = finiteNumberOrNull(line.size ?? line.fontSize);
      if (size !== null) {
        result.size = size;
      }

      return result;
    })
    .filter((line): line is FormattedTextLine => line !== null);
}

async function hasManageKeyAccess(orderId: number, token: string): Promise<boolean> {
  const result = await query<DbOrderManageRow>(
    `
      SELECT manage_key
      FROM orders
      WHERE id = $1
      LIMIT 1
    `,
    [orderId],
  );
  const manageKey = asString(result.rows[0]?.manage_key, "");
  return Boolean(manageKey) && manageKey === token;
}

async function loadFirstOrderItem(orderId: number): Promise<DbOrderItemRow | null> {
  const result = await query<DbOrderItemRow>(
    `
      SELECT
        oi.design_id,
        oi.texts,
        d.svg_orig,
        d.category
      FROM order_items oi
      LEFT JOIN designs d ON d.id = oi.design_id
      WHERE oi.order_id = $1
      ORDER BY oi.id ASC
      LIMIT 1
    `,
    [orderId],
  );

  return result.rows[0] ?? null;
}

function pickDesignFilename(svgOrig: string, designId: number | null): string | null {
  const normalized = svgOrig.replaceAll("\\", "/").trim();
  if (normalized) {
    const base = path.basename(normalized);
    if (base.toLowerCase().endsWith(".svg")) {
      return base;
    }
  }

  if (typeof designId === "number" && Number.isFinite(designId) && designId > 0) {
    return `${designId}.svg`;
  }

  return null;
}

function resolveDesignPath(item: DbOrderItemRow): string | null {
  const svgOrig = asString(item.svg_orig, "").trim();
  const category = asString(item.category, "").trim();
  const cwd = process.cwd();
  const candidates: string[] = [];

  if (category) {
    const filename = pickDesignFilename(svgOrig, item.design_id);
    if (filename) {
      candidates.push(path.resolve(cwd, "origs", category, filename));
    }
  }

  if (svgOrig) {
    const normalized = svgOrig.replaceAll("\\", "/").replace(/^\/+/, "");
    const fromStatic = normalized.startsWith("static/") ? normalized.slice("static/".length) : normalized;
    if (fromStatic) {
      candidates.push(path.resolve(cwd, "origs", fromStatic));
      candidates.push(path.resolve(cwd, fromStatic));
    }
  }

  const uniqueCandidates = [...new Set(candidates)];
  if (uniqueCandidates.length === 0) {
    return null;
  }

  for (const candidate of uniqueCandidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return uniqueCandidates[0] ?? null;
}

function isHttpUrl(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://");
}

async function resolveDesignPathForRender(item: DbOrderItemRow): Promise<string | null> {
  const localPath = resolveDesignPath(item);
  if (localPath && fs.existsSync(localPath)) {
    return localPath;
  }

  const svgOrig = asString(item.svg_orig, "").trim();
  if (!svgOrig || !isHttpUrl(svgOrig)) {
    return localPath;
  }

  try {
    const hash = crypto.createHash("sha1").update(svgOrig).digest("hex");
    const cacheDir = path.resolve(process.cwd(), ".data", "svg-cache");
    const cachedFile = path.join(cacheDir, `${hash}.svg`);

    if (fs.existsSync(cachedFile)) {
      return cachedFile;
    }

    const response = await fetch(svgOrig, { cache: "no-store" });
    if (!response.ok) {
      return localPath;
    }

    const rawSvg = await response.text();
    if (!rawSvg.toLowerCase().includes("<svg")) {
      return localPath;
    }

    fs.mkdirSync(cacheDir, { recursive: true });
    fs.writeFileSync(cachedFile, rawSvg, "utf-8");
    return cachedFile;
  } catch {
    return localPath;
  }
}

function invalidTokenResult(): SvgRouteResult {
  return { status: 403, body: "Forbidden" };
}

function generationErrorResult(): SvgRouteResult {
  return { status: 500, body: "SVG generation failed" };
}

export async function renderOrderSideASvg(orderId: number, token: string): Promise<SvgRouteResult> {
  if (!Number.isFinite(orderId) || orderId <= 0 || !token) {
    return invalidTokenResult();
  }

  if (!(await hasManageKeyAccess(orderId, token))) {
    return invalidTokenResult();
  }

  const item = await loadFirstOrderItem(orderId);
  if (!item) {
    return { status: 404, body: "Order not found" };
  }

  const svgOrig = asString(item.svg_orig, "").trim();
  if (!svgOrig) {
    return { status: 404, body: "Design not found" };
  }

  const designPath = await resolveDesignPathForRender(item);
  if (!designPath || !fs.existsSync(designPath)) {
    return generationErrorResult();
  }

  const texts = asObject(item.texts);
  const formattedLines = sideALines(texts.A);

  try {
    const drawApp = await getDrawApp();
    const svg =
      typeof drawApp.drawOnSideANew === "function"
        ? drawApp.drawOnSideANew(formattedLines, designPath)
        : drawApp.drawTextOnSideA(formattedLines);

    if (!svg) {
      return generationErrorResult();
    }

    return {
      status: 200,
      body: svg,
      contentType: "image/svg+xml; charset=utf-8",
    };
  } catch {
    return generationErrorResult();
  }
}

export async function renderOrderSideBSvg(orderId: number, token: string): Promise<SvgRouteResult> {
  if (!Number.isFinite(orderId) || orderId <= 0 || !token) {
    return invalidTokenResult();
  }

  if (!(await hasManageKeyAccess(orderId, token))) {
    return invalidTokenResult();
  }

  const item = await loadFirstOrderItem(orderId);
  if (!item) {
    return { status: 404, body: "Order not found" };
  }

  const texts = asObject(item.texts);
  const card = asObject(texts.card);
  const formattedLines = sideBLines(texts.B);
  const cardNum = asString(card.num, "").trim();
  const cardTime = asString(card.time, "").trim();

  try {
    const drawApp = await getDrawApp();
    const svg =
      typeof drawApp.drawOnSideBNew === "function"
        ? drawApp.drawOnSideBNew(formattedLines, cardNum, cardTime)
        : drawApp.drawTextOnSideB(formattedLines, cardNum, cardTime);

    if (!svg) {
      return generationErrorResult();
    }

    return {
      status: 200,
      body: svg,
      contentType: "image/svg+xml; charset=utf-8",
    };
  } catch {
    return generationErrorResult();
  }
}
