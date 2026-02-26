function normalizeBaseUrl(value: string | undefined): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed) {
    return "";
  }
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}

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
  const base = normalizeBaseUrl(process.env.SITE_BASE_URL) || normalizeBaseUrl(externalBaseUrl(request));
  const lastmod = new Date().toISOString().slice(0, 10);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${base}/</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${base}/gallery/</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${base}/how/</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${base}/benefits/</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${base}/design/</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${base}/privacy-policy/</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${base}/user-agreement/</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
