import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

type CarrierId =
  | "shiprocket" | "delhivery" | "bluedart" | "shipmozo"
  | "ekart" | "amazon_shipping" | "indiapost" | "dtdc";

const CARRIER_IDS: CarrierId[] = ["shiprocket", "delhivery", "bluedart", "shipmozo", "ekart", "amazon_shipping", "indiapost", "dtdc"];

function isCarrierId(id: string): id is CarrierId {
  return (CARRIER_IDS as string[]).includes(id);
}

async function loadCarrier(id: CarrierId) {
  const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!);
  const { data } = await sb.from("site_settings").select("settings").eq("key", "default").maybeSingle();
  const cfg = (data?.settings as any)?.shipping ?? {};
  return cfg.carriers?.[id] as any;
}

function delhiveryBase(c: any) {
  return c.mode === "staging" ? "https://staging-express.delhivery.com" : "https://track.delhivery.com";
}

async function runTest(id: CarrierId, c: any): Promise<{ ok: boolean; message?: string; error?: string }> {
  if (!c) return { ok: false, error: "Not configured" };
  try {
    if (id === "shiprocket") {
      if (!c.email || !c.password) return { ok: false, error: "Email/password missing" };
      const r = await fetch("https://apiv2.shiprocket.in/v1/external/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: c.email, password: c.password }),
      });
      const j: any = await r.json().catch(() => ({}));
      if (!r.ok || !j?.token) return { ok: false, error: j?.message || `HTTP ${r.status}` };
      return { ok: true, message: "Shiprocket authenticated" };
    }
    if (id === "delhivery") {
      if (!c.apiToken || !c.clientName) return { ok: false, error: "API token / client name missing" };
      const r = await fetch(`${delhiveryBase(c)}/c/api/pin-codes/json/?filter_codes=110001`, {
        headers: { Authorization: `Token ${c.apiToken}` },
      });
      return r.ok ? { ok: true, message: "Delhivery token valid" } : { ok: false, error: `HTTP ${r.status}` };
    }
    if (id === "shipmozo") {
      if (!c.publicKey || !c.privateKey) return { ok: false, error: "Public/Private key missing" };
      const r = await fetch("https://shipping-api.com/app/api/v1/get-warehouses", {
        method: "GET",
        headers: { "public-key": c.publicKey, "private-key": c.privateKey },
      });
      const j: any = await r.json().catch(() => ({}));
      if (!r.ok) return { ok: false, error: `Shipmozo API HTTP ${r.status}` };
      if (String(j?.result) !== "1") return { ok: false, error: j?.message || "Invalid Shipmozo keys" };
      const count = Array.isArray(j?.data) ? j.data.length : 0;
      return { ok: true, message: `Shipmozo keys valid${count ? ` · ${count} warehouse found` : ""}` };
    }
    if (id === "bluedart") {
      if (!c.licenseKey || !c.loginId || !c.customerCode || !c.areaCode) return { ok: false, error: "License key / Login ID / customer code / area code missing" };
      return { ok: true, message: "Bluedart credentials saved (contract API — contact Bluedart to enable WaybillGeneration)" };
    }
    if (id === "dtdc") {
      if (!c.accessToken || !c.customerCode) return { ok: false, error: "Access token / customer code missing" };
      return { ok: true, message: "DTDC credentials saved (contract-only API)" };
    }
    if (id === "ekart") {
      if (!c.merchantCode || !c.apiKey) return { ok: false, error: "Merchant code / API key missing" };
      return { ok: true, message: "Ekart credentials saved (Flipkart Logistics contract API)" };
    }
    if (id === "amazon_shipping") {
      if (!c.sellerId || !c.refreshToken || !c.clientId || !c.clientSecret) return { ok: false, error: "Seller ID / SP-API tokens missing" };
      return { ok: true, message: "Amazon Shipping credentials saved (SP-API contract API)" };
    }
    if (id === "indiapost") {
      if (!c.customerId || !c.apiKey) return { ok: false, error: "Customer ID / API key missing" };
      return { ok: true, message: "India Post credentials saved (manual booking via portal)" };
    }
    return { ok: true, message: "Credentials saved" };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Test failed" };
  }
}

export const Route = createFileRoute("/api/shipping/test")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json().catch(() => ({}));
          const rawId = String(body?.carrier || "");
          if (!rawId) return Response.json({ ok: false, error: "Missing carrier" }, { status: 400 });
          if (!isCarrierId(rawId)) return Response.json({ ok: false, error: "Unsupported carrier" }, { status: 400 });
          const id = rawId as CarrierId;
          const c = await loadCarrier(id);
          const res = await runTest(id, c);
          return Response.json(res);
        } catch (e: any) {
          return Response.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
        }
      },
    },
  },
});
