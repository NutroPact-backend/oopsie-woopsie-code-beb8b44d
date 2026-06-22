import { createServerFn } from "@tanstack/react-start";
import { getRequestIP } from "@tanstack/react-start/server";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { rateLimit, logSecurityEvent } from "@/lib/rate-limit";

const ContactSchema = z.object({
  name: z.string().trim().min(1, "Name required").max(100),
  email: z.string().trim().email("Invalid email").max(255),
  phone: z.string().trim().max(20).optional().default(""),
  subject: z.string().trim().max(100).optional().default("General Inquiry"),
  message: z.string().trim().min(5, "Message too short").max(2000),
});

/**
 * SEC: Public contact form. Rate-limited by IP (5 submissions per hour,
 * 1-hour block) to deter spam. Fail-closed so an RPC outage cannot turn the
 * form into an open inbox-firehose.
 */
export const submitContact = createServerFn({ method: "POST" })
  .inputValidator((input) => ContactSchema.parse(input))
  .handler(async ({ data }) => {
    const ip = getRequestIP({ xForwardedFor: true }) || "anon";
    const rl = await rateLimit("contact_submit", ip, 5, 3600, 3600, { failClosed: true });
    if (!rl.allowed) {
      await logSecurityEvent({
        kind: "contact_rate_limited",
        severity: "warn",
        sourceIp: ip,
        detail: { hits: rl.hits, blockedUntil: rl.blockedUntil },
      });
      throw new Error("Too many submissions from your network. Please try again later.");
    }
    const { error } = await (supabaseAdmin as any).from("contact_submissions").insert({
      name: data.name,
      email: data.email,
      phone: data.phone,
      subject: data.subject,
      message: data.message,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });