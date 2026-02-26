#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const REQUIRED_COLOR_CODES = [
  "black-silver-mat",
  "black-gold-rib",
  "gold-mirror",
  "gold-mirror-black",
  "red",
  "blue",
];

function printHelp() {
  console.log(`
Usage:
  node scripts/sync-prints-colors.mjs \\
    --source-dir <path-to-origs> \\
    --designs-csv <path-to-designs.csv> \\
    --colors-csv <path-to-colors.csv> \\
    [--env-file <path-to-.env>] \\
    [--dry-run]

What it does:
  1) Uploads SVG prints to S3
  2) Upserts designs into DB table "designs"
  3) Syncs colors from CSV, but keeps ONLY codes:
     ${REQUIRED_COLOR_CODES.join(", ")}
  4) Deactivates all other colors in DB
`);
}

function parseArgs(argv) {
  const out = {
    sourceDir: "",
    designsCsv: "",
    colorsCsv: "",
    envFile: ".env",
    dryRun: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--help" || arg === "-h") {
      out.help = true;
      continue;
    }

    if (arg === "--dry-run") {
      out.dryRun = true;
      continue;
    }

    const next = argv[i + 1];
    if (!next) {
      throw new Error(`Missing value for ${arg}`);
    }

    if (arg === "--source-dir") {
      out.sourceDir = next;
      i += 1;
      continue;
    }

    if (arg === "--designs-csv") {
      out.designsCsv = next;
      i += 1;
      continue;
    }

    if (arg === "--colors-csv") {
      out.colorsCsv = next;
      i += 1;
      continue;
    }

    if (arg === "--env-file") {
      out.envFile = next;
      i += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return out;
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function parseEnvFile(content) {
  const out = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const eq = line.indexOf("=");
    if (eq <= 0) {
      continue;
    }

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    out[key] = value;
  }

  return out;
}

async function loadEnvFileIfExists(envFilePath) {
  const absPath = path.resolve(envFilePath);
  if (!(await fileExists(absPath))) {
    return;
  }

  const raw = await fs.readFile(absPath, "utf8");
  const env = parseEnvFile(raw);
  for (const [key, value] of Object.entries(env)) {
    if (typeof process.env[key] === "undefined") {
      process.env[key] = value;
    }
  }
}

function parseCsv(text) {
  const clean = text.replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < clean.length; i += 1) {
    const ch = clean[i];

    if (ch === '"') {
      if (inQuotes && clean[i + 1] === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && clean[i + 1] === "\n") {
        i += 1;
      }

      row.push(field);
      field = "";

      const nonEmpty = row.some((v) => String(v).trim() !== "");
      if (nonEmpty) {
        rows.push(row);
      }

      row = [];
      continue;
    }

    field += ch;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    const nonEmpty = row.some((v) => String(v).trim() !== "");
    if (nonEmpty) {
      rows.push(row);
    }
  }

  if (rows.length === 0) {
    return [];
  }

  const header = rows[0].map((h) => String(h).trim());
  return rows.slice(1).map((cols) => {
    const obj = {};
    for (let i = 0; i < header.length; i += 1) {
      obj[header[i]] = (cols[i] ?? "").trim();
    }
    return obj;
  });
}

function asBool(value, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value !== "string") {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }
  return ["1", "true", "yes", "on", "t"].includes(normalized);
}

function asNumber(value, fallback = 0) {
  const parsed = Number.parseFloat(String(value ?? "").replace(/,/g, "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asIntOrNull(value) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return null;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseJsonObject(value, fallback = {}) {
  if (typeof value !== "string" || !value.trim()) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

function normalizeBaseUrl(value) {
  return value.replace(/\/+$/, "");
}

function s3Bucket() {
  return (
    process.env.S3_BUCKET ?? process.env.AWS_STORAGE_BUCKET_NAME ?? process.env.AWS_BUCKET_NAME ?? ""
  ).trim();
}

function s3Endpoint() {
  return (
    process.env.S3_ENDPOINT_URL ?? process.env.AWS_S3_ENDPOINT_URL ?? process.env.AWS_ENDPOINT_URL ?? ""
  ).trim();
}

function s3Region() {
  return (process.env.S3_REGION ?? process.env.AWS_S3_REGION_NAME ?? "us-east-1").trim();
}

function s3AccessKey() {
  return (process.env.S3_ACCESS_KEY ?? process.env.AWS_ACCESS_KEY_ID ?? "").trim();
}

function s3SecretKey() {
  return (process.env.S3_SECRET_KEY ?? process.env.AWS_SECRET_ACCESS_KEY ?? "").trim();
}

function s3ForcePathStyle() {
  const explicit = process.env.S3_FORCE_PATH_STYLE;
  if (typeof explicit === "string") {
    return asBool(explicit, true);
  }
  return true;
}

function s3Prefix() {
  return (process.env.S3_PREFIX ?? process.env.AWS_LOCATION ?? "media").replace(/^\/+|\/+$/g, "");
}

function buildS3PublicUrl(key) {
  const explicitPublicBase = (process.env.S3_PUBLIC_BASE_URL ?? process.env.MEDIA_CDN_URL ?? "").trim();
  if (explicitPublicBase) {
    return `${normalizeBaseUrl(explicitPublicBase)}/${key}`;
  }

  const endpoint = normalizeBaseUrl(s3Endpoint());
  const bucket = s3Bucket();
  if (!endpoint || !bucket) {
    return key;
  }

  if (s3ForcePathStyle()) {
    return `${endpoint}/${bucket}/${key}`;
  }

  const withoutScheme = endpoint.replace(/^https?:\/\//, "");
  return `https://${bucket}.${withoutScheme}/${key}`;
}

async function createS3Client() {
  const { PutObjectCommand, S3Client } = await import("@aws-sdk/client-s3");
  const endpoint = s3Endpoint();
  const accessKeyId = s3AccessKey();
  const secretAccessKey = s3SecretKey();

  if (!endpoint || !accessKeyId || !secretAccessKey || !s3Bucket()) {
    throw new Error("S3 env is incomplete. Check S3_ENDPOINT_URL, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY");
  }

  return {
    PutObjectCommand,
    client: new S3Client({
      endpoint,
      region: s3Region(),
      forcePathStyle: s3ForcePathStyle(),
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    }),
  };
}

async function createPool() {
  const pg = await import("pg");
  const Pool = pg.Pool ?? pg.default?.Pool;
  if (!Pool) {
    throw new Error("pg package is not available");
  }

  const host = (process.env.DB_HOST ?? "localhost").trim();
  const port = Number.parseInt(process.env.DB_PORT ?? "5432", 10);
  const database = (process.env.DB_NAME ?? "metalcard").trim();
  const user = (process.env.DB_USER ?? "metalcard").trim();
  const password = process.env.DB_PASSWORD ?? "";
  const useSsl = asBool(process.env.DB_SSL, false);

  if (!password) {
    throw new Error("DB_PASSWORD is empty");
  }

  return new Pool({
    host,
    port: Number.isFinite(port) ? port : 5432,
    database,
    user,
    password,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    max: 8,
  });
}

function normalizeRelPathForS3(relPath) {
  return relPath
    .replaceAll("\\", "/")
    .split("/")
    .filter((part) => part && part !== "." && part !== "..")
    .join("/");
}

async function mapCsvSvgToLocalFile(sourceDir, row) {
  const rawSvg = String(row.svg_orig ?? "").trim();
  if (!rawSvg) {
    throw new Error(`Design id=${row.id}: empty svg_orig`);
  }

  const noQuery = rawSvg.split("?")[0].split("#")[0];
  const normalized = noQuery.replaceAll("\\", "/");

  const tries = [];

  const stripStatic = normalized
    .replace(/^https?:\/\/[^/]+/i, "")
    .replace(/^\/+/, "")
    .replace(/^static\//, "");

  if (stripStatic) {
    tries.push(stripStatic);
  }

  const baseName = path.basename(stripStatic || normalized);
  const category = String(row.category ?? "").trim();
  if (category && baseName) {
    tries.push(`${category}/${baseName}`);
  }
  if (baseName) {
    tries.push(baseName);
  }

  const unique = [...new Set(tries.map((v) => normalizeRelPathForS3(v)).filter(Boolean))];

  for (const rel of unique) {
    const abs = path.resolve(sourceDir, rel);
    if (await fileExists(abs)) {
      return { absPath: abs, relPath: rel };
    }
  }

  throw new Error(`Design id=${row.id}: SVG not found for ${rawSvg}`);
}

async function uploadSvgFileToS3(s3, absPath, relPath) {
  const body = await fs.readFile(absPath);
  const key = `${s3Prefix()}/designs/${normalizeRelPathForS3(relPath)}`;

  await s3.client.send(
    new s3.PutObjectCommand({
      Bucket: s3Bucket(),
      Key: key,
      Body: body,
      ContentType: "image/svg+xml",
    }),
  );

  return buildS3PublicUrl(key);
}

function validateRequiredColors(colors) {
  const found = new Set(colors.map((c) => c.code));
  const missing = REQUIRED_COLOR_CODES.filter((code) => !found.has(code));
  if (missing.length > 0) {
    throw new Error(`Missing required colors in CSV: ${missing.join(", ")}`);
  }
}

async function syncColors(client, colors) {
  const requiredSet = new Set(REQUIRED_COLOR_CODES);
  const filtered = colors.filter((row) => requiredSet.has(row.code));

  validateRequiredColors(filtered);

  let inserted = 0;
  let updated = 0;

  for (const color of filtered) {
    const paramsJson = JSON.stringify(color.params ?? {});
    const update = await client.query(
      `
        UPDATE colors
        SET title = $2,
            markup = $3,
            params = $4::jsonb,
            active = $5
        WHERE code = $1
      `,
      [color.code, color.title, color.markup, paramsJson, Boolean(color.active)],
    );

    if (update.rowCount > 0) {
      updated += update.rowCount;
      continue;
    }

    await client.query(
      `
        INSERT INTO colors (code, title, markup, params, active)
        VALUES ($1, $2, $3, $4::jsonb, $5)
      `,
      [color.code, color.title, color.markup, paramsJson, Boolean(color.active)],
    );
    inserted += 1;
  }

  const deactivate = await client.query(
    `
      UPDATE colors
      SET active = FALSE
      WHERE code <> ALL($1::text[])
    `,
    [REQUIRED_COLOR_CODES],
  );

  return {
    inserted,
    updated,
    deactivated: deactivate.rowCount,
  };
}

async function upsertDesign(client, row) {
  const update = await client.query(
    `
      UPDATE designs
      SET title = $2,
          category = $3,
          svg_orig = $4,
          preview_webp = $5,
          base_price = $6,
          active = $7,
          price_overrides = $8::jsonb,
          sort_order = $9
      WHERE id = $1
    `,
    [
      row.id,
      row.title,
      row.category || null,
      row.svgOrig,
      row.previewWebp || null,
      row.basePrice,
      row.active,
      JSON.stringify(row.priceOverrides),
      row.sortOrder,
    ],
  );

  if (update.rowCount > 0) {
    return "updated";
  }

  await client.query(
    `
      INSERT INTO designs (
        id,
        title,
        category,
        svg_orig,
        preview_webp,
        base_price,
        active,
        price_overrides,
        sort_order
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9)
    `,
    [
      row.id,
      row.title,
      row.category || null,
      row.svgOrig,
      row.previewWebp || null,
      row.basePrice,
      row.active,
      JSON.stringify(row.priceOverrides),
      row.sortOrder,
    ],
  );

  return "inserted";
}

async function ensureDesignIdSequence(client) {
  await client.query(`
    SELECT setval(
      pg_get_serial_sequence('designs', 'id'),
      GREATEST((SELECT COALESCE(MAX(id), 1) FROM designs), 1),
      true
    )
  `);
}

function parseDesignRows(rows) {
  return rows
    .map((row) => {
      const id = asIntOrNull(row.id);
      if (!id || id <= 0) {
        return null;
      }

      return {
        id,
        title: String(row.title ?? "").trim() || `Design ${id}`,
        category: String(row.category ?? "").trim(),
        svgOrigRaw: String(row.svg_orig ?? "").trim(),
        previewWebp: String(row.preview_webp ?? "").trim(),
        basePrice: asNumber(row.base_price, 0),
        active: asBool(row.active, true),
        priceOverrides: parseJsonObject(row.price_overrides, {}),
        sortOrder: asIntOrNull(row.sort_order),
      };
    })
    .filter((row) => row !== null);
}

function parseColorRows(rows) {
  return rows
    .map((row) => ({
      code: String(row.code ?? "").trim(),
      title: String(row.title ?? "").trim(),
      markup: asNumber(row.markup, 0),
      params: parseJsonObject(row.params, {}),
      active: asBool(row.active, true),
    }))
    .filter((row) => row.code && row.title);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  if (!args.sourceDir || !args.designsCsv || !args.colorsCsv) {
    printHelp();
    throw new Error("Missing required arguments");
  }

  await loadEnvFileIfExists(args.envFile);

  const sourceDir = path.resolve(args.sourceDir);
  const designsCsvPath = path.resolve(args.designsCsv);
  const colorsCsvPath = path.resolve(args.colorsCsv);

  if (!(await fileExists(sourceDir))) {
    throw new Error(`Source dir does not exist: ${sourceDir}`);
  }
  if (!(await fileExists(designsCsvPath))) {
    throw new Error(`Designs CSV does not exist: ${designsCsvPath}`);
  }
  if (!(await fileExists(colorsCsvPath))) {
    throw new Error(`Colors CSV does not exist: ${colorsCsvPath}`);
  }

  const designsCsvRaw = await fs.readFile(designsCsvPath, "utf8");
  const colorsCsvRaw = await fs.readFile(colorsCsvPath, "utf8");

  const designs = parseDesignRows(parseCsv(designsCsvRaw));
  const colors = parseColorRows(parseCsv(colorsCsvRaw));

  if (designs.length === 0) {
    throw new Error("Designs CSV is empty after parsing");
  }

  validateRequiredColors(colors.filter((c) => REQUIRED_COLOR_CODES.includes(c.code)));

  console.log(`[sync] designs rows: ${designs.length}`);
  console.log(`[sync] colors rows: ${colors.length}`);
  console.log(`[sync] mode: ${args.dryRun ? "DRY RUN" : "APPLY"}`);

  // Validate all files first.
  const resolvedDesigns = [];
  for (const row of designs) {
    const fileRef = await mapCsvSvgToLocalFile(sourceDir, {
      id: row.id,
      category: row.category,
      svg_orig: row.svgOrigRaw,
    });
    resolvedDesigns.push({ row, fileRef });
  }

  console.log(`[sync] local svg files resolved: ${resolvedDesigns.length}`);

  if (args.dryRun) {
    const sample = resolvedDesigns.slice(0, 5).map((x) => `${x.row.id} -> ${x.fileRef.relPath}`);
    console.log("[sync] sample mappings:");
    for (const line of sample) {
      console.log(`  ${line}`);
    }
    return;
  }

  const s3Client = await createS3Client();
  const pool = await createPool();
  const dbClient = await pool.connect();

  let uploaded = 0;
  let insertedDesigns = 0;
  let updatedDesigns = 0;

  try {
    await dbClient.query("BEGIN");

    for (let i = 0; i < resolvedDesigns.length; i += 1) {
      const { row, fileRef } = resolvedDesigns[i];
      const s3Url = await uploadSvgFileToS3(s3Client, fileRef.absPath, fileRef.relPath);

      const result = await upsertDesign(dbClient, {
        ...row,
        svgOrig: s3Url,
      });

      if (result === "inserted") {
        insertedDesigns += 1;
      } else {
        updatedDesigns += 1;
      }

      uploaded += 1;

      if ((i + 1) % 25 === 0 || i + 1 === resolvedDesigns.length) {
        console.log(`[sync] designs processed: ${i + 1}/${resolvedDesigns.length}`);
      }
    }

    const colorStats = await syncColors(dbClient, colors);
    await ensureDesignIdSequence(dbClient);

    await dbClient.query("COMMIT");

    console.log("[sync] done");
    console.log(`[sync] designs uploaded: ${uploaded}`);
    console.log(`[sync] designs inserted: ${insertedDesigns}`);
    console.log(`[sync] designs updated: ${updatedDesigns}`);
    console.log(`[sync] colors inserted: ${colorStats.inserted}`);
    console.log(`[sync] colors updated: ${colorStats.updated}`);
    console.log(`[sync] colors deactivated: ${colorStats.deactivated}`);
  } catch (error) {
    await dbClient.query("ROLLBACK");
    throw error;
  } finally {
    dbClient.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(`[sync] failed: ${error?.message ?? error}`);
  process.exitCode = 1;
});
