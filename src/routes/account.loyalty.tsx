// @ts-nocheck
/**
 * Customer-facing loyalty status page — shows current tier, progress to next, perks.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Award, Check, TrendingUp, Lock } from "lucide-react";
import { getMyLoyalty } from "@/lib/loyalty.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/account/loyalty")({
  component: LoyaltyPage,
  head: () => ({
    meta: [
      { title: "My Loyalty Rewards | NutroPact" },
      { name: "description", content: "View your loyalty tier, lifetime spend, and unlock perks." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function LoyaltyPage() {
  const fetchMine = useServerFn(getMyLoyalty);
  const [data, setData] = useState<any>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: s }) => {
      const ok = !!s.session;
      setAuthed(ok);
      if (ok) fetchMine().then(setData).catch(() => setData({ error: true }));
    });
  }, [fetchMine]);

  if (authed === false) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16 text-center">
        <Lock size={32} className="mx-auto text-muted-foreground mb-3" />
        <h1 className="text-2xl font-bold mb-2">Sign in to see your rewards</h1>
        <p className="text-sm text-muted-foreground mb-6">Your loyalty tier and perks are tied to your account.</p>
        <a href="/login" className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">Sign in</a>
      </div>
    );
  }

  if (!data) return <div className="container mx-auto max-w-3xl px-4 py-16 text-center text-sm text-muted-foreground">Loading…</div>;

  const { spend, tier, nextTier, toNext, tiers } = data;
  const progress = nextTier
    ? Math.min(100, Math.round((spend / Number(nextTier.min_lifetime_spend)) * 100))
    : 100;

  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-black flex items-center gap-2"><Award className="text-primary" /> My Rewards</h1>
        <p className="text-sm text-muted-foreground mt-1">Earn perks as you shop with us.</p>
      </header>

      <section className="rounded-2xl border border-border bg-card p-6 mb-6">
        <div className="flex items-center gap-3 mb-3">
          {tier ? (
            <>
              <span className="h-10 w-10 rounded-full ring-4 ring-white shadow-lg shrink-0" style={{ background: tier.badge_color }} />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Current tier</p>
                <h2 className="text-2xl font-black">{tier.name}</h2>
              </div>
            </>
          ) : (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Get started</p>
              <h2 className="text-2xl font-black">No tier yet</h2>
            </div>
          )}
          <div className="ml-auto text-right">
            <p className="text-[11px] text-muted-foreground">Lifetime spend</p>
            <p className="text-xl font-black">₹{Number(spend).toLocaleString("en-IN")}</p>
          </div>
        </div>

        {nextTier ? (
          <>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold flex items-center gap-1"><TrendingUp size={12} /> {nextTier.name}</span>
              <span className="text-muted-foreground">₹{toNext.toLocaleString("en-IN")} to go</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
          </>
        ) : (
          <p className="text-sm text-emerald-600 font-bold">🎉 You've reached the top tier!</p>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">All tiers</h3>
        {tiers.map((t: any) => {
          const reached = Number(spend) >= Number(t.min_lifetime_spend);
          const isCurrent = tier?.id === t.id;
          return (
            <div key={t.id} className={`rounded-xl border p-4 transition ${isCurrent ? "border-primary bg-primary/5" : reached ? "border-emerald-200 bg-emerald-50/30 dark:bg-emerald-900/10" : "border-border bg-card opacity-75"}`}>
              <div className="flex items-center gap-3 mb-2">
                <span className="h-6 w-6 rounded-full shrink-0" style={{ background: t.badge_color }} />
                <h4 className="font-black">{t.name}</h4>
                {isCurrent && <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded font-bold uppercase">You</span>}
                <span className="ml-auto text-xs text-muted-foreground">≥ ₹{Number(t.min_lifetime_spend).toLocaleString("en-IN")}</span>
              </div>
              <div className="flex gap-2 mb-2 text-xs">
                {Number(t.discount_percent) > 0 && <span className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 px-2 py-0.5 rounded font-bold">{t.discount_percent}% off</span>}
                {t.free_shipping && <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 px-2 py-0.5 rounded font-bold">Free shipping</span>}
              </div>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {(t.perks || []).map((p: string, i: number) => (
                  <li key={i} className="flex items-start gap-1.5"><Check size={11} className="text-emerald-500 mt-0.5 shrink-0" />{p}</li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>
    </div>
  );
}
