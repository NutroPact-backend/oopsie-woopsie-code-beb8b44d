// @ts-nocheck
import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { ShieldCheck, ShieldAlert, Loader2, Camera, Flag, History, X, CheckCircle2, AlertTriangle, Gift, Truck } from 'lucide-react';
import { verifyAuthCode, analyzeSealPhoto, submitCounterfeitReport, publicLedger, claimAuthCode, listCheckpoints } from '@/lib/product-auth.functions';
import { supabase } from '@/integrations/supabase/client';

export const Route = createFileRoute('/verify/$code')({
  head: ({ params }) => ({
    meta: [
      { title: `Verify ${params.code} — NutroPact` },
      { name: 'description', content: 'Verify your NutroPact product authenticity.' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: VerifyPage,
});

function VerifyPage() {
  const { code } = Route.useParams();
  const verify = useServerFn(verifyAuthCode);
  const analyze = useServerFn(analyzeSealPhoto);
  const report = useServerFn(submitCounterfeitReport);
  const ledger = useServerFn(publicLedger);
  const claim = useServerFn(claimAuthCode);
  const fetchCheckpoints = useServerFn(listCheckpoints);

  const [hidden, setHidden] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Seal AI check
  const [sealBusy, setSealBusy] = useState(false);
  const [sealResult, setSealResult] = useState<any>(null);

  // Report modal
  const [showReport, setShowReport] = useState(false);

  // Ledger
  const [showLedger, setShowLedger] = useState(false);
  const [ledgerData, setLedgerData] = useState<any>(null);

  // Phase 3: claim + checkpoints
  const [user, setUser] = useState<any>(null);
  const [claimBusy, setClaimBusy] = useState(false);
  const [claimResult, setClaimResult] = useState<any>(null);
  const [checkpoints, setCheckpoints] = useState<any[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  const run = async () => {
    setBusy(true);
    try {
      const fp = await fingerprint();
      const r = await verify({ data: { fullCode: code, hiddenCode: hidden || undefined, fingerprint: fp } });
      setResult(r);
      if (r.ok && r.product?.batch) {
        fetchCheckpoints({ data: { batchCode: r.product.batch } }).then(c => setCheckpoints(c.checkpoints || []));
      }
    } catch (e: any) {
      setResult({ ok: false, message: 'Network error: ' + (e?.message || e) });
    } finally { setBusy(false); }
  };

  const doClaim = async () => {
    setClaimBusy(true);
    try {
      const r = await claim({ data: { fullCode: code } });
      setClaimResult(r);
    } catch (e: any) {
      setClaimResult({ ok: false, error: e?.message || String(e) });
    } finally { setClaimBusy(false); }
  };

  const uploadAndAnalyzeSeal = async (file: File) => {
    setSealBusy(true);
    try {
      const path = `seals/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name.replace(/[^a-z0-9.]/gi, '_')}`;
      const { error } = await supabase.storage.from('product-auth-photos').upload(path, file, { cacheControl: '3600' });
      if (error) throw error;
      const { data: pub } = supabase.storage.from('product-auth-photos').getPublicUrl(path);
      const r = await analyze({ data: { fullCode: code, photoUrl: pub.publicUrl } });
      setSealResult({ ...r, photoUrl: pub.publicUrl });
    } catch (e: any) {
      setSealResult({ ok: false, verdict: 'unknown', notes: 'Upload failed: ' + (e?.message || e) });
    } finally { setSealBusy(false); }
  };

  const loadLedger = async () => {
    setShowLedger(true);
    if (!ledgerData) {
      const l = await ledger({ data: { fullCode: code } });
      setLedgerData(l);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <ShieldCheck className="text-orange-500" size={32} />
          <h1 className="text-2xl font-black">Verify Product</h1>
        </div>
        <p className="text-sm text-gray-500 mb-2">Code:</p>
        <p className="font-mono text-xs bg-gray-100 rounded-lg p-3 break-all mb-5">{code}</p>

        {!result && (
          <>
            <label className="text-xs font-bold text-gray-600 block mb-4">
              Scratch panel code (under the foil — first scan only)
              <input
                value={hidden}
                onChange={e => setHidden(e.target.value.toUpperCase())}
                placeholder="e.g. A1B2C3"
                maxLength={12}
                className="mt-1 w-full border-2 rounded-xl px-4 py-3 text-base font-mono uppercase tracking-widest"
              />
            </label>
            <button
              onClick={run}
              disabled={busy}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-full py-4 text-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {busy ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
              Verify Authenticity
            </button>
          </>
        )}

        {result && (
          <div className={`rounded-2xl p-6 ${result.ok ? 'bg-green-50 border-2 border-green-500' : 'bg-red-50 border-2 border-red-500'}`}>
            {result.ok ? <ShieldCheck className="text-green-600 mb-2" size={36} /> : <ShieldAlert className="text-red-600 mb-2" size={36} />}
            <p className={`text-lg font-black ${result.ok ? 'text-green-700' : 'text-red-700'}`}>{result.message}</p>
            {result.product?.name && <p className="text-sm text-gray-700 mt-3"><b>Product:</b> {result.product.name}</p>}
            {result.product?.batch && <p className="text-sm text-gray-700"><b>Batch:</b> {result.product.batch}</p>}
            {result.scanCount > 1 && <p className="text-xs text-gray-500 mt-2">This code has been scanned {result.scanCount} times.</p>}
            {result.warning && <p className="text-sm font-bold text-orange-700 mt-3 bg-orange-100 rounded-lg p-2">⚠️ {result.warning}</p>}

            {/* Layer 2 — AI seal photo check */}
            <div className="mt-5 pt-5 border-t border-gray-200">
              <p className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                <Camera size={14} /> Extra layer: AI seal check
              </p>
              {!sealResult ? (
                <label className={`block border-2 border-dashed rounded-xl p-4 text-center cursor-pointer hover:bg-gray-50 ${sealBusy ? 'opacity-50' : ''}`}>
                  <input type="file" accept="image/*" capture="environment" className="hidden"
                    disabled={sealBusy}
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadAndAnalyzeSeal(f); }} />
                  {sealBusy ? <Loader2 className="animate-spin mx-auto" /> : (
                    <>
                      <Camera className="mx-auto text-gray-400 mb-1" size={20} />
                      <p className="text-xs text-gray-600">Tap to photograph the tamper-seal / hologram</p>
                    </>
                  )}
                </label>
              ) : (
                <div className={`rounded-xl p-3 text-sm ${verdictBg(sealResult.verdict)}`}>
                  <div className="flex items-center gap-2 font-bold">
                    {verdictIcon(sealResult.verdict)} {verdictLabel(sealResult.verdict)}
                    {sealResult.confidence != null && <span className="text-xs font-normal ml-auto">{Math.round(sealResult.confidence * 100)}% conf.</span>}
                  </div>
                  {sealResult.notes && <p className="text-xs mt-1.5">{sealResult.notes}</p>}
                </div>
              )}
            </div>

            {/* Phase 3 — claim reward + warranty */}
            {result.ok && (
              <div className="mt-5 pt-5 border-t border-gray-200">
                <p className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                  <Gift size={14} className="text-orange-500" /> Claim ownership & rewards
                </p>
                {!user ? (
                  <Link to="/login" search={{ next: `/verify/${code}` } as any} className="block text-center bg-orange-100 hover:bg-orange-200 text-orange-800 font-bold rounded-xl py-2.5 text-xs">
                    Login to claim ₹10 reward + 1-year warranty
                  </Link>
                ) : claimResult?.ok ? (
                  <div className="bg-green-50 border border-green-300 rounded-xl p-3 text-xs">
                    {claimResult.creditedAmount > 0 && <p className="font-bold text-green-700">🎉 ₹{claimResult.creditedAmount} credited to your wallet!</p>}
                    {claimResult.alreadyRegistered && <p className="text-gray-700">Already registered to your account.</p>}
                    {claimResult.warrantyUntil && <p className="text-gray-600 mt-1">Warranty valid until <b>{new Date(claimResult.warrantyUntil).toLocaleDateString()}</b></p>}
                  </div>
                ) : claimResult && !claimResult.ok ? (
                  <p className="text-xs text-red-600 bg-red-50 rounded-lg p-2">{claimResult.error}</p>
                ) : (
                  <button onClick={doClaim} disabled={claimBusy}
                    className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:opacity-90 text-white font-bold rounded-xl py-2.5 text-xs disabled:opacity-50 flex items-center justify-center gap-1.5">
                    {claimBusy ? <Loader2 size={14} className="animate-spin" /> : <Gift size={14} />}
                    Claim ₹10 wallet + warranty
                  </button>
                )}
              </div>
            )}

            {/* Supply chain checkpoints */}
            {checkpoints.length > 0 && (
              <div className="mt-5 pt-5 border-t border-gray-200">
                <p className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                  <Truck size={14} className="text-orange-500" /> Supply chain journey
                </p>
                <ol className="space-y-1.5">
                  {checkpoints.map((cp) => (
                    <li key={cp.id} className="flex items-start gap-2 text-xs">
                      <span className="mt-1 w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                      <div className="flex-1">
                        <p className="font-bold capitalize">{cp.stage.replace(/_/g, ' ')}</p>
                        {cp.location && <p className="text-gray-500">{cp.location}</p>}
                        <p className="text-[10px] text-gray-400">{new Date(cp.occurred_at).toLocaleString()}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => { setResult(null); setHidden(''); setSealResult(null); setLedgerData(null); setClaimResult(null); setCheckpoints([]); }}
                className="flex-1 bg-white border-2 border-gray-300 hover:bg-gray-50 font-bold rounded-full py-2.5 text-xs"
              >
                Verify another
              </button>
              <button onClick={loadLedger} className="flex-1 bg-white border-2 border-gray-300 hover:bg-gray-50 font-bold rounded-full py-2.5 text-xs flex items-center justify-center gap-1">
                <History size={12} /> History
              </button>
            </div>

            {result?.ok && (
              <div className="flex gap-2 mt-2">
                <Link
                  to="/verify/$code/certificate"
                  params={{ code }}
                  className="flex-1 bg-orange-50 border-2 border-orange-200 hover:bg-orange-100 text-orange-800 font-bold rounded-full py-2.5 text-xs flex items-center justify-center gap-1"
                >
                  📜 Certificate
                </Link>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`✅ Verified genuine ${result?.product?.name || 'NutroPact product'} (${code}) via ProofPack: ${typeof window !== 'undefined' ? window.location.href : ''}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-green-50 border-2 border-green-200 hover:bg-green-100 text-green-800 font-bold rounded-full py-2.5 text-xs flex items-center justify-center gap-1"
                >
                  💬 Share on WhatsApp
                </a>
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => setShowReport(true)}
          className="mt-4 w-full text-orange-700 bg-orange-100 hover:bg-orange-200 font-bold rounded-full py-2.5 text-xs flex items-center justify-center gap-1.5"
        >
          <Flag size={12} /> Suspect counterfeit? Report & earn ₹500 bounty
        </button>


        <p className="text-[10px] text-gray-400 text-center mt-4">
          ProofPack™ multi-layer anti-counterfeit verification
        </p>
      </div>

      {showReport && <ReportModal code={code} onClose={() => setShowReport(false)} report={report} />}
      {showLedger && <LedgerModal data={ledgerData} onClose={() => setShowLedger(false)} />}
    </div>
  );
}

function verdictBg(v: string) {
  return v === 'authentic' ? 'bg-green-50 text-green-800 border border-green-300'
    : v === 'counterfeit' ? 'bg-red-50 text-red-800 border border-red-300'
    : v === 'suspicious' ? 'bg-orange-50 text-orange-800 border border-orange-300'
    : 'bg-gray-50 text-gray-700 border border-gray-200';
}
function verdictIcon(v: string) {
  if (v === 'authentic') return <CheckCircle2 size={16} className="text-green-600" />;
  if (v === 'counterfeit') return <ShieldAlert size={16} className="text-red-600" />;
  if (v === 'suspicious') return <AlertTriangle size={16} className="text-orange-600" />;
  return <Camera size={16} className="text-gray-500" />;
}
function verdictLabel(v: string) {
  return { authentic: 'Seal looks authentic', counterfeit: 'Likely counterfeit seal', suspicious: 'Suspicious — please report', unclear: 'Could not verify — try a clearer photo', unknown: 'Verification unavailable' }[v as 'authentic'] || v;
}

function ReportModal({ code, onClose, report }: { code: string; onClose: () => void; report: any }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', reason: '', details: '', purchaseLocation: '' });
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<any>(null);

  const uploadPhoto = async (file: File) => {
    const path = `reports/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name.replace(/[^a-z0-9.]/gi, '_')}`;
    const { error } = await supabase.storage.from('product-auth-photos').upload(path, file);
    if (error) { alert('Upload failed'); return; }
    const { data: pub } = supabase.storage.from('product-auth-photos').getPublicUrl(path);
    setPhotos(p => [...p, pub.publicUrl]);
  };

  const submit = async () => {
    if (!form.name || !form.email || !form.reason) { alert('Fill name, email and reason'); return; }
    setBusy(true);
    try {
      const r = await report({ data: { code, reporterName: form.name, reporterEmail: form.email, reporterPhone: form.phone, reason: form.reason, details: form.details, purchaseLocation: form.purchaseLocation, photoUrls: photos } });
      setDone(r);
    } catch (e: any) { alert('Failed: ' + (e?.message || e)); }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black flex items-center gap-2"><Flag className="text-orange-500" size={20} /> Report counterfeit</h2>
          <button onClick={onClose}><X /></button>
        </div>
        {done ? (
          <div className="text-center py-6">
            <CheckCircle2 className="mx-auto text-green-600 mb-3" size={48} />
            <p className="font-black text-lg">Thank you!</p>
            <p className="text-sm text-gray-600 mt-2">{done.message}</p>
            <button onClick={onClose} className="mt-5 w-full bg-orange-500 text-white font-bold rounded-full py-3 text-sm">Close</button>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-500 mb-4">Earn <b>₹500 wallet credit + free product</b> if confirmed counterfeit. Reports are investigated within 48h.</p>
            <div className="space-y-2">
              <input placeholder="Your name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
              <input placeholder="Email *" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
              <input placeholder="Phone (optional)" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
              <input placeholder="Reason (e.g. broken seal, wrong taste) *" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
              <input placeholder="Where did you buy it?" value={form.purchaseLocation} onChange={e => setForm({ ...form, purchaseLocation: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
              <textarea placeholder="Details" value={form.details} onChange={e => setForm({ ...form, details: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} />
              <label className="block border-2 border-dashed rounded-lg p-3 text-center cursor-pointer hover:bg-gray-50 text-xs">
                <input type="file" accept="image/*" multiple className="hidden" onChange={e => { Array.from(e.target.files || []).slice(0, 6 - photos.length).forEach(uploadPhoto); }} />
                📷 Add evidence photos ({photos.length}/6)
              </label>
              {photos.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {photos.map((p, i) => (
                    <div key={i} className="relative">
                      <img src={p} alt="" className="w-14 h-14 object-cover rounded" />
                      <button onClick={() => setPhotos(photos.filter((_, x) => x !== i))} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-[10px]">×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button onClick={submit} disabled={busy} className="mt-5 w-full bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-full py-3 text-sm disabled:opacity-50">
              {busy ? 'Submitting…' : 'Submit Report'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function LedgerModal({ data, onClose }: { data: any; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black flex items-center gap-2"><History className="text-orange-500" size={20} /> Public scan ledger</h2>
          <button onClick={onClose}><X /></button>
        </div>
        {!data ? <Loader2 className="animate-spin mx-auto" /> : !data.ok ? (
          <p className="text-sm text-gray-500">Code not found.</p>
        ) : (
          <>
            <div className="bg-gray-50 rounded-lg p-3 mb-3 text-xs">
              <p><b>Batch:</b> {data.code.batch_code}</p>
              <p><b>Status:</b> {data.code.status}</p>
              <p><b>Total scans:</b> {data.code.scan_count}</p>
              {data.code.first_scan_at && <p><b>First scan:</b> {new Date(data.code.first_scan_at).toLocaleDateString()} · {data.code.first_scan_country || '?'}</p>}
            </div>
            <p className="text-xs font-bold text-gray-700 mb-2">Recent scans ({data.scans.length})</p>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {data.scans.map((s: any, i: number) => (
                <div key={i} className={`text-xs p-2 rounded flex items-center gap-2 ${s.ok ? 'bg-green-50' : 'bg-red-50'}`}>
                  {s.ok ? <CheckCircle2 size={12} className="text-green-600" /> : <ShieldAlert size={12} className="text-red-600" />}
                  <span className="flex-1">{s.location}</span>
                  <span className="text-gray-400">{new Date(s.at).toLocaleString()}</span>
                </div>
              ))}
              {data.scans.length === 0 && <p className="text-xs text-gray-400 text-center py-3">No scans yet.</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

async function fingerprint(): Promise<string> {
  try {
    const s = [navigator.userAgent, navigator.language, screen.width + 'x' + screen.height, new Date().getTimezoneOffset(), (navigator as any).deviceMemory || '', navigator.hardwareConcurrency || ''].join('|');
    const enc = new TextEncoder().encode(s);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(buf)).slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch { return 'unknown'; }
}
