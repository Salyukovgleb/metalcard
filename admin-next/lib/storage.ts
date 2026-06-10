import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

type UploadSvgOptions = {
  category: string;
  currentSvg?: string;
};

const SAFE_CATEGORY_RE = /^[a-zA-Z0-9_-]+$/;
const SAFE_FILENAME_RE = /^[a-zA-Z0-9._-]+\.svg$/i;

function normalizeCategory(category: string): string {
  const normalized = category.trim().replaceAll("\\", "/").replace(/^\/+|\/+$/g, "");
  if (!normalized || normalized.includes("/") || !SAFE_CATEGORY_RE.test(normalized)) {
    throw new Error("Укажите категорию папки латиницей, цифрами, дефисом или подчеркиванием");
  }
  return normalized;
}

function sanitizeSvgFilename(fileName: string): string {
  const parsed = path.parse(fileName.trim().replaceAll("\\", "/"));
  const base = parsed.name
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return `${base || crypto.randomUUID()}.svg`;
}

function staticSvgFilename(currentSvg: string | undefined, category: string): string | null {
  const normalized = (currentSvg ?? "").split("#")[0]?.split("?")[0]?.replaceAll("\\", "/").trim() ?? "";
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length < 3 || parts[0] !== "static" || parts[1] !== category) {
    return null;
  }

  const fileName = parts[2] ?? "";
  return SAFE_FILENAME_RE.test(fileName) ? fileName : null;
}

async function resolveOrigsRoot(): Promise<string> {
  const explicit = (process.env.PRINTS_ORIGS_DIR ?? "").trim();
  if (explicit) {
    return path.resolve(explicit);
  }

  const candidates = [
    path.resolve(process.cwd(), "../frontend-next/origs"),
    path.resolve(process.cwd(), "frontend-next/origs"),
    path.resolve(process.cwd(), "origs"),
  ];

  for (const candidate of candidates) {
    try {
      const stat = await fs.stat(candidate);
      if (stat.isDirectory()) {
        return candidate;
      }
    } catch {
      // Keep looking for the shared prints folder.
    }
  }

  return candidates[0];
}

async function uniqueFilename(targetDir: string, preferredName: string): Promise<string> {
  if (!SAFE_FILENAME_RE.test(preferredName)) {
    preferredName = `${crypto.randomUUID()}.svg`;
  }

  const parsed = path.parse(preferredName);
  for (let index = 0; index < 1000; index += 1) {
    const suffix = index === 0 ? "" : `-${index}`;
    const candidate = `${parsed.name}${suffix}.svg`;
    try {
      await fs.access(path.join(targetDir, candidate));
    } catch {
      return candidate;
    }
  }

  return `${parsed.name}-${crypto.randomUUID()}.svg`;
}

export async function uploadSvg(file: File, options: UploadSvgOptions): Promise<string> {
  if (!file.name.toLowerCase().endsWith(".svg")) {
    throw new Error("Требуется SVG файл");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("SVG файл больше 5MB");
  }

  const category = normalizeCategory(options.category);
  const origsRoot = await resolveOrigsRoot();
  const targetDir = path.join(origsRoot, category);
  await fs.mkdir(targetDir, { recursive: true });

  const currentName = staticSvgFilename(options.currentSvg, category);
  const filename = currentName ?? (await uniqueFilename(targetDir, sanitizeSvgFilename(file.name)));
  const targetPath = path.join(targetDir, filename);
  await fs.writeFile(targetPath, Buffer.from(await file.arrayBuffer()));

  return `/static/${category}/${filename}`;
}
