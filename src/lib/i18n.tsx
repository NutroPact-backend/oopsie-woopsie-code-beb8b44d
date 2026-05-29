/**
 * Lightweight i18n — no external deps (lite-mode rule).
 * - Reads current locale from: localStorage > <html lang> > browser > 'en'
 * - When user signs in, server pushes their preferred_language and we sync.
 * - Components subscribe via useLocale() / useT().
 */
import { useEffect, useState, useSyncExternalStore, useCallback } from "react";
import { DEFAULT_LOCALE, isLocale, type LocaleCode } from "./locales";
import { dictionaries } from "./i18n.dict";

const LS_KEY = "np_lang";

// ───────── Store ─────────
let current: LocaleCode = DEFAULT_LOCALE;
const listeners = new Set<() => void>();

function emit() { listeners.forEach((l) => l()); }

function readStored(): LocaleCode {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const ls = window.localStorage.getItem(LS_KEY);
    if (isLocale(ls)) return ls;
  } catch { /* ignore */ }
  const nav = window.navigator?.language?.slice(0, 2)?.toLowerCase();
  return isLocale(nav) ? nav : DEFAULT_LOCALE;
}

if (typeof window !== "undefined") {
  current = readStored();
  try { document.documentElement.lang = current; } catch { /* ignore */ }
}

export function getLocale(): LocaleCode { return current; }

export function setLocale(loc: LocaleCode, opts?: { persist?: boolean }) {
  if (!isLocale(loc) || loc === current) return;
  current = loc;
  if (opts?.persist !== false && typeof window !== "undefined") {
    try { window.localStorage.setItem(LS_KEY, loc); } catch { /* ignore */ }
    try { document.documentElement.lang = loc; } catch { /* ignore */ }
  }
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

// ───────── Hooks ─────────
export function useLocale(): [LocaleCode, (l: LocaleCode) => void] {
  const loc = useSyncExternalStore(
    subscribe,
    () => current,
    () => DEFAULT_LOCALE, // SSR snapshot
  );
  return [loc, setLocale];
}

/**
 * t(key, fallback?) — returns translated string for current locale.
 * Falls back to English dict, then to the literal key.
 * Supports {placeholder} interpolation via 2nd-arg object.
 */
export function useT() {
  const [loc] = useLocale();
  return useCallback((key: string, vars?: Record<string, string | number>) => {
    const dict = dictionaries[loc] || dictionaries.en;
    let s = dict[key] || dictionaries.en[key] || key;
    if (vars) {
      for (const k in vars) s = s.replaceAll(`{${k}}`, String(vars[k]));
    }
    return s;
  }, [loc]);
}

// ───────── Server-side sync helper (called after sign-in) ─────────
export function syncLocaleFromProfile(profileLanguage?: string | null) {
  if (!profileLanguage || !isLocale(profileLanguage)) return;
  // Profile language wins over local storage when user is signed in.
  if (typeof window !== "undefined") {
    try { window.localStorage.setItem(LS_KEY, profileLanguage); } catch { /* ignore */ }
  }
  setLocale(profileLanguage, { persist: false });
}

// ───────── Optional <I18nReady> wrapper (no-op for now, future hot-loading) ─────────
export function I18nReady({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  // Always render — locale is read synchronously on first paint via getLocale().
  void mounted;
  return <>{children}</>;
}
