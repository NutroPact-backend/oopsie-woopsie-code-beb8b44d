import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { listMySubscriptions, updateMySubscription } from '@/lib/subscriptions.functions';
import { useAuthStore } from '@/store/authStore';
import { ArrowLeft, Repeat, Pause, Play, X, SkipForward } from 'lucide-react';

function SubscriptionsPage() {
  const { user, ready } = useAuthStore();
  const navigate = useNavigate();
  const list = useServerFn(listMySubscriptions);
  const upd = useServerFn(updateMySubscription);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ready && !user) navigate({ to: '/login', search: { redirect: '/account/subscriptions' } as any });
  }, [ready, user, navigate]);

  const load = async () => {
    setLoading(true);
    try { const r: any = await list({}); setRows(r?.rows || []); }
    catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { if (user) load(); }, [user]);

  const act = async (id: string, patch: any) => {
    try { await upd({ data: { id, ...patch } }); load(); }
    catch (e: any) { alert(e?.message); }
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link to="/account" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-4">
        <ArrowLeft size={14} /> Back to account
      </Link>
      <h1 className="text-2xl font-black mb-2 flex items-center gap-2"><Repeat size={22} /> My Subscriptions</h1>
      <p className="text-sm text-gray-500 mb-6">Pause, skip or cancel your recurring orders anytime.</p>

      {loading ? (
        <div className="text-sm text-gray-400">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-2xl border p-8 text-center">
          <p className="text-gray-500 text-sm">No active subscriptions yet.</p>
          <Link to="/products" className="inline-block mt-3 bg-orange-500 text-white px-4 py-2 rounded-xl text-sm font-bold">Browse products</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map(r => (
            <div key={r.id} className="bg-white rounded-2xl border p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-bold">{r.product_name} <span className="text-gray-400">× {r.qty}</span></div>
                  <div className="text-xs text-gray-500">Every {r.interval_days} days · {r.discount_percent}% off</div>
                  <div className="text-xs text-gray-500 mt-1">Next delivery: <strong>{new Date(r.next_run_at).toLocaleDateString()}</strong></div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                  r.status === 'active' ? 'bg-green-100 text-green-700'
                  : r.status === 'paused' ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-gray-100 text-gray-600'
                }`}>{r.status}</span>
              </div>
              {r.status !== 'cancelled' && (
                <div className="flex gap-1.5 flex-wrap pt-2 border-t">
                  {r.status === 'active' && (
                    <>
                      <button onClick={() => act(r.id, { skipNext: true })} className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"><SkipForward size={11} />Skip next</button>
                      <button onClick={() => act(r.id, { status: 'paused' })} className="bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"><Pause size={11} />Pause</button>
                    </>
                  )}
                  {r.status === 'paused' && (
                    <button onClick={() => act(r.id, { status: 'active' })} className="bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"><Play size={11} />Resume</button>
                  )}
                  <button onClick={() => { if (confirm('Cancel this subscription?')) act(r.id, { status: 'cancelled' }); }} className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"><X size={11} />Cancel</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute('/account/subscriptions')({
  head: () => ({
    meta: [
      { title: 'My Subscriptions — NutroPact' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: SubscriptionsPage,
});
