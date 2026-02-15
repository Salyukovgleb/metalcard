export type Locale = "ru" | "uz";
export type ActivePage = "main" | "gallery" | "how" | "benefits" | "design";

export const ACCEPTED_LOCALES: Locale[] = ["ru", "uz"];

export function isLocale(value: string): value is Locale {
  return ACCEPTED_LOCALES.includes(value as Locale);
}

export function preferredLocaleFromAcceptLanguage(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) {
    return "ru";
  }

  const variants = acceptLanguage
    .split(",")
    .map((part) => {
      const [rawTag, ...params] = part.trim().toLowerCase().split(";");
      let q = 1;

      for (const param of params) {
        const [key, value] = param.trim().split("=");
        if (key !== "q") {
          continue;
        }

        const parsed = Number.parseFloat(value ?? "");
        if (!Number.isNaN(parsed)) {
          q = parsed;
        }
      }

      return { tag: rawTag, q };
    })
    .filter((variant) => variant.tag.length > 0)
    .sort((a, b) => b.q - a.q);

  for (const { tag } of variants) {
    const [base] = tag.split("-");
    if (isLocale(base)) {
      return base;
    }
  }

  return "ru";
}

export function otherLocale(locale: Locale): Locale {
  return locale === "ru" ? "uz" : "ru";
}

export function routeFor(page: ActivePage, locale: Locale): string {
  if (page === "main") {
    return `/${locale}/`;
  }

  return `/${page}/${locale}/`;
}

export function withQuery(path: string, query: string): string {
  return `${path}${query}`;
}

export function localePathFromCurrentPath(currentPath: string, locale: Locale): string {
  const normalized = currentPath.endsWith("/") ? currentPath : `${currentPath}/`;
  return normalized.replace(/\/(ru|uz)\//, `/${locale}/`);
}

export const mobileHeadingByPage: Record<Locale, Record<ActivePage, string>> = {
  ru: {
    main: "главная",
    gallery: "галерея",
    how: "как это работает",
    benefits: "преимущества",
    design: "твой дизайн",
  },
  uz: {
    main: "bosh sahifa",
    gallery: "galereya",
    how: "bu qanday ishlaydi",
    benefits: "afzalliklar",
    design: "sizning dizayningis",
  },
};

export const navLabels: Record<Locale, Record<ActivePage, string>> = {
  ru: {
    main: "главная",
    gallery: "галерея",
    how: "как это работает",
    benefits: "преимущества",
    design: "твой дизайн",
  },
  uz: {
    main: "bosh sahifa",
    gallery: "galereya",
    how: "bu qanday ishlaydi",
    benefits: "afzalliklar",
    design: "sizning dizayningiz",
  },
};
