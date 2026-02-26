"use client";

import { useEffect } from "react";

type LegalState = {
  privacyAccepted: boolean;
  termsAccepted: boolean;
};

const ORDER_API_PATHS = ["/api/orders/createOrder", "/api/orders/createPromoOrder", "/api/orders/submit"];

function isUzLocalePath(pathname: string): boolean {
  const lower = pathname.toLowerCase();
  return lower.includes("/uz") || lower.endsWith("/uz");
}

function legalErrorMessage(): string {
  return isUzLocalePath(window.location.pathname)
    ? "Davom etish uchun maxfiylik siyosati va foydalanuvchi kelishuvini qabul qiling."
    : "Чтобы продолжить, примите политику конфиденциальности и пользовательское соглашение.";
}

function readLegalState(): LegalState {
  const privacy = document.getElementById("legal-privacy-consent") as HTMLInputElement | null;
  const terms = document.getElementById("legal-terms-consent") as HTMLInputElement | null;
  return {
    privacyAccepted: Boolean(privacy?.checked),
    termsAccepted: Boolean(terms?.checked),
  };
}

function legalAccepted(state: LegalState): boolean {
  return state.privacyAccepted && state.termsAccepted;
}

function showLegalError(): void {
  const message = legalErrorMessage();
  const errorNode = document.getElementById("legal-consent-error");
  if (errorNode) {
    errorNode.textContent = message;
    errorNode.hidden = false;
  } else {
    window.alert(message);
  }
}

function clearLegalError(): void {
  const errorNode = document.getElementById("legal-consent-error");
  if (errorNode) {
    errorNode.hidden = true;
  }
}

function shouldPatchRequest(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.origin);
    return ORDER_API_PATHS.some((path) => parsed.pathname.endsWith(path));
  } catch {
    return ORDER_API_PATHS.some((path) => url.includes(path));
  }
}

function mergeLegalBody(body: string, state: LegalState): string {
  const parsed = JSON.parse(body) as Record<string, unknown>;
  return JSON.stringify({
    ...parsed,
    privacyAccepted: state.privacyAccepted,
    termsAccepted: state.termsAccepted,
  });
}

export function OrderLegalGuard() {
  useEffect(() => {
    const handleClickCapture = (event: Event) => {
      const target = event.target as Element | null;
      if (!target) {
        return;
      }

      const submitButton = target.closest("#payme-form-create-order");
      if (!submitButton) {
        return;
      }

      const state = readLegalState();
      if (legalAccepted(state)) {
        clearLegalError();
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      if ("stopImmediatePropagation" in event) {
        (event as Event & { stopImmediatePropagation?: () => void }).stopImmediatePropagation?.();
      }
      showLegalError();
    };

    const handleConsentInput = () => {
      if (legalAccepted(readLegalState())) {
        clearLegalError();
      }
    };

    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const requestUrl =
        typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;
      if (!shouldPatchRequest(requestUrl)) {
        return originalFetch(input, init);
      }

      const state = readLegalState();
      if (!legalAccepted(state)) {
        showLegalError();
        return new Response(JSON.stringify({ message: "legal_consents_required" }), {
          status: 400,
          headers: { "content-type": "application/json" },
        });
      }

      clearLegalError();

      if (init?.body && typeof init.body === "string") {
        try {
          const nextBody = mergeLegalBody(init.body, state);
          return originalFetch(input, { ...init, body: nextBody });
        } catch {
          return originalFetch(input, init);
        }
      }

      return originalFetch(input, init);
    };

    document.addEventListener("click", handleClickCapture, true);
    document.addEventListener("change", handleConsentInput, true);
    return () => {
      document.removeEventListener("click", handleClickCapture, true);
      document.removeEventListener("change", handleConsentInput, true);
      window.fetch = originalFetch;
    };
  }, []);

  return null;
}
