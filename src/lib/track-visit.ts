// @ts-nocheck
/**
 * Tiny visitor tracker — lite-mode friendly.
 * Fires once per page on idle; uses sendBeacon (zero-blocking).
 * Stays anonymous; respects saveData / 2G.
 */
import { isLiteMode, onIdle } from "./lite";

const SS_KEY = "sv_sid";
const SENT_KEY = "sv_last_path";
const CONSENT_KEY = "nutropact:cookie-consent";

// ANL-003: gate visitor tracking behind explicit consent.
function hasAnalyticsConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    if (!v) return false;
    return !!JSON.parse(v)?.accepted;
  } catch { return false; }
}

function sid(): string {
  try {
    let s = sessionStorage.getItem(SS_KEY);
    if (!s) {
      // ANL-005: cryptographically-random session id.
      s = (typeof crypto !== "undefined" && crypto.randomUUID)
        ? crypto.randomUUID()
        : (Date.now().toString(36) + Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, "0")).join(""));
      sessionStorage.setItem(SS_KEY, s);
    }
    return s;
  } catch { return "anon-" + Date.now().toString(36); }
}

function device(): "mobile" | "desktop" | "tablet" {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  if (/iPad|Tablet|PlayBook/i.test(ua)) return "tablet";
  if (/Mobi|Android|iPhone|iPod/i.test(ua)) return "mobile";
  return "desktop";
}

function utm(search: string) {
  try {
    const p = new URLSearchParams(search);
    const read = (k: string) => {
      const fromUrl = p.get(k);
      if (fromUrl) return fromUrl;
      try {
        const stored = localStorage.getItem("attr:" + k);
        if (stored) {
          const { v, exp } = JSON.parse(stored);
          if (!exp || exp > Date.now()) return v;
        }
      } catch {}
      try { return sessionStorage.getItem(k); } catch { return null; }
    };
    return {
      utm_source: read("utm_source"),
      utm_medium: read("utm_medium"),
      utm_campaign: read("utm_campaign"),
      utm_term: read("utm_term"),
      utm_content: read("utm_content"),
    };
  } catch { return { utm_source: null, utm_medium: null, utm_campaign: null }; }
}

export function trackVisit() {
  if (typeof window === "undefined") return;
  if (!hasAnalyticsConsent()) return;
  // Skip admin and api paths
  const path = window.location.pathname;
  if (path.startsWith("/admin") || path.startsWith("/api/")) return;

  // Dedupe per path within session
  try {
    if (sessionStorage.getItem(SENT_KEY) === path) return;
    sessionStorage.setItem(SENT_KEY, path);
  } catch {}

  const u = utm(window.location.search);
  // Persist utm for downstream attribution: 30-day first-touch window in
  // localStorage + per-session in sessionStorage.
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
  const persist = (k: string, v: string | null) => {
    if (!v) return;
    try { sessionStorage.setItem(k, v); } catch {}
    try {
      const existing = localStorage.getItem("attr:" + k);
      if (!existing) {
        localStorage.setItem("attr:" + k, JSON.stringify({ v, exp: Date.now() + THIRTY_DAYS }));
      }
    } catch {}
  };
  persist("utm_source", u.utm_source);
  persist("utm_medium", u.utm_medium);
  persist("utm_campaign", u.utm_campaign);
  persist("utm_term", u.utm_term);
  persist("utm_content", u.utm_content);

  const payload = {
    session_id: sid(),
    path: path.slice(0, 500),
    referrer: (document.referrer || "").slice(0, 500) || null,
    device: device(),
    ...u,
  };

  onIdle(() => {
    try {
      const body = JSON.stringify(payload);
      const url = "/api/public/track-visit";
      if (navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
      } else {
        fetch(url, { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
      }
    } catch {}
  }, isLiteMode() ? 3000 : 1000);
}
