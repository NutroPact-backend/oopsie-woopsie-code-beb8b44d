// @ts-nocheck
/**
 * Shared cron / system auth for createServerFn handlers.
 *
 * Validates an `Authorization: Bearer <secret>` header against either the
 * `MESSAGING_CRON_SECRET` env var or `site_settings.messaging.cronSecret`.
 *
 * Use inside .handler() of any system-only server function that is otherwise
 * unauthenticated (cron drainers, admin maintenance, carrier triggers).
 */
import { getRequestHeader } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

export async function requireCronSecret(): Promise<void> {
  const auth = getRequestHeader("authorization") || getRequestHeader("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  // SEC-013: only accept the cron secret from the server environment. The
  // previous DB fallback (site_settings.messaging.cronSecret) meant any admin
  // (or anyone with write access to that row) could rotate a key that
  // unlocked system maintenance endpoints. The secret now must be provisioned
  // as MESSAGING_CRON_SECRET in the deployment environment.
  const expected = (process.env.MESSAGING_CRON_SECRET || "").trim();
  if (!expected) {
    throw new Error("Unauthorized: MESSAGING_CRON_SECRET not configured");
  }
  if (!token || !timingSafeEqual(token, expected)) {
    throw new Error("Unauthorized: invalid cron secret");
  }
}
