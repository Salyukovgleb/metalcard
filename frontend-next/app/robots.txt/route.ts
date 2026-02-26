import { normalizePublicBaseUrl } from "@/lib/public-base-url";

function externalBaseUrl(request: Request): string {
  const xForwardedHost = (request.headers.get("x-forwarded-host") ?? "").trim();
  const xForwardedProto = (request.headers.get("x-forwarded-proto") ?? "").trim();
  const hostRaw = xForwardedHost || request.headers.get("host") || new URL(request.url).host;
  const protoRaw = xForwardedProto || new URL(request.url).protocol.replace(":", "") || "http";

  let host = hostRaw;
  if (host.includes(":")) {
    const [left, right] = host.split(":");
    if (right === "80" || right === "443") {
      host = left ?? host;
    }
  }

  const forceHttps = ["1", "true", "yes", "on"].includes((process.env.PAYME_FORCE_HTTPS ?? "").trim().toLowerCase());
  const proto = forceHttps ? "https" : protoRaw;
  return `${proto}://${host}`;
}

export async function GET(request: Request) {
  const base = normalizePublicBaseUrl(process.env.SITE_BASE_URL) || normalizePublicBaseUrl(externalBaseUrl(request)) || "https://metalcards.uz";
  const robots = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/

Sitemap: ${base}/sitemap.xml`;

  return new Response(robots, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
