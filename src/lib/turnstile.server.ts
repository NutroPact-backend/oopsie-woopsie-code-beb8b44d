/**
 * Cloudflare Turnstile (CAPTCHA) server-side verification helper.
 *
 * Required env: TURNSTILE_SECRET_KEY
 * Public env (exposed to browser via VITE_): VITE_TURNSTILE_SITE_KEY
 *
 * Usage inside any server fn:
 *   import { verifyTurnstile } from "@/lib/turnstile.server";
 *   await verifyTurnstile(token, ip);
 *
 * SEC-006: In production we FAIL CLOSED when the secret is missing — a
 * silent skip would disable CAPTCHA across every form. In development we
 * still skip with a loud warning so contributors aren't blocked.
 */
export async function verifyTurnstile(token: string | null | undefined, remoteIp?: string | null) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    const isProd = (process.env.NODE_ENV === "production") || !!process.env.CF_PAGES || !!process.env.CLOUDFLARE_DEPLOYMENT;
    if (isProd) {
      console.error("[turnstile] TURNSTILE_SECRET_KEY missing in production — failing closed");
      return { ok: false as const, error: "captcha_misconfigured" as const };
    }
    console.warn("[turnstile] TURNSTILE_SECRET_KEY missing — skipping (dev only)");
    return { ok: true, skipped: true as const };
  }
  if (!token || typeof token !== "string" || token.length > 4096) {
    return { ok: false, error: "missing_token" as const };
  }
  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);
  if (remoteIp) body.set("remoteip", remoteIp);

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body,
  });
  if (!res.ok) return { ok: false, error: `http_${res.status}` };
  const json = await res.json() as { success?: boolean; "error-codes"?: string[] };
  if (json.success) return { ok: true as const };
  return { ok: false, error: (json["error-codes"]?.[0] || "verify_failed") };
}
