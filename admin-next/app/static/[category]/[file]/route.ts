import fs from "node:fs/promises";
import path from "node:path";

type Params = {
  params: Promise<{
    category: string;
    file: string;
  }>;
};

const SAFE_CATEGORY_RE = /^[a-zA-Z0-9_-]+$/;
const SAFE_FILE_RE = /^[a-zA-Z0-9._-]+\.svg$/i;

async function origsRoot(): Promise<string> {
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
      // Try the next known layout.
    }
  }

  return candidates[0];
}

function notFound(): Response {
  return new Response("Not found", { status: 404 });
}

export async function GET(_request: Request, { params }: Params) {
  const { category: rawCategory, file: rawFile } = await params;
  const category = decodeURIComponent(rawCategory).trim();
  const file = decodeURIComponent(rawFile).trim();

  if (!SAFE_CATEGORY_RE.test(category) || !SAFE_FILE_RE.test(file)) {
    return notFound();
  }

  const root = await origsRoot();
  const fullPath = path.resolve(root, category, file);
  if (!fullPath.startsWith(`${root}${path.sep}`)) {
    return notFound();
  }

  try {
    const body = await fs.readFile(fullPath);
    return new Response(body, {
      headers: {
        "Cache-Control": "public, max-age=300",
        "Content-Type": "image/svg+xml; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return notFound();
  }
}
