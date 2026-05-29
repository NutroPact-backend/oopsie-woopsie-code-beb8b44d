// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { ShieldCheck, MapPin, Users, AlertTriangle, Trophy, Activity } from 'lucide-react';
import { trustWallStats, guardianLeaderboard, myGuardianStats } from '@/lib/product-auth.functions';
import { useAuthStore } from '@/store/authStore';

export const Route = createFileRoute('/verify/wall')({
  component: TrustWallPage,
  head: () => ({
    meta: [
      { title: 'Trust Wall — ProofPack by NutroPact' },
      { name: 'description', content: 'Live transparency wall: real-time product verifications, counterfeits caught, and our community of Guardian customers.' },
    ],
  }),
});

function tierColor(tier: string) {
  if (tier === 'platinum') return 'from-slate-200 to-slate-400 text-slate-900';
  if (tier === 'gold') return 'from-yellow-200 to-yellow-400 text-yellow-900';
  if (tier === 'silver') return 'from-gray-200 to-gray-300 text-gray-800';
  return 'from-orange-200 to-orange-300 text-orange-900';
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN').format(n);
}

function TrustWallPage() {
  const stats = useServerFn(trustWallStats);
  const board = useServerFn(guardianLeaderboard);
  const mine = useServerFn(myGuardianStats);
  const { user } = useAuthStore();
  const [s, setS] = useState<any>(null);
  const [b, setB] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [a, c] = await Promise.all([stats({}), board({})]);
      setS(a); setB(c.entries || []);
      if (user) { try { setMe(await mine({})); } catch {} }
      setLoading(false);
    })();
    // refresh every 60s (lite-mode: no aggressive polling)
    const id = setInterval(async () => {
      const a = await stats({});
      setS(a);
    }, 60000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 px-4 py-1.5 rounded-full text-xs font-bold mb-3">
            <Activity size={14} className="animate-pulse" /> LIVE
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-gray-900 leading-tight">
            ProofPack Trust Wall
          </h1>
          <p className="text-gray-600 mt-3 max-w-2xl mx-auto">
            Real-time transparency. Every scan, every counterfeit caught, every Guardian protecting our community — out in the open.
          </p>
        </header>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading live stats…</div>
        ) : (
          <>
            <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              <Stat icon={<ShieldCheck size={20} />} label="Total verifications" value={fmt(s?.totalScans || 0)} accent="text-emerald-700" />
              <Stat icon={<Activity size={20} />} label="Last 24 hours" value={fmt(s?.scans24h || 0)} accent="text-blue-700" />
              <Stat icon={<MapPin size={20} />} label="Cities (30d)" value={fmt(s?.uniqueCities30d || 0)} accent="text-purple-700" />
              <Stat icon={<AlertTriangle size={20} />} label="Counterfeits blocked" value={fmt(s?.counterfeitsBlocked || 0)} accent="text-red-700" />
            </section>

            {me && (
              <section className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-3xl p-5 mb-6 shadow-lg flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white/20 grid place-items-center text-3xl">🛡️</div>
                <div className="flex-1">
                  <p className="text-emerald-100 text-xs font-bold uppercase tracking-wide">Your Guardian status</p>
                  <p className="text-2xl font-black mt-0.5">{fmt(me.points)} points · <span className="capitalize">{me.tier}</span></p>
                  <p className="text-xs text-emerald-100 mt-1">{me.verifications} verifications · {me.reports} reports submitted</p>
                </div>
                <div className={`text-xs font-black px-3 py-1.5 rounded-full uppercase ${
                  me.tier === 'platinum' ? 'bg-slate-100 text-slate-900' :
                  me.tier === 'gold' ? 'bg-yellow-300 text-yellow-900' :
                  me.tier === 'silver' ? 'bg-gray-200 text-gray-800' : 'bg-orange-200 text-orange-900'
                }`}>{me.tier} Guardian</div>
              </section>
            )}


            <section className="bg-white rounded-3xl border border-gray-200 p-5 mb-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Trophy size={22} className="text-yellow-500" />
                <h2 className="text-xl font-black">Top Guardians this season</h2>
                <span className="ml-auto text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {fmt(s?.guardians || 0)} active
                </span>
              </div>
              {b.length === 0 ? (
                <p className="text-sm text-gray-500 py-6 text-center">
                  Be the first Guardian — verify a product and earn points!
                </p>
              ) : (
                <ol className="space-y-2">
                  {b.slice(0, 10).map((e: any) => (
                    <li key={e.rank} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50">
                      <span className="w-8 h-8 rounded-full bg-gray-100 grid place-items-center font-black text-sm">
                        {e.rank}
                      </span>
                      <span className="flex-1 font-semibold text-gray-900 text-sm">{e.name}</span>
                      <span className={`text-xs font-black px-2.5 py-1 rounded-full bg-gradient-to-r ${tierColor(e.tier)} uppercase`}>
                        {e.tier}
                      </span>
                      <span className="font-black text-emerald-700 text-sm w-16 text-right">
                        {fmt(e.points)} pt
                      </span>
                    </li>
                  ))}
                </ol>
              )}
              <p className="mt-4 text-xs text-gray-500 text-center">
                Earn 5 pts per verification · 25 pts per counterfeit report · 100 pts when report is confirmed
              </p>
            </section>

            <section className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-6 text-white text-center">
              <Users size={32} className="mx-auto mb-2 opacity-90" />
              <h3 className="text-2xl font-black">Join {fmt(s?.guardians || 0)}+ Guardians</h3>
              <p className="text-emerald-100 mt-2 text-sm max-w-md mx-auto">
                Every NutroPact product has a unique QR code. Scan, verify, and help us keep counterfeits out of India's fitness community.
              </p>
              <a href="/" className="inline-block mt-4 bg-white text-emerald-700 font-bold px-6 py-2.5 rounded-full text-sm hover:bg-emerald-50">
                Shop authentic →
              </a>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: string }) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
      <div className={`${accent || 'text-gray-700'} mb-1`}>{icon}</div>
      <p className="text-2xl font-black text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 font-semibold mt-0.5">{label}</p>
    </div>
  );
}
