import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { checkGiftCard, redeemGiftCard, myRedeemedGiftCards } from '@/lib/giftcards.functions';
import { useAuthStore } from '@/store/authStore';
import { ArrowLeft, Gift, CheckCircle2, AlertCircle } from 'lucide-react';

function RedeemPage() {
  const { user, ready } = useAuthStore();
  const navigate = useNavigate();
  const checkFn = useServerFn(checkGiftCard);
  const redeemFn = useServerFn(redeemGiftCard);
  const listFn = useServerFn(myRedeemedGiftCards);

  const [code, setCode] = useState('');
  const [status, setStatus] = useState<{ kind: 'idle' | 'checking' | 'ok' | 'bad' | 'done'; msg?: string; amount?: number }>({ kind: 'idle' });
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (ready && !user) navigate({ to: '/login', search: { redirect: '/account/redeem' } as any });
  }, [ready, user, navigate]);

  const loadHistory = async () => {
    try { const r: any = await listFn({}); setHistory(r?.cards || []); } catch {}
  };
  useEffect(() => { if (user) loadHistory(); }, [user]);

  const onCheck = async () => {
    if (!code.trim()) return;
    setStatus({ kind: 'checking' });
    try {
      const r: any = await checkFn({ data: { code: code.trim() } });
      if (r.valid) setStatus({ kind: 'ok', amount: r.balance });
      else setStatus({ kind: 'bad', msg: r.reason });
    } catch (e: any) { setStatus({ kind: 'bad', msg: e.message || 'Failed' }); }
  };

  const onRedeem = async () => {
    setStatus({ kind: 'checking' });
    try {
      const r: any = await redeemFn({ data: { code: code.trim() } });
      setStatus({ kind: 'done', amount: r.credited });
      setCode('');
      loadHistory();
    } catch (e: any) { setStatus({ kind: 'bad', msg: e.message || 'Failed' }); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-4 sm:p-6">
        <Link to="/account" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-4"><ArrowLeft size={14} /> Account</Link>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center"><Gift size={18} /></div>
            <h1 className="text-xl font-black">Redeem Gift Card</h1>
          </div>
          <p className="text-sm text-gray-500 mb-5">Code daalo — amount tumhare NutroPay me credit ho jayega.</p>

          <input
            value={code}
            onChange={e => { setCode(e.target.value.toUpperCase()); setStatus({ kind: 'idle' }); }}
            placeholder="GC-XXXX-XXXX-XXXX"
            className="w-full font-mono tracking-widest text-center text-lg uppercase border-2 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-400"
          />

          {status.kind === 'bad' && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0" /> {status.msg}
            </div>
          )}
          {status.kind === 'ok' && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 flex items-start gap-2">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              Valid gift card worth <b className="mx-1">₹{status.amount?.toFixed(0)}</b> — redeem karne ke baad NutroPay me credit ho jayega.
            </div>
          )}
          {status.kind === 'done' && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 flex items-start gap-2">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              ₹{status.amount?.toFixed(0)} tumhare NutroPay me credit ho gaye. <Link to="/account" className="underline ml-1">NutroPay dekho</Link>
            </div>
          )}

          <div className="mt-4 flex gap-2">
            {status.kind !== 'ok' ? (
              <button onClick={onCheck} disabled={!code.trim() || status.kind === 'checking'}
                className="flex-1 px-4 py-3 bg-gray-900 text-white rounded-xl font-bold text-sm disabled:opacity-50">
                {status.kind === 'checking' ? 'Checking…' : 'Check code'}
              </button>
            ) : (
              <button onClick={onRedeem} className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-xl font-bold text-sm">
                Redeem ₹{status.amount?.toFixed(0)}
              </button>
            )}
          </div>
        </div>

        {history.length > 0 && (
          <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-bold mb-3">Previously redeemed</h2>
            <div className="space-y-2">
              {history.map((c, i) => (
                <div key={i} className="flex items-center justify-between text-sm border-b last:border-0 py-2">
                  <span className="font-mono text-xs text-gray-600">{c.code}</span>
                  <span className="font-bold">₹{Number(c.amount).toFixed(0)}</span>
                  <span className="text-xs text-gray-400">{c.redeemed_at ? new Date(c.redeemed_at).toLocaleDateString() : '—'}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute('/account/redeem')({ component: RedeemPage });
