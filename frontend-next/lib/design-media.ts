function sanitizeSvgPath(svgPath: string): string {
  return svgPath.split("#")[0]?.split("?")[0]?.replaceAll("\\", "/").trim() ?? "";
}

export function extractFolderFromSvg(svgPath: string | null | undefined): string | null {
  const value = (svgPath ?? "").trim();
  if (!value) {
    return null;
  }

  const normalized = sanitizeSvgPath(value);
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length < 2) {
    return null;
  }
  return parts[parts.length - 2] ?? null;
}

export function extractRenderIdFromSvg(svgPath: string | null | undefined): number | null {
  const value = (svgPath ?? "").trim();
  if (!value) {
    return null;
  }

  const normalized = sanitizeSvgPath(value);
  const parts = normalized.split("/").filter(Boolean);
  const fileName = parts[parts.length - 1] ?? "";
  const noExt = fileName.replace(/\.[^.]+$/, "").trim();

  if (!/^\d+$/.test(noExt)) {
    return null;
  }

  const parsed = Number.parseInt(noExt, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}
