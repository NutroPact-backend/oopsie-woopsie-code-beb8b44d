/**
 * SEC: Origin/Referer check for public state-changing endpoints that are
 * meant to be called from our own browser pages (e.g. analytics beacons,
 * pincode lookups). Blocks trivial CSRF and off-site abuse. Server-to-server
 * callers that don't send Origin/Referer (cron, mobile apps with explicit
 * API key) should not use this guard — they authenticate with a shared
 * secret instead.
 */
const ALLOWED_HOSTS = [
  "nutropact.com",
  "www.nutropact.com",
  "oopsie-woopsie-code.lovable.app",
  "localhost",
  "127.0.0.1",
];

function hostAllowed(host: string | null): boolean {
  if (!host) return false;
  const h = host.toLowerCase().split(":")[0];
  if (ALLOWED_HOSTS.includes(h)) return true;
  // Lovable preview/published subdomains
  if (/\.lovable\.app$/.test(h)) return true;
  if (/\.lovableproject\.com$/.test(h)) return true;
  return false;
}

export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  try {
    if (origin && origin !== "null") return hostAllowed(new URL(origin).hostname);
    if (referer) return hostAllowed(new URL(referer).hostname);
  } catch {
    return false;
  }
  // No Origin/Referer at all — could be a non-browser tool. Reject by default
  // for state-changing endpoints; callers wanting to allow that must opt in.
  return false;
}