type ResolveOptions = {
  title?: string;
  params?: Record<string, unknown>;
};

const EXPLICIT_ALIASES: Record<string, string> = {
  "black-silver": "black-silver-mat",
  "black-silver-mat": "black-silver-mat",
  "black-gold": "black-gold-mat",
  "black-gold-1": "black-gold-mat",
  "black-gold-mat": "black-gold-mat",
  "black-gold-rib": "black-gold-rib",
  "gold-mirror-1": "gold-mirror",
  "gold-mirror": "gold-mirror",
  "gold-mirror-2": "gold-mirror-black",
  "gold-mirror-black": "gold-mirror-black",
  red: "red",
  blue: "blue",
  green: "green",
};

function normalize(value: string): string {
  return value.trim().toLowerCase().replaceAll("_", "-").replace(/\s+/g, "-");
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function hasBlackHint(code: string, title: string, params: Record<string, unknown>): boolean {
  if (code.includes("black") || code.endsWith("-2") || code.endsWith("-3")) {
    return true;
  }

  if (/чер|qora|black/i.test(title)) {
    return true;
  }

  const render = asString(params.renderColor ?? params.render_color ?? params.render).toLowerCase();
  if (render === "black") {
    return true;
  }

  const textColor = asString(params.textColor ?? params.text_color).toLowerCase();
  if (textColor === "#202020" || textColor === "#000" || textColor === "#000000" || textColor === "black") {
    return true;
  }

  return false;
}

export function resolveCanonicalColorCode(rawCode: string, options: ResolveOptions = {}): string {
  const code = normalize(rawCode);
  if (!code) {
    return "";
  }

  const explicit = EXPLICIT_ALIASES[code];
  if (explicit) {
    return explicit;
  }

  if (code.startsWith("black-silver")) {
    return "black-silver-mat";
  }

  if (code.startsWith("black-gold")) {
    return code.includes("rib") ? "black-gold-rib" : "black-gold-mat";
  }

  if (code.startsWith("gold-mirror")) {
    const title = asString(options.title);
    const params = options.params ?? {};
    return hasBlackHint(code, title, params) ? "gold-mirror-black" : "gold-mirror";
  }

  if (code === "red" || code === "blue" || code === "green") {
    return code;
  }

  return code;
}
