import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Share2, Copy, Check, Gift } from "lucide-react";
import { getMyReferralCode } from "@/lib/referrals.functions";
import { useAuthStore } from "@/store/authStore";

export const Route = createFileRoute("/account/refer")({
  head: () => ({ meta: [{ title: "Refer & Earn — NutroPact" }] }),
  component: ReferPage,
});

function ReferPage() {
  const { ready, user } = useAuthStore();
  const [data, setData] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const fn = useServerFn(getMyReferralCode);

  useEffect(() => {
    if (ready && user) fn().then(setData).catch(() => {});
  }, [ready, user, fn]);

  if (!ready) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;
  if (!user) {
    return (
      <div className="max-w-md mx-auto p-6 text-center">
        <h1 className="text-2xl font-black mb-2">Refer & Earn</h1>
        <p className="text-gray-500 mb-4">Login to get your referral code.</p>
        <a href="/login" className="inline-block bg-orange-500 text-white rounded-full px-6 py-3 font-bold">Login</a>
      </div>
    );
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const link = data?.code ? `${origin}/?ref=${data.code}` : "";

  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  }

  async function share() {
    const shareText = `Try NutroPact 💪 Use my code ${data?.code} and get ₹100 off. ${link}`;
    if ((navigator as any).share) {
      try { await (navigator as any).share({ title: "NutroPact", text: shareText, url: link }); } catch {}
    } else {
      copy(shareText);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-5">
      <div className="text-center">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-400 text-white mb-3">
          <Gift size={28} />
        </div>
        <h1 className="text-3xl font-black">Refer & Earn</h1>
        <p className="text-gray-500 text-sm mt-1">Friend ko apna code do. Wo ₹100 off paayega, tu ₹150 NutroPay credit.</p>
      </div>

      {data ? (
        <>
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-dashed border-orange-300 rounded-2xl p-6 text-center">
            <p className="text-xs uppercase font-bold text-orange-700 mb-1">Your code</p>
            <p className="text-3xl font-mono font-black tracking-wider text-gray-900">{data.code}</p>
            <div className="flex gap-2 justify-center mt-4">
              <button onClick={() => copy(data.code)}
                className="flex items-center gap-1.5 bg-white border border-orange-300 text-orange-700 px-4 py-2 rounded-full text-sm font-bold">
                {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy code"}
              </button>
              <button onClick={share}
                className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-full text-sm font-bold">
                <Share2 size={14} /> Share link
              </button>
            </div>
            <p className="mt-3 text-[11px] text-gray-500 break-all">{link}</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Stat label="Friends invited" v={data.totalReferred} />
            <Stat label="Completed" v={data.completed} />
            <Stat label="Earned (₹)" v={Number(data.earned).toLocaleString("en-IN")} />
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <h3 className="font-black text-sm mb-3">How it works</h3>
            <ol className="space-y-2 text-sm text-gray-600">
              <li><b>1.</b> Share your code with a friend.</li>
              <li><b>2.</b> They sign up using your link or enter the code at checkout.</li>
              <li><b>3.</b> When their first order is delivered, ₹150 lands in your NutroPay 🎉</li>
            </ol>
          </div>

          {data.referrals?.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
              <div className="p-3 border-b font-black text-sm">Your referrals</div>
              <table className="w-full text-sm">
                <tbody>
                  {data.referrals.slice(0, 20).map((r: any) => (
                    <tr key={r.id} className="border-t">
                      <td className="px-3 py-2 text-xs text-gray-500">{new Date(r.created_at).toLocaleDateString("en-IN")}</td>
                      <td className="px-3 py-2">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          r.status === "completed" ? "bg-emerald-50 text-emerald-700" :
                          r.status === "pending" ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-500"
                        }`}>{r.status}</span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs">
                        {r.status === "completed" ? `+₹${r.referrer_reward}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <div className="text-center text-gray-400 py-12">Loading your code…</div>
      )}
    </div>
  );
}

function Stat({ label, v }: { label: string; v: any }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl py-3 text-center">
      <p className="text-2xl font-black text-gray-900">{v}</p>
      <p className="text-[10px] uppercase font-bold text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}
