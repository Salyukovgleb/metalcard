import type { QueryResultRow } from "pg";
import { cardColors, getCardColorCSS, type CardColor } from "@/lib/card-colors";
import { query } from "@/lib/db";

type DbColorRow = QueryResultRow & {
  id: number;
  code: string;
  title: string;
  markup: string | number | null;
  params: unknown;
};

type RuntimeCardColorsConfig = {
  activeColors: CardColor[];
  renderColorByCode: Record<string, string>;
  priceByCode: Record<string, number>;
  defaultColorName: string;
  css: string;
};

const FALLBACK_ACTIVE_COLORS = cardColors.filter((color) => color.active);
const STYLE_BY_CODE = new Map(cardColors.map((color) => [color.name, color]));
const CACHE_TTL_MS = 30_000;
let cachedConfig: { expiresAt: number; value: RuntimeCardColorsConfig } | null = null;

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

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") {
    return value.trim();
  }
  return fallback;
}

function asBool(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      return fallback;
    }
    return ["1", "true", "yes", "on", "t"].includes(normalized);
  }
  return fallback;
}

function asObject(value: unknown): Record<string, unknown> {
  if (!value) {
    return {};
  }
  if (typeof value === "object" && !Array.isArray(value)) {
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

function renderColorFromParams(params: Record<string, unknown>, fallback: string): string {
  const explicit = asString(params.renderColor ?? params.render_color ?? params.render, "");
  if (explicit) {
    return explicit;
  }
  return fallback;
}

function normalizeDefaults(colors: CardColor[]): CardColor[] {
  if (colors.length === 0) {
    return colors;
  }

  const explicitIndex = colors.findIndex((color) => color.default);
  const defaultIndex = explicitIndex >= 0 ? explicitIndex : 0;

  return colors.map((color, index) => ({
    ...color,
    default: index === defaultIndex,
  }));
}

function buildColorCss(colors: CardColor[]): string {
  const safeColors = colors.length > 0 ? colors : FALLBACK_ACTIVE_COLORS;
  const colorsCss = safeColors.map((color) => getCardColorCSS(color)).join("\n");
  const width = (safeColors.length * 50) / 1920 * 100;
  const mobileHeight = (safeColors.length * 26.25) / 450 * 100;

  return `${colorsCss}
.visual__color-container-inner {width: ${width}vw}
@media (max-width: 768px) {
  .visual__color-container-inner {width: ${(250 / 450) * 100}vw;}
  #color-state:checked ~ .visual__color-container-inner {height: ${mobileHeight}vw}
}`;
}

function buildConfig(colors: CardColor[]): RuntimeCardColorsConfig {
  const normalized = normalizeDefaults(colors.length > 0 ? colors : FALLBACK_ACTIVE_COLORS);
  const defaultColorName = normalized.find((color) => color.default)?.name ?? normalized[0]?.name ?? "black-silver-mat";

  return {
    activeColors: normalized,
    renderColorByCode: Object.fromEntries(normalized.map((color) => [color.name, color.renderColor])),
    priceByCode: Object.fromEntries(normalized.map((color) => [color.name, color.price])),
    defaultColorName,
    css: buildColorCss(normalized),
  };
}

async function loadFromDb(): Promise<RuntimeCardColorsConfig> {
  const result = await query<DbColorRow>(
    `
      SELECT id, code, title, markup, params
      FROM colors
      WHERE active IS TRUE
      ORDER BY id
    `,
  );

  const resolved: CardColor[] = [];
  for (const row of result.rows) {
    const code = asString(row.code, "");
    if (!code) {
      continue;
    }
    const base = STYLE_BY_CODE.get(code);
    if (!base) {
      continue;
    }

    const params = asObject(row.params);
    const textRu = asString(params.title_ru ?? params.titleRu ?? row.title, base.textRu || row.title);
    const textUz = asString(params.title_uz ?? params.titleUz ?? row.title, base.textUz || row.title);

    resolved.push({
      ...base,
      name: code,
      textRu,
      textUz,
      labelBack: asString(params.label ?? params.labelBack ?? params.label_back, base.labelBack),
      cardBack: asString(params.cardBack ?? params.card_back, base.cardBack),
      textColor: asString(params.textColor ?? params.text_color, base.textColor),
      fillColor: asString(params.fillColor ?? params.fill_color ?? params.fill, base.fillColor),
      logoImg: asString(params.logoImg ?? params.logo_img, base.logoImg),
      renderColor: renderColorFromParams(params, base.renderColor),
      active: true,
      default: asBool(params.default, false),
      price: Math.round(asNumber(row.markup, base.price)),
    });
  }

  return buildConfig(resolved);
}

export async function getRuntimeCardColorsConfig(forceRefresh = false): Promise<RuntimeCardColorsConfig> {
  const now = Date.now();
  if (!forceRefresh && cachedConfig && cachedConfig.expiresAt > now) {
    return cachedConfig.value;
  }

  try {
    const config = await loadFromDb();
    cachedConfig = { value: config, expiresAt: now + CACHE_TTL_MS };
    return config;
  } catch {
    const fallback = buildConfig([]);
    cachedConfig = { value: fallback, expiresAt: now + CACHE_TTL_MS };
    return fallback;
  }
}
