import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { rateLimit, logSecurityEvent } from "@/lib/rate-limit";

/**
 * SEC: Rate-limit interactive login + email-OTP requests by identifier (email/phone).
 * Counts every attempt; after 8 in 10 minutes the identifier is blocked for 30 minutes.
 * Fail-closed so an RPC outage cannot silently disable the limiter for credential flows.
 */
export const checkLoginRateLimit = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      identifier: z.string().min(1).max(200),
      kind: z.enum(["password", "email_otp", "phone_otp"]).default("password"),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const key = `${data.kind}:${data.identifier.trim().toLowerCase()}`;
    const res = await rateLimit("login_attempt", key, 8, 600, 1800, { failClosed: true });
    if (!res.allowed) {
      await logSecurityEvent({
        kind: "login_rate_limited",
        severity: "warn",
        detail: { kind: data.kind, identifier_hash: key.slice(0, 64), hits: res.hits, blockedUntil: res.blockedUntil },
      });
      const mins = res.blockedUntil
        ? Math.max(1, Math.ceil((new Date(res.blockedUntil).getTime() - Date.now()) / 60000))
        : 30;
      throw new Error(`Too many attempts. Please try again in ${mins} minutes.`);
    }
    return { ok: true };
  });