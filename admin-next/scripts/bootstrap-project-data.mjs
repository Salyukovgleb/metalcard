#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import pg from "pg";

const CATEGORIES = [
  "1_patriot",
  "2_crypto",
  "3_money",
  "4_exclusive",
  "5_sport",
  "6_cars",
  "7_card_designs",
  "8_brands",
  "9_cosmos",
  "10_animals",
  "11_horoscope",
  "12_cartoons",
  "13_pattern",
  "14_games",
  "15_movie_music",
  "16_anime",
  "empty",
];

const COLORS = [
  ["black-silver-mat", "Черная карта, серебряная гравировка", 300000, { title_uz: "Qora kumush mat", renderColor: "white" }],
  ["black-gold-mat", "Черная карта, золотая гравировка", 300000, { title_uz: "Qora oltin mat", renderColor: "gold", default: true }],
  ["black-gold-rib", "Черно-золотая ребристая карта", 300000, { title_uz: "Qora va oltin qovurg'ali", renderColor: "gold" }],
  ["gold-mirror", "Золотая зеркальная карта, белая гравировка", 400000, { title_uz: "Oltin oyna", renderColor: "white" }],
  ["gold-mirror-black", "Золотая зеркальная карта, черная гравировка", 400000, { title_uz: "Oltin karta qora o'yma", renderColor: "black" }],
  ["red", "Красная карта", 400000, { title_uz: "Qizil kartochka", renderColor: "white" }],
  ["blue", "Синяя карта", 400000, { title_uz: "Ko'k karta", renderColor: "white" }],
  ["green", "Зеленая карта", 400000, { title_uz: "Yashil xarita", renderColor: "white" }],
];

const FIXED_PRICE_DESIGNS = new Set([2001, 2002, 2003, 2004, 3005, 3006, 3008]);

function parseArgs(argv) {
  const args = { sourceDir: "/app/frontend-next/origs", syncExisting: false, validateOnly: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--sync-existing") args.syncExisting = true;
    else if (arg === "--validate-only") args.validateOnly = true;
    else if (arg === "--source-dir") args.sourceDir = argv[++index] ?? "";
    else if (arg === "--help" || arg === "-h") {
      console.log("Usage: node scripts/bootstrap-project-data.mjs [--source-dir PATH] [--sync-existing] [--validate-only]");
      process.exit(0);
    } else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!args.sourceDir) throw new Error("--source-dir requires a value");
  return args;
}

async function scanDesigns(sourceDir) {
  const designs = [];
  const ids = new Map();

  for (const category of CATEGORIES) {
    const directory = path.join(sourceDir, category);
    let entries;
    try {
      entries = await fs.readdir(directory, { withFileTypes: true });
    } catch (error) {
      throw new Error(`Required designs directory is missing: ${directory}`, { cause: error });
    }

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".svg")) continue;
      const stem = entry.name.slice(0, -4);
      if (!/^\d+$/.test(stem)) throw new Error(`SVG filename must be numeric: ${category}/${entry.name}`);

      const id = Number.parseInt(stem, 10);
      const previous = ids.get(id);
      if (previous) throw new Error(`Duplicate design id ${id}: ${previous} and ${category}/${entry.name}`);

      const fullPath = path.join(directory, entry.name);
      const stat = await fs.stat(fullPath);
      if (stat.size === 0) throw new Error(`Empty SVG file: ${category}/${entry.name}`);

      const svgOrig = `/static/${category}/${entry.name}`;
      ids.set(id, `${category}/${entry.name}`);
      designs.push({
        id,
        title: id === 1 && category === "empty" ? "Без принта" : `Design ${id}`,
        category,
        svgOrig,
        basePrice: FIXED_PRICE_DESIGNS.has(id) ? 400000 : 0,
        sortOrder: id,
      });
    }
  }

  if (designs.length === 0) throw new Error(`No SVG designs found in ${sourceDir}`);
  return designs.sort((a, b) => a.id - b.id);
}

function databaseConfig() {
  const password = process.env.DB_PASSWORD ?? "";
  if (!password) throw new Error("DB_PASSWORD is empty");
  return {
    host: process.env.DB_HOST ?? "db",
    port: Number.parseInt(process.env.DB_PORT ?? "5432", 10),
    database: process.env.DB_NAME ?? "metalcard",
    user: process.env.DB_USER ?? "metalcard",
    password,
    ssl: String(process.env.DB_SSL ?? "false").toLowerCase() === "true" ? { rejectUnauthorized: false } : undefined,
  };
}

async function seed(client, designs, syncExisting) {
  const summary = {
    colorsInserted: 0,
    colorsUpdated: 0,
    colorsPreserved: 0,
    designsInserted: 0,
    designsUpdated: 0,
    designsPreserved: 0,
  };
  await client.query("BEGIN");
  try {
    for (const [code, title, markup, params] of COLORS) {
      const result = syncExisting
        ? await client.query(
            `INSERT INTO colors (code, title, markup, params, active)
             VALUES ($1, $2, $3, $4::jsonb, TRUE)
             ON CONFLICT (code) DO UPDATE SET title=EXCLUDED.title, markup=EXCLUDED.markup,
               params=EXCLUDED.params, active=TRUE RETURNING (xmax = 0) AS inserted`,
            [code, title, markup, JSON.stringify(params)],
          )
        : await client.query(
            `INSERT INTO colors (code, title, markup, params, active)
             VALUES ($1, $2, $3, $4::jsonb, TRUE)
             ON CONFLICT (code) DO NOTHING RETURNING TRUE AS inserted`,
            [code, title, markup, JSON.stringify(params)],
          );
      if (result.rowCount === 0) summary.colorsPreserved += 1;
      else if (result.rows[0]?.inserted) summary.colorsInserted += 1;
      else summary.colorsUpdated += 1;
    }

    for (const design of designs) {
      const existing = await client.query("SELECT svg_orig FROM designs WHERE id=$1", [design.id]);
      if (existing.rowCount > 0 && !syncExisting) {
        summary.designsPreserved += 1;
        continue;
      }

      await client.query(
        `INSERT INTO designs (id, title, category, svg_orig, base_price, sort_order, price_overrides, active)
         VALUES ($1, $2, $3, $4, $5, $6, '{}'::jsonb, TRUE)
         ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, category=EXCLUDED.category,
           svg_orig=EXCLUDED.svg_orig, base_price=EXCLUDED.base_price,
           sort_order=EXCLUDED.sort_order, active=TRUE`,
        [design.id, design.title, design.category, design.svgOrig, design.basePrice, design.sortOrder],
      );
      if (existing.rowCount > 0) summary.designsUpdated += 1;
      else summary.designsInserted += 1;
    }

    await client.query(
      `SELECT setval(pg_get_serial_sequence('designs', 'id'),
        GREATEST((SELECT COALESCE(MAX(id), 1) FROM designs), 1), TRUE)`,
    );
    await client.query("COMMIT");
    return summary;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sourceDir = path.resolve(args.sourceDir);
  const designs = await scanDesigns(sourceDir);
  console.log(`[bootstrap] validated ${designs.length} SVG files in ${CATEGORIES.length} directories`);
  console.log(`[bootstrap] fixed-price designs found: ${designs.filter((item) => item.basePrice > 0).length}`);
  if (args.validateOnly) return;

  const client = new pg.Client(databaseConfig());
  await client.connect();
  try {
    const summary = await seed(client, designs, args.syncExisting);
    const counts = await client.query(
      `SELECT (SELECT count(*)::int FROM designs) AS designs,
              (SELECT count(*)::int FROM colors WHERE active IS TRUE) AS active_colors`,
    );
    console.log(`[bootstrap] result ${JSON.stringify(summary)}`);
    console.log(`[bootstrap] database designs=${counts.rows[0].designs} active_colors=${counts.rows[0].active_colors}`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`[bootstrap] ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
