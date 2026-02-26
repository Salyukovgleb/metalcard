"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type TrackBody = {
  eventName: string;
  path: string;
  payload?: Record<string, unknown>;
};

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

function hasAnalyticsConsent(): boolean {
  if (typeof document === "undefined") {
    return false;
  }
  return parseCookies(document.cookie ?? "")[CONSENT_COOKIE] === "accepted";
}

function sendTrackEvent(body: TrackBody): void {
  if (!hasAnalyticsConsent()) {
    return;
  }

  fetch("/api/analytics/track", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    credentials: "same-origin",
    keepalive: true,
  }).catch(() => {
    // Ignore analytics delivery issues.
  });
}

declare global {
  interface Window {
    mcTrack?: (eventName: string, payload?: Record<string, unknown>) => void;
  }
}

export function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedRef = useRef<string>("");
  const currentPathRef = useRef<string>("");

  const currentPath = useMemo(() => {
    const query = searchParams?.toString() ?? "";
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  useEffect(() => {
    currentPathRef.current = currentPath;
  }, [currentPath]);

  useEffect(() => {
    if (!currentPath || currentPath === lastTrackedRef.current || !hasAnalyticsConsent()) {
      return;
    }
    lastTrackedRef.current = currentPath;

    sendTrackEvent({
      eventName: "page_view",
      path: currentPath,
      payload: {
        screen: window.screen?.width ? `${window.screen.width}x${window.screen.height}` : "",
      },
    });
  }, [currentPath]);

  useEffect(() => {
    window.mcTrack = (eventName: string, payload?: Record<string, unknown>) => {
      sendTrackEvent({
        eventName,
        path: window.location.pathname + window.location.search,
        payload,
      });
    };

    return () => {
      delete window.mcTrack;
    };
  }, []);

  useEffect(() => {
    const handleConsentChange = () => {
      if (!hasAnalyticsConsent()) {
        return;
      }

      const path = currentPathRef.current || window.location.pathname + window.location.search;
      if (!path || path === lastTrackedRef.current) {
        return;
      }

      lastTrackedRef.current = path;
      sendTrackEvent({
        eventName: "page_view",
        path,
        payload: {
          screen: window.screen?.width ? `${window.screen.width}x${window.screen.height}` : "",
        },
      });
    };

    window.addEventListener("mc-cookie-consent-changed", handleConsentChange as EventListener);
    return () => {
      window.removeEventListener("mc-cookie-consent-changed", handleConsentChange as EventListener);
    };
  }, []);

  return null;
}
