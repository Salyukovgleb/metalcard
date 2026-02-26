const BLOCKED_HOSTS = new Set(["0.0.0.0", "127.0.0.1", "localhost", "::1", "[::1]"]);

export function normalizeBaseUrl(value: string | undefined): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed) {
    return "";
  }
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}

export function normalizePublicBaseUrl(value: string | undefined): string {
  const normalized = normalizeBaseUrl(value);
  if (!normalized) {
    return "";
  }

  try {
    const parsed = new URL(normalized);
    if ((parsed.protocol !== "http:" && parsed.protocol !== "https:") || BLOCKED_HOSTS.has(parsed.hostname.toLowerCase())) {
      return "";
    }
    return normalized;
  } catch {
    return "";
  }
}
