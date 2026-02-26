"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ConsentValue = "accepted" | "rejected";

const CONSENT_COOKIE = "mc_cookie_consent";

function parseCookies(raw: string): Record<string, string> {
  if (!raw) {
    return {};
  }

  const result: Record<string, string> = {};
  const parts = raw.split(";");
  for (const part of parts) {
    const idx = part.indexOf("=");
    if (idx <= 0) {
      continue;
    }
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (!key) {
      continue;
    }
    try {
      result[key] = decodeURIComponent(value);
    } catch {
      result[key] = value;
    }
  }

  return result;
}

function readConsentCookie(): string {
  if (typeof document === "undefined") {
    return "";
  }
  return parseCookies(document.cookie ?? "")[CONSENT_COOKIE] ?? "";
}

function writeConsentCookie(value: ConsentValue): void {
  if (typeof document === "undefined") {
    return;
  }
  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

function clearAnalyticsCookiesClient(): void {
  if (typeof document === "undefined") {
    return;
  }
  document.cookie = "mc_vid=; path=/; max-age=0; samesite=lax";
  document.cookie = "mc_sid=; path=/; max-age=0; samesite=lax";
}

function isUzLocalePath(pathname: string): boolean {
  const lower = pathname.toLowerCase();
  return lower.includes("/uz") || lower.endsWith("/uz");
}

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const isUz = useMemo(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return isUzLocalePath(window.location.pathname);
  }, []);

  useEffect(() => {
    const current = readConsentCookie();
    setVisible(!(current === "accepted" || current === "rejected"));
  }, []);

  async function applyConsent(consent: ConsentValue): Promise<void> {
    if (loading) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/analytics/consent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ consent }),
        credentials: "same-origin",
      });
      if (!response.ok) {
        throw new Error("consent_failed");
      }
    } catch {
      // Fallback to client-side cookies when API call fails.
      writeConsentCookie(consent);
      if (consent === "rejected") {
        clearAnalyticsCookiesClient();
      }
    } finally {
      setLoading(false);
      setVisible(false);
      window.dispatchEvent(new CustomEvent("mc-cookie-consent-changed", { detail: { consent } }));
    }
  }

  if (!visible) {
    return null;
  }

  return (
    <div className="mc-cookie-banner" role="dialog" aria-live="polite" aria-label={isUz ? "Cookie roziligi" : "Согласие на cookie"}>
      <div className="mc-cookie-banner__text">
        {isUz ? (
          <>
            Biz sayt ishlashi va tahlil uchun cookie fayllardan foydalanamiz. Batafsil:{" "}
            <Link href="/privacy-policy" target="_blank" rel="noreferrer">
              maxfiylik siyosati
            </Link>{" "}
            va{" "}
            <Link href="/user-agreement" target="_blank" rel="noreferrer">
              foydalanuvchi kelishuvi
            </Link>
            .
          </>
        ) : (
          <>
            Мы используем cookie для работы сайта и аналитики. Подробнее:{" "}
            <Link href="/privacy-policy" target="_blank" rel="noreferrer">
              политика конфиденциальности
            </Link>{" "}
            и{" "}
            <Link href="/user-agreement" target="_blank" rel="noreferrer">
              пользовательское соглашение
            </Link>
            .
          </>
        )}
      </div>

      <div className="mc-cookie-banner__actions">
        <button type="button" className="mc-cookie-btn mc-cookie-btn_primary" onClick={() => applyConsent("accepted")} disabled={loading}>
          {isUz ? "Qabul qilish" : "Принять"}
        </button>
        <button type="button" className="mc-cookie-btn" onClick={() => applyConsent("rejected")} disabled={loading}>
          {isUz ? "Rad etish" : "Отклонить"}
        </button>
      </div>
    </div>
  );
}
