/**
 * Public pincode serviceability endpoint.
 * Uses Shipmozo first; falls back to Delhivery if configured.
 * GET /api/public/pincode-check?pincode=110001
 */
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { isSameOriginRequest } from "@/lib/origin-guard";
import { rateLimit } from "@/lib/rate-limit";

type Result = {
  serviceable: boolean;
  cod?: boolean;
  prepaid?: boolean;
  etaDays?: number | null;
  courier?: string;
  message: string;
  source?: string;
};

async function checkShipmozo(c: any, origin: string, dest: string): Promise<Result | null> {
  if (!c?.enabled || !c?.publicKey || !c?.privateKey) return null;
  try {
    const r = await fetch("https://shipping-api.com/app/api/v1/rate-calculator", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "public-key": c.publicKey,
        "private-key": c.privateKey,
      },
      body: JSON.stringify({
        order_id: "",
        pickup_pincode: Number(origin),
        delivery_pincode: Number(dest),
        payment_type: "PREPAID",
        shipment_type: "FORWARD",
        order_amount: 500,
        type_of_package: "SPS",
        rov_type: "ROV_OWNER",
        cod_amount: "",
        weight: 500,
        dimensions: [{ no_of_box: "1", length: "22", width: "10", height: "10" }],
      }),
    });
    const j: any = await r.json().catch(() => ({}));
    if (!r.ok || String(j?.result) !== "1") return null;
    const list = Array.isArray(j?.data) ? j.data : Array.isArray(j?.data?.available_couriers) ? j.data.available_couriers : [];
    if (!list.length) return null;
    // best ETA
    const etas = list.map((x: any) => Number(x.estimated_delivery_days ?? x.edd ?? 0)).filter(Boolean);
    const eta = etas.length ? Math.min(...etas) : null;
    // try COD check
    let cod = false;
    try {
      const rc = await fetch("https://shipping-api.com/app/api/v1/rate-calculator", {
        method: "POST",
        headers: { "Content-Type": "application/json", "public-key": c.publicKey, "private-key": c.privateKey },
        body: JSON.stringify({
          pickup_pincode: Number(origin), delivery_pincode: Number(dest),
          payment_type: "COD", shipment_type: "FORWARD", order_amount: 500,
          type_of_package: "SPS", rov_type: "ROV_OWNER", cod_amount: "500",
          weight: 500, dimensions: [{ no_of_box: "1", length: "22", width: "10", height: "10" }],
        }),
      });
      const jc: any = await rc.json().catch(() => ({}));
      const codList = Array.isArray(jc?.data) ? jc.data : Array.isArray(jc?.data?.available_couriers) ? jc.data.available_couriers : [];
      cod = String(jc?.result) === "1" && codList.length > 0;
    } catch { /* ignore */ }

    return {
      serviceable: true,
      prepaid: true,
      cod,
      etaDays: eta,
      courier: list[0]?.courier_name || list[0]?.name || "",
      message: `Delivery in ${eta || "3-5"} days${cod ? " • COD available" : " • Prepaid only"}`,
      source: "shipmozo",
    };
  } catch {
    return null;
  }
}

async function checkDelhivery(c: any, origin: string, dest: string): Promise<Result | null> {
  if (!c?.enabled || !c?.apiToken) return null;
  try {
    const base = c.mode === "staging" ? "https://staging-express.delhivery.com" : "https://track.delhivery.com";
    const r = await fetch(`${base}/c/api/pin-codes/json/?filter_codes=${dest}`, {
      headers: { Authorization: `Token ${c.apiToken}` },
    });
    if (!r.ok) return null;
    const j: any = await r.json().catch(() => ({}));
    const pc = j?.delivery_codes?.[0]?.postal_code;
    if (!pc) return null;
    const serviceable = (pc.pre_paid || "").toLowerCase() === "y" || (pc.cod || "").toLowerCase() === "y";
    if (!serviceable) return null;
    return {
      serviceable: true,
      prepaid: (pc.pre_paid || "").toLowerCase() === "y",
      cod: (pc.cod || "").toLowerCase() === "y",
      etaDays: null,
      courier: "Delhivery",
      message: `Delivers via Delhivery${(pc.cod || "").toLowerCase() === "y" ? " • COD available" : " • Prepaid only"}`,
      source: "delhivery",
    };
  } catch {
    return null;
  }
}

async function handle(request: Request): Promise<Response> {
  // SEC: pincode lookup proxies an upstream rate-limited carrier API and
  // is only meant for our checkout page. Reject cross-origin callers and
  // throttle per IP.
  if (!isSameOriginRequest(request)) {
    return Response.json({ serviceable: false, message: "forbidden" } satisfies Result, { status: 403 });
  }
  const ip =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "anon";
  const rl = await rateLimit("pincode_check", ip, 30, 60, 300);
  if (!rl.allowed) {
    return Response.json({ serviceable: false, message: "Too many lookups. Try again shortly." } satisfies Result, { status: 429 });
  }
  const url = new URL(request.url);
  const pincode = (url.searchParams.get("pincode") || "").trim();
  if (!/^\d{6}$/.test(pincode)) {
    return Response.json({ serviceable: false, message: "Enter a valid 6-digit pincode" } satisfies Result, { status: 400 });
  }

  const { data } = await supabaseAdmin
    .from("site_settings")
    .select("settings")
    .eq("key", "default")
    .maybeSingle();
  const shipping = ((data?.settings as any)?.shipping ?? {}) as any;
  const origin = shipping.originPincode || shipping.originAddress?.pincode;
  if (!origin) {
    return Response.json({ serviceable: true, message: "Pincode accepted (origin not configured)" } satisfies Result);
  }
  if (origin === pincode) {
    return Response.json({ serviceable: true, cod: true, prepaid: true, etaDays: 1, message: "Same-city delivery — usually 1 day", source: "local" } satisfies Result);
  }

  const carriers = shipping.carriers ?? {};
  const sm = await checkShipmozo(carriers.shipmozo, origin, pincode);
  if (sm?.serviceable) return Response.json(sm);
  const dh = await checkDelhivery(carriers.delhivery, origin, pincode);
  if (dh?.serviceable) return Response.json(dh);

  // No carrier said yes — allow with warning rather than block
  return Response.json({
    serviceable: true,
    cod: false,
    prepaid: true,
    etaDays: null,
    message: "Delivery available — courier will be assigned after order",
    source: "fallback",
  } satisfies Result);
}

export const Route = createFileRoute("/api/public/pincode-check")({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
    },
  },
});
