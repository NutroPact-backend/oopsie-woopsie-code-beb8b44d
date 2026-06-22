import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import {
  getMarketingAdmin, saveMarketingSettings,
  listUtmCampaigns, saveUtmCampaign, deleteUtmCampaign,
  listConversionLog, getMarketingDashboard,
} from '@/lib/marketing.functions';
import {
  Save, Plus, Trash2, ExternalLink, Copy, Check, AlertCircle,
  BarChart3, Search, Pin, Link as LinkIcon, FileText, Globe, Layers, Zap, Bot, MapPin,
} from 'lucide-react';
import { toast } from 'sonner';
import { TabHelp } from './_TabHelp';

type SubTab = 'pixels' | 'capi' | 'seo' | 'jsonld' | 'aiSearch' | 'geo' | 'utm' | 'robots' | 'hreflang' | 'ab' | 'dashboard' | 'log';

const SUBS: { id: SubTab; label: string; icon: any }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'pixels', label: 'Pixels & Verification', icon: Pin },
  { id: 'capi', label: 'Conversions API', icon: Zap },
  { id: 'seo', label: 'OG & Twitter Defaults', icon: Search },
  { id: 'jsonld', label: 'Schema.org JSON-LD', icon: FileText },
  { id: 'aiSearch', label: 'AI Search (AEO/LLM)', icon: Bot },
  { id: 'geo', label: 'GEO / Local', icon: MapPin },
  { id: 'utm', label: 'UTM Builder', icon: LinkIcon },
  { id: 'robots', label: 'robots.txt', icon: FileText },
  { id: 'hreflang', label: 'Hreflang', icon: Globe },
  { id: 'ab', label: 'A/B Experiments', icon: Layers },
  { id: 'log', label: 'Conversion Log', icon: AlertCircle },
];

export default function MarketingSeoTab() {
  const [sub, setSub] = useState<SubTab>('dashboard');
  const [cfg, setCfg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useServerFn(getMarketingAdmin);
  const save = useServerFn(saveMarketingSettings);

  async function refresh() {
    setLoading(true);
    try { const r = await load(); setCfg(r.config || {}); } finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);

  async function patch(p: Record<string, any>) {
    setSaving(true);
    try {
      const r = await save({ data: { patch: p } });
      setCfg(r.config);
      toast.success('Saved');
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Loading…</div>;
  if (!cfg) return <div className="p-8 text-center text-red-500">Failed to load config</div>;

  return (
    <div className="flex gap-6">
      <TabHelp topic="marketingSeo" />
      <aside className="w-56 shrink-0">
        <div className="bg-white border rounded-2xl p-2 space-y-0.5 sticky top-20">
          {SUBS.map(s => {
            const Icon = s.icon;
            return (
              <button key={s.id} onClick={() => setSub(s.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-left transition ${sub === s.id ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                <Icon size={14} /> {s.label}
              </button>
            );
          })}
        </div>
      </aside>
      <div className="flex-1 min-w-0">
        {sub === 'dashboard' && <DashboardPanel />}
        {sub === 'pixels' && <PixelsPanel cfg={cfg} patch={patch} saving={saving} />}
        {sub === 'capi' && <CapiPanel cfg={cfg} patch={patch} saving={saving} />}
        {sub === 'seo' && <OgPanel cfg={cfg} patch={patch} saving={saving} />}
        {sub === 'jsonld' && <JsonLdPanel cfg={cfg} patch={patch} saving={saving} />}
        {sub === 'aiSearch' && <AISearchPanel cfg={cfg} patch={patch} saving={saving} />}
        {sub === 'geo' && <GeoPanel cfg={cfg} patch={patch} saving={saving} />}
        {sub === 'utm' && <UtmPanel />}
        {sub === 'robots' && <RobotsPanel cfg={cfg} patch={patch} saving={saving} />}
        {sub === 'hreflang' && <HreflangPanel cfg={cfg} patch={patch} saving={saving} />}
        {sub === 'ab' && <AbPanel cfg={cfg} patch={patch} saving={saving} />}
        {sub === 'log' && <LogPanel />}
      </div>
    </div>
  );
}

function Field({ label, hint, children }: any) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-700 mb-1">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}
function Input(props: any) {
  return <input {...props} className={`border rounded-lg px-3 py-2 text-sm w-full ${props.className || ''}`} />;
}
function SaveBtn({ onClick, saving }: any) {
  return (
    <button onClick={onClick} disabled={saving}
      className="inline-flex items-center gap-1 bg-gray-900 text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50">
      <Save size={14} /> {saving ? 'Saving…' : 'Save'}
    </button>
  );
}
function Card({ title, desc, children }: any) {
  return (
    <div className="bg-white border rounded-2xl p-5 mb-4">
      {title && <h3 className="font-bold text-gray-900 mb-1">{title}</h3>}
      {desc && <p className="text-xs text-gray-500 mb-4">{desc}</p>}
      {children}
    </div>
  );
}

// ── Pixels & verification ────────────────────────────────────────────────
function PixelsPanel({ cfg, patch, saving }: any) {
  const [s, setS] = useState(cfg);
  useEffect(() => setS(cfg), [cfg]);
  const set = (k: string, v: any) => setS({ ...s, [k]: v });
  return (
    <>
      <Card title="Search engine verification" desc="Meta tags auto-injected sitewide for indexing">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Google Search Console" hint="Paste only the content value (the long token)"><Input value={s.gsc_verification || ''} onChange={(e: any) => set('gsc_verification', e.target.value)} placeholder="abc123…xyz" /></Field>
          <Field label="Bing Webmaster"><Input value={s.bing_verification || ''} onChange={(e: any) => set('bing_verification', e.target.value)} /></Field>
          <Field label="Pinterest domain"><Input value={s.pinterest_verification || ''} onChange={(e: any) => set('pinterest_verification', e.target.value)} /></Field>
          <Field label="Yandex"><Input value={s.yandex_verification || ''} onChange={(e: any) => set('yandex_verification', e.target.value)} /></Field>
        </div>
      </Card>
      <Card title="Extra pixels" desc="Pinterest, LinkedIn, X/Twitter, Reddit, Quora (FB/GA/TikTok/Snap already in env)">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Pinterest Tag ID"><Input value={s.pinterest_tag_id || ''} onChange={(e: any) => set('pinterest_tag_id', e.target.value)} placeholder="2612345678901" /></Field>
          <Field label="LinkedIn Partner ID"><Input value={s.linkedin_partner_id || ''} onChange={(e: any) => set('linkedin_partner_id', e.target.value)} placeholder="1234567" /></Field>
          <Field label="X/Twitter Pixel ID"><Input value={s.twitter_pixel_id || ''} onChange={(e: any) => set('twitter_pixel_id', e.target.value)} placeholder="o1234" /></Field>
          <Field label="Reddit Pixel"><Input value={s.reddit_pixel_id || ''} onChange={(e: any) => set('reddit_pixel_id', e.target.value)} /></Field>
          <Field label="Quora Pixel"><Input value={s.quora_pixel_id || ''} onChange={(e: any) => set('quora_pixel_id', e.target.value)} /></Field>
        </div>
        <div className="mt-4"><SaveBtn saving={saving} onClick={() => patch({
          gsc_verification: s.gsc_verification, bing_verification: s.bing_verification,
          pinterest_verification: s.pinterest_verification, yandex_verification: s.yandex_verification,
          pinterest_tag_id: s.pinterest_tag_id, linkedin_partner_id: s.linkedin_partner_id,
          twitter_pixel_id: s.twitter_pixel_id, reddit_pixel_id: s.reddit_pixel_id, quora_pixel_id: s.quora_pixel_id,
        })} /></div>
      </Card>
    </>
  );
}

function CapiPanel({ cfg, patch, saving }: any) {
  const [s, setS] = useState(cfg);
  useEffect(() => setS(cfg), [cfg]);
  const set = (k: string, v: any) => setS({ ...s, [k]: v });
  return (
    <>
      <Card title="Facebook Conversions API" desc="Server-side event sending — needed since iOS 14+. Get token from Events Manager → Settings → Generate access token.">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Pixel ID"><Input value={s.fb_capi_pixel_id || ''} onChange={(e: any) => set('fb_capi_pixel_id', e.target.value)} /></Field>
          <Field label="Test Event Code (optional)" hint="For Events Manager testing"><Input value={s.fb_capi_test_event_code || ''} onChange={(e: any) => set('fb_capi_test_event_code', e.target.value)} placeholder="TEST12345" /></Field>
          <Field label="Access Token" hint="Long-lived system user token"><Input type="password" value={s.fb_capi_access_token || ''} onChange={(e: any) => set('fb_capi_access_token', e.target.value)} /></Field>
        </div>
      </Card>
      <Card title="GA4 Measurement Protocol" desc="Server-side GA4 events. From GA4 → Admin → Data Streams → Measurement Protocol API secrets.">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Measurement ID"><Input value={s.ga4_measurement_id || ''} onChange={(e: any) => set('ga4_measurement_id', e.target.value)} placeholder="G-XXXXXXXXXX" /></Field>
          <Field label="API Secret"><Input type="password" value={s.ga4_api_secret || ''} onChange={(e: any) => set('ga4_api_secret', e.target.value)} /></Field>
        </div>
        <div className="mt-4"><SaveBtn saving={saving} onClick={() => patch({
          fb_capi_pixel_id: s.fb_capi_pixel_id, fb_capi_access_token: s.fb_capi_access_token, fb_capi_test_event_code: s.fb_capi_test_event_code,
          ga4_measurement_id: s.ga4_measurement_id, ga4_api_secret: s.ga4_api_secret,
        })} /></div>
        <p className="text-[11px] text-gray-500 mt-3">Conversions auto-fire on order paid/delivered events (Purchase). Trigger manually from order timeline if needed.</p>
      </Card>
    </>
  );
}

function OgPanel({ cfg, patch, saving }: any) {
  const [s, setS] = useState(cfg);
  useEffect(() => setS(cfg), [cfg]);
  const set = (k: string, v: any) => setS({ ...s, [k]: v });
  return (
    <Card title="Open Graph & Twitter Card defaults" desc="Sitewide fallback. Per-route head() overrides take priority.">
      <div className="grid grid-cols-2 gap-3">
        <Field label="og:site_name"><Input value={s.og_site_name || ''} onChange={(e: any) => set('og_site_name', e.target.value)} placeholder="NutroPact" /></Field>
        <Field label="Default OG image URL" hint="Used when a page has no specific image (1200x630 recommended)"><Input value={s.og_default_image || ''} onChange={(e: any) => set('og_default_image', e.target.value)} placeholder="https://…/share.jpg" /></Field>
        <Field label="X/Twitter handle"><Input value={s.twitter_site_handle || ''} onChange={(e: any) => set('twitter_site_handle', e.target.value)} placeholder="@nutropact" /></Field>
        <Field label="Twitter card type">
          <select value={s.twitter_card_type || 'summary_large_image'} onChange={(e) => set('twitter_card_type', e.target.value)} className="border rounded-lg px-3 py-2 text-sm w-full">
            <option value="summary">summary</option>
            <option value="summary_large_image">summary_large_image</option>
          </select>
        </Field>
      </div>
      <div className="mt-4"><SaveBtn saving={saving} onClick={() => patch({ og_site_name: s.og_site_name, og_default_image: s.og_default_image, twitter_site_handle: s.twitter_site_handle, twitter_card_type: s.twitter_card_type })} /></div>
    </Card>
  );
}

function JsonLdPanel({ cfg, patch, saving }: any) {
  const [s, setS] = useState(cfg);
  useEffect(() => setS(cfg), [cfg]);
  const set = (k: string, v: any) => setS({ ...s, [k]: v });
  const sameAs = Array.isArray(s.org_same_as) ? s.org_same_as : [];
  return (
    <Card title="Organization Schema.org JSON-LD" desc="Auto-emitted in root <head>. Drives rich snippets in Google.">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Legal name"><Input value={s.org_legal_name || ''} onChange={(e: any) => set('org_legal_name', e.target.value)} placeholder="NutroPact Pvt Ltd" /></Field>
        <Field label="Phone"><Input value={s.org_phone || ''} onChange={(e: any) => set('org_phone', e.target.value)} placeholder="+91-…" /></Field>
        <Field label="Address (JSON)" hint='{"streetAddress":"…","addressLocality":"…","postalCode":"…","addressCountry":"IN"}'>
          <textarea rows={4} value={JSON.stringify(s.org_address || {}, null, 2)} onChange={(e) => { try { set('org_address', JSON.parse(e.target.value)); } catch { } }} className="border rounded-lg px-3 py-2 text-xs font-mono w-full" />
        </Field>
        <Field label="Social profile URLs (sameAs)" hint="One URL per line">
          <textarea rows={4} value={sameAs.join('\n')} onChange={(e) => set('org_same_as', e.target.value.split('\n').map(x => x.trim()).filter(Boolean))} className="border rounded-lg px-3 py-2 text-xs font-mono w-full" />
        </Field>
      </div>
      <div className="mt-4"><SaveBtn saving={saving} onClick={() => patch({ org_legal_name: s.org_legal_name, org_phone: s.org_phone, org_address: s.org_address, org_same_as: s.org_same_as })} /></div>
      <p className="text-[11px] text-gray-500 mt-3">Product & Article schemas are auto-emitted from product/blog routes. FAQPage from /faq.</p>
    </Card>
  );
}

function RobotsPanel({ cfg, patch, saving }: any) {
  const [body, setBody] = useState(cfg.robots_txt || '');
  useEffect(() => setBody(cfg.robots_txt || ''), [cfg.robots_txt]);
  return (
    <Card title="robots.txt editor" desc="Served live at /robots.txt. Empty = built-in default.">
      <textarea rows={20} value={body} onChange={(e) => setBody(e.target.value)} className="border rounded-lg px-3 py-2 text-xs font-mono w-full" placeholder="User-agent: *&#10;Allow: /" />
      <div className="flex items-center justify-between mt-3">
        <a href="/robots.txt" target="_blank" rel="noreferrer" className="text-xs text-blue-600 inline-flex items-center gap-1"><ExternalLink size={12} /> View live</a>
        <SaveBtn saving={saving} onClick={() => patch({ robots_txt: body })} />
      </div>
    </Card>
  );
}

function HreflangPanel({ cfg, patch, saving }: any) {
  const [rows, setRows] = useState<any[]>(Array.isArray(cfg.hreflang) ? cfg.hreflang : []);
  return (
    <Card title="Hreflang (multi-region)" desc="Emitted as <link rel='alternate' hreflang='…' href='…'> sitewide.">
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input placeholder="lang (e.g. en-IN)" value={r.lang || ''} onChange={(e) => { const c = [...rows]; c[i] = { ...c[i], lang: e.target.value }; setRows(c); }} className="border rounded-lg px-3 py-2 text-sm w-40" />
            <input placeholder="https://…" value={r.url || ''} onChange={(e) => { const c = [...rows]; c[i] = { ...c[i], url: e.target.value }; setRows(c); }} className="border rounded-lg px-3 py-2 text-sm flex-1" />
            <button onClick={() => setRows(rows.filter((_, x) => x !== i))} className="text-red-500"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-3">
        <button onClick={() => setRows([...rows, { lang: '', url: '' }])} className="inline-flex items-center gap-1 border rounded-lg px-3 py-2 text-sm"><Plus size={14} /> Add</button>
        <SaveBtn saving={saving} onClick={() => patch({ hreflang: rows.filter(r => r.lang && r.url) })} />
      </div>
    </Card>
  );
}

function AbPanel({ cfg, patch, saving }: any) {
  const [rows, setRows] = useState<any[]>(Array.isArray(cfg.ab_experiments) ? cfg.ab_experiments : []);
  return (
    <Card title="A/B experiments" desc="Toggle experiments for the storefront. Each gets a key the components can read via window.__experiments.">
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="flex gap-2 items-center p-2 border rounded-lg">
            <input type="checkbox" checked={r.enabled || false} onChange={(e) => { const c = [...rows]; c[i] = { ...c[i], enabled: e.target.checked }; setRows(c); }} />
            <input placeholder="key (e.g. hero_v2)" value={r.key || ''} onChange={(e) => { const c = [...rows]; c[i] = { ...c[i], key: e.target.value }; setRows(c); }} className="border rounded-lg px-3 py-2 text-sm w-48" />
            <input placeholder="Variant split % (50)" type="number" value={r.split || 50} onChange={(e) => { const c = [...rows]; c[i] = { ...c[i], split: parseInt(e.target.value) || 50 }; setRows(c); }} className="border rounded-lg px-3 py-2 text-sm w-32" />
            <input placeholder="Notes" value={r.notes || ''} onChange={(e) => { const c = [...rows]; c[i] = { ...c[i], notes: e.target.value }; setRows(c); }} className="border rounded-lg px-3 py-2 text-sm flex-1" />
            <button onClick={() => setRows(rows.filter((_, x) => x !== i))} className="text-red-500"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-3">
        <button onClick={() => setRows([...rows, { key: '', enabled: false, split: 50 }])} className="inline-flex items-center gap-1 border rounded-lg px-3 py-2 text-sm"><Plus size={14} /> New experiment</button>
        <SaveBtn saving={saving} onClick={() => patch({ ab_experiments: rows.filter(r => r.key) })} />
      </div>
    </Card>
  );
}

// ── UTM ─────────────────────────────────────────────────────────────────
function UtmPanel() {
  const [items, setItems] = useState<any[]>([]);
  const [edit, setEdit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const list = useServerFn(listUtmCampaigns);
  const save = useServerFn(saveUtmCampaign);
  const del = useServerFn(deleteUtmCampaign);

  async function refresh() {
    setLoading(true);
    try { const r = await list(); setItems(r.items); } finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);

  function fullUrl(r: any) {
    if (!r.destination_url) return '';
    const u = new URL(r.destination_url.startsWith('http') ? r.destination_url : 'https://example.com' + (r.destination_url.startsWith('/') ? r.destination_url : '/' + r.destination_url));
    u.searchParams.set('utm_source', r.utm_source);
    u.searchParams.set('utm_medium', r.utm_medium);
    u.searchParams.set('utm_campaign', r.utm_campaign);
    if (r.utm_term) u.searchParams.set('utm_term', r.utm_term);
    if (r.utm_content) u.searchParams.set('utm_content', r.utm_content);
    return u.toString();
  }

  return (
    <>
      <Card title="UTM Campaign Builder" desc="Build trackable links + attribution.">
        <button onClick={() => setEdit({ name: '', destination_url: '/', utm_source: '', utm_medium: '', utm_campaign: '', channel: 'other' })} className="inline-flex items-center gap-1 bg-orange-500 text-white rounded-lg px-3 py-2 text-sm font-semibold"><Plus size={14} /> New link</button>
      </Card>
      <Card title={`Campaigns (${items.length})`}>
        {loading ? <p className="text-sm text-gray-500">Loading…</p> :
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-left text-gray-500">
              <tr><th className="p-2">Name</th><th>Channel</th><th>Source / Medium / Campaign</th><th className="text-right">Clicks</th><th className="text-right">Conv</th><th className="text-right">Rev</th><th className="text-right">ROAS</th><th></th></tr>
            </thead>
            <tbody className="divide-y">
              {items.map((r) => {
                const roas = r.spend > 0 ? (r.revenue / r.spend).toFixed(2) : '—';
                return (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="p-2 font-semibold">{r.name}</td>
                    <td>{r.channel}</td>
                    <td className="text-gray-600">{r.utm_source} / {r.utm_medium} / {r.utm_campaign}</td>
                    <td className="text-right font-mono">{r.clicks}</td>
                    <td className="text-right font-mono">{r.conversions}</td>
                    <td className="text-right font-mono">₹{Number(r.revenue || 0).toFixed(0)}</td>
                    <td className="text-right font-mono">{roas}</td>
                    <td className="text-right space-x-1">
                      <button onClick={() => { navigator.clipboard.writeText(fullUrl(r)); toast.success('Copied'); }} className="text-blue-600"><Copy size={12} /></button>
                      <button onClick={() => setEdit(r)} className="text-gray-700 underline text-xs">Edit</button>
                      <button onClick={async () => { if (confirm('Delete?')) { await del({ data: { id: r.id } }); refresh(); } }} className="text-red-500"><Trash2 size={12} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>}
      </Card>
      {edit && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center z-50 p-4" onClick={() => setEdit(null)}>
          <div className="bg-white rounded-2xl p-5 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold mb-3">{edit.id ? 'Edit' : 'New'} UTM campaign</h3>
            <div className="space-y-2 text-sm">
              <Input placeholder="Name" value={edit.name} onChange={(e: any) => setEdit({ ...edit, name: e.target.value })} />
              <Input placeholder="Destination URL or path" value={edit.destination_url} onChange={(e: any) => setEdit({ ...edit, destination_url: e.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="utm_source (google)" value={edit.utm_source} onChange={(e: any) => setEdit({ ...edit, utm_source: e.target.value })} />
                <Input placeholder="utm_medium (cpc)" value={edit.utm_medium} onChange={(e: any) => setEdit({ ...edit, utm_medium: e.target.value })} />
                <Input placeholder="utm_campaign (summer_sale)" value={edit.utm_campaign} onChange={(e: any) => setEdit({ ...edit, utm_campaign: e.target.value })} />
                <Input placeholder="utm_content (optional)" value={edit.utm_content || ''} onChange={(e: any) => setEdit({ ...edit, utm_content: e.target.value })} />
                <select value={edit.channel || 'other'} onChange={(e) => setEdit({ ...edit, channel: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
                  <option>google</option><option>facebook</option><option>instagram</option><option>email</option><option>sms</option><option>whatsapp</option><option>influencer</option><option>other</option>
                </select>
                <Input placeholder="Spend (₹)" type="number" value={edit.spend || 0} onChange={(e: any) => setEdit({ ...edit, spend: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button className="px-3 py-2 text-sm border rounded-lg" onClick={() => setEdit(null)}>Cancel</button>
              <button className="px-3 py-2 text-sm bg-gray-900 text-white rounded-lg" onClick={async () => {
                await save({ data: { id: edit.id, row: { name: edit.name, destination_url: edit.destination_url, utm_source: edit.utm_source, utm_medium: edit.utm_medium, utm_campaign: edit.utm_campaign, utm_term: edit.utm_term || '', utm_content: edit.utm_content || '', channel: edit.channel || 'other', spend: edit.spend || 0 } } });
                setEdit(null); refresh();
              }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Dashboard ───────────────────────────────────────────────────────────
function DashboardPanel() {
  const [d, setD] = useState<any>(null);
  const fn = useServerFn(getMarketingDashboard);
  useEffect(() => { fn().then(setD); }, []);
  if (!d) return <Card><p className="text-sm text-gray-500">Loading…</p></Card>;
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label="ROAS (30d)" value={d.roas > 0 ? d.roas.toFixed(2) + 'x' : '—'} />
        <Stat label="Revenue (tracked)" value={`₹${Number(d.totalRevenue).toLocaleString('en-IN')}`} />
        <Stat label="Spend (tracked)" value={`₹${Number(d.totalSpend).toLocaleString('en-IN')}`} />
        <Stat label="Conversions" value={d.totalConv} />
      </div>
      <Card title="Server-side events (last 30d)">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="FB CAPI" value={d.eventsByChannel.fb_capi || 0} />
          <Stat label="GA4 MP" value={d.eventsByChannel.ga4_mp || 0} />
          <Stat label="Total clicks" value={d.totalClicks} />
        </div>
      </Card>
      <Card title="Top campaigns by revenue">
        <table className="w-full text-xs">
          <thead className="text-left text-gray-500"><tr><th className="p-2">Name</th><th>Channel</th><th className="text-right">Clicks</th><th className="text-right">Conv</th><th className="text-right">Rev</th><th className="text-right">ROAS</th></tr></thead>
          <tbody className="divide-y">
            {[...d.campaigns].sort((a: any, b: any) => Number(b.revenue) - Number(a.revenue)).slice(0, 10).map((c: any) => (
              <tr key={c.id}><td className="p-2">{c.name}</td><td>{c.channel}</td><td className="text-right font-mono">{c.clicks}</td><td className="text-right font-mono">{c.conversions}</td><td className="text-right font-mono">₹{Number(c.revenue).toFixed(0)}</td><td className="text-right font-mono">{c.spend > 0 ? (Number(c.revenue) / Number(c.spend)).toFixed(2) : '—'}</td></tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
function Stat({ label, value }: any) {
  return <div className="bg-white border rounded-2xl p-4"><div className="text-xs text-gray-500">{label}</div><div className="text-2xl font-bold mt-1">{value}</div></div>;
}

function LogPanel() {
  const [items, setItems] = useState<any[]>([]);
  const fn = useServerFn(listConversionLog);
  useEffect(() => { fn().then(r => setItems(r.items)); }, []);
  return (
    <Card title={`Conversion log (last 100)`}>
      <div className="overflow-x-auto max-h-[600px]">
        <table className="w-full text-xs">
          <thead className="text-left text-gray-500 sticky top-0 bg-white"><tr><th className="p-2">When</th><th>Channel</th><th>Event</th><th>Order</th><th className="text-right">Value</th><th>Status</th></tr></thead>
          <tbody className="divide-y">
            {items.map(e => (
              <tr key={e.id}>
                <td className="p-2 text-gray-500">{new Date(e.created_at).toLocaleString('en-IN')}</td>
                <td>{e.channel}</td><td className="font-mono">{e.event_name}</td><td>{e.order_number || '—'}</td>
                <td className="text-right font-mono">₹{Number(e.value || 0).toFixed(0)}</td>
                <td><span className={`px-2 py-0.5 rounded text-[10px] ${e.status === 'sent' ? 'bg-green-100 text-green-700' : e.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-gray-100'}`}>{e.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ── AI Search (AEO / LLM / GEO) ──────────────────────────────────────────
function AISearchPanel({ cfg, patch, saving }: any) {
  const [s, setS] = useState(cfg);
  useEffect(() => setS(cfg), [cfg]);
  const set = (k: string, v: any) => setS({ ...s, [k]: v });
  const usps: string[] = Array.isArray(s.ai_usps) ? s.ai_usps : [];
  const facts: any[] = Array.isArray(s.ai_facts) ? s.ai_facts : [];
  const founder: any = s.ai_founder || {};
  const extras: any[] = Array.isArray(s.llms_extra_sections) ? s.llms_extra_sections : [];
  return (
    <>
      <Card title="Brand snapshot for AI" desc="Powers /llms.txt, /api/public/ai-context — what ChatGPT / Perplexity / Claude / Gemini read about your brand.">
        <div className="grid grid-cols-1 gap-3">
          <Field label="One-line brand description" hint="Used as the blockquote in llms.txt and tagline in ai-context.json">
            <Input value={s.ai_brand_description || ''} onChange={(e: any) => set('ai_brand_description', e.target.value)} placeholder="NutroPact is an India-based premium nutrition brand…" />
          </Field>
          <Field label="Mission statement" hint="Short paragraph — surfaced to AI assistants">
            <textarea rows={2} value={s.ai_mission || ''} onChange={(e) => set('ai_mission', e.target.value)} className="border rounded-lg px-3 py-2 text-sm w-full" placeholder="Make premium, lab-tested nutrition accessible to every Indian athlete." />
          </Field>
          <Field label="Unique selling points (one per line)" hint="Becomes 'differentiators' in ai-context + Brand pillars in llms.txt">
            <textarea rows={5} value={usps.join('\n')} onChange={(e) => set('ai_usps', e.target.value.split('\n').map(x => x.trim()).filter(Boolean))} className="border rounded-lg px-3 py-2 text-sm w-full" placeholder="Lab-tested authenticity with batch QR verification&#10;Transparent sourcing disclosures&#10;India-wide tracked shipping with COD" />
          </Field>
          <Field label="Custom intro paragraph for /llms.txt (optional)" hint="Plain markdown, inserted after the mission line">
            <textarea rows={4} value={s.llms_intro || ''} onChange={(e) => set('llms_intro', e.target.value)} className="border rounded-lg px-3 py-2 text-xs font-mono w-full" />
          </Field>
        </div>
        <div className="mt-4"><SaveBtn saving={saving} onClick={() => patch({ ai_brand_description: s.ai_brand_description, ai_mission: s.ai_mission, ai_usps: s.ai_usps, llms_intro: s.llms_intro })} /></div>
      </Card>

      <Card title="Key facts (Q&A) — answer-engine optimized" desc="Direct Q→A pairs that AI assistants quote verbatim. Surfaced in /llms.txt and ai-context.">
        <div className="space-y-2">
          {facts.map((f, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-start p-2 border rounded-lg">
              <input placeholder="Question (e.g. Is NutroPact whey lab-tested?)" value={f.question || ''}
                onChange={(e) => { const c = [...facts]; c[i] = { ...c[i], question: e.target.value }; set('ai_facts', c); }}
                className="col-span-5 border rounded-lg px-3 py-2 text-sm" />
              <input placeholder="Direct answer (1-2 sentences)" value={f.answer || ''}
                onChange={(e) => { const c = [...facts]; c[i] = { ...c[i], answer: e.target.value }; set('ai_facts', c); }}
                className="col-span-6 border rounded-lg px-3 py-2 text-sm" />
              <button onClick={() => set('ai_facts', facts.filter((_, x) => x !== i))} className="text-red-500 col-span-1 justify-self-end"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-3">
          <button onClick={() => set('ai_facts', [...facts, { question: '', answer: '' }])} className="inline-flex items-center gap-1 border rounded-lg px-3 py-2 text-sm"><Plus size={14} /> Add fact</button>
          <SaveBtn saving={saving} onClick={() => patch({ ai_facts: facts.filter(f => f.question && f.answer) })} />
        </div>
      </Card>

      <Card title="Founder / Person schema (EEAT)" desc="Adds Person JSON-LD sitewide — boosts trust and authorship signals for AI search.">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name"><Input value={founder.name || ''} onChange={(e: any) => set('ai_founder', { ...founder, name: e.target.value })} placeholder="Lokesh Sharma" /></Field>
          <Field label="Job title"><Input value={founder.title || ''} onChange={(e: any) => set('ai_founder', { ...founder, title: e.target.value })} placeholder="Founder & CEO" /></Field>
          <Field label="Bio (1-2 sentences)" hint="Surfaced in Person schema description">
            <textarea rows={3} value={founder.bio || ''} onChange={(e) => set('ai_founder', { ...founder, bio: e.target.value })} className="border rounded-lg px-3 py-2 text-sm w-full" />
          </Field>
          <Field label="Photo URL"><Input value={founder.image || ''} onChange={(e: any) => set('ai_founder', { ...founder, image: e.target.value })} placeholder="https://…/founder.jpg" /></Field>
          <Field label="Profile URLs (sameAs, one per line)" hint="LinkedIn, Twitter, Wikipedia, etc.">
            <textarea rows={3} value={Array.isArray(founder.same_as) ? founder.same_as.join('\n') : ''} onChange={(e) => set('ai_founder', { ...founder, same_as: e.target.value.split('\n').map(x => x.trim()).filter(Boolean) })} className="border rounded-lg px-3 py-2 text-xs font-mono w-full" />
          </Field>
        </div>
        <div className="mt-4"><SaveBtn saving={saving} onClick={() => patch({ ai_founder: s.ai_founder })} /></div>
      </Card>

      <Card title="/ai.txt — AI crawler policy" desc="Spec from spawning.ai. Declares what AI systems may do with your content.">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={s.ai_allow_training !== false} onChange={(e) => set('ai_allow_training', e.target.checked)} />
            Allow AI model training
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={s.ai_allow_inference !== false} onChange={(e) => set('ai_allow_inference', e.target.checked)} />
            Allow AI inference / live answers (recommended)
          </label>
        </div>
        <Field label="Custom /ai.txt body (optional — leave blank to auto-generate)" hint="Plain text, served at /ai.txt">
          <textarea rows={10} value={s.ai_policy_text || ''} onChange={(e) => set('ai_policy_text', e.target.value)} className="border rounded-lg px-3 py-2 text-xs font-mono w-full" placeholder="# Brand AI Usage Policy&#10;User-Agent: *&#10;Allow: training&#10;Allow: inference" />
        </Field>
        <div className="flex items-center justify-between mt-3">
          <a href="/ai.txt" target="_blank" rel="noreferrer" className="text-xs text-blue-600 inline-flex items-center gap-1"><ExternalLink size={12} /> View live /ai.txt</a>
          <SaveBtn saving={saving} onClick={() => patch({ ai_policy_text: s.ai_policy_text, ai_allow_training: s.ai_allow_training !== false, ai_allow_inference: s.ai_allow_inference !== false })} />
        </div>
      </Card>

      <Card title="Extra sections in /llms.txt" desc="Add custom H2 sections AI crawlers will index (e.g. press, awards, ingredient guides).">
        <div className="space-y-3">
          {extras.map((sec, si) => (
            <div key={si} className="p-3 border rounded-lg">
              <div className="flex gap-2 mb-2">
                <input placeholder="Section title (e.g. Press & Awards)" value={sec.title || ''}
                  onChange={(e) => { const c = [...extras]; c[si] = { ...c[si], title: e.target.value }; set('llms_extra_sections', c); }}
                  className="border rounded-lg px-3 py-2 text-sm flex-1" />
                <button onClick={() => set('llms_extra_sections', extras.filter((_, x) => x !== si))} className="text-red-500"><Trash2 size={14} /></button>
              </div>
              <div className="space-y-1 pl-3">
                {(sec.links || []).map((l: any, li: number) => (
                  <div key={li} className="flex gap-1">
                    <input placeholder="Title" value={l.title || ''} onChange={(e) => { const c = [...extras]; const links = [...(c[si].links || [])]; links[li] = { ...links[li], title: e.target.value }; c[si] = { ...c[si], links }; set('llms_extra_sections', c); }} className="border rounded-lg px-2 py-1 text-xs w-40" />
                    <input placeholder="/path or https://…" value={l.path || ''} onChange={(e) => { const c = [...extras]; const links = [...(c[si].links || [])]; links[li] = { ...links[li], path: e.target.value }; c[si] = { ...c[si], links }; set('llms_extra_sections', c); }} className="border rounded-lg px-2 py-1 text-xs w-56" />
                    <input placeholder="Description" value={l.description || ''} onChange={(e) => { const c = [...extras]; const links = [...(c[si].links || [])]; links[li] = { ...links[li], description: e.target.value }; c[si] = { ...c[si], links }; set('llms_extra_sections', c); }} className="border rounded-lg px-2 py-1 text-xs flex-1" />
                    <button onClick={() => { const c = [...extras]; c[si] = { ...c[si], links: (c[si].links || []).filter((_: any, x: number) => x !== li) }; set('llms_extra_sections', c); }} className="text-red-500 text-xs">×</button>
                  </div>
                ))}
                <button onClick={() => { const c = [...extras]; c[si] = { ...c[si], links: [...(c[si].links || []), { title: '', path: '', description: '' }] }; set('llms_extra_sections', c); }} className="text-xs text-blue-600 inline-flex items-center gap-1"><Plus size={10} /> Add link</button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-3">
          <button onClick={() => set('llms_extra_sections', [...extras, { title: '', links: [] }])} className="inline-flex items-center gap-1 border rounded-lg px-3 py-2 text-sm"><Plus size={14} /> Add section</button>
          <SaveBtn saving={saving} onClick={() => patch({ llms_extra_sections: extras.filter(x => x.title) })} />
        </div>
      </Card>

      <Card title="Live AI endpoints" desc="Verify what AI crawlers see — open in a new tab.">
        <div className="flex flex-wrap gap-2 text-xs">
          {[
            ['/llms.txt', 'LLM summary'],
            ['/llms-full.txt', 'Full LLM reference'],
            ['/ai.txt', 'AI policy'],
            ['/api/public/ai-context', 'AI Context JSON'],
            ['/answers', 'Q&A hub'],
            ['/rss.xml', 'RSS feed'],
            ['/sitemap.xml', 'Sitemap'],
            ['/robots.txt', 'robots.txt'],
          ].map(([href, label]) => (
            <a key={href} href={href} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 border rounded-lg px-3 py-1.5 hover:bg-gray-50">
              <ExternalLink size={11} /> {label}
            </a>
          ))}
        </div>
      </Card>
    </>
  );
}

// ── GEO / local SEO ─────────────────────────────────────────────────────
function GeoPanel({ cfg, patch, saving }: any) {
  const [s, setS] = useState(cfg);
  useEffect(() => setS(cfg), [cfg]);
  const set = (k: string, v: any) => setS({ ...s, [k]: v });
  const areas: string[] = Array.isArray(s.geo_service_areas) ? s.geo_service_areas : [];
  const hours: string[] = Array.isArray(s.org_opening_hours) ? s.org_opening_hours : [];
  return (
    <>
      <Card title="Geographic coordinates" desc="Adds geo coordinates to Store schema. Helps Google Maps + local AI answers.">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Latitude" hint="e.g. 26.9124"><Input type="number" step="any" value={s.geo_latitude ?? ''} onChange={(e: any) => set('geo_latitude', e.target.value === '' ? null : Number(e.target.value))} /></Field>
          <Field label="Longitude" hint="e.g. 75.7873"><Input type="number" step="any" value={s.geo_longitude ?? ''} onChange={(e: any) => set('geo_longitude', e.target.value === '' ? null : Number(e.target.value))} /></Field>
          <Field label="Price range" hint="$, $$, $$$ or ₹, ₹₹, ₹₹₹"><Input value={s.geo_price_range || ''} onChange={(e: any) => set('geo_price_range', e.target.value)} placeholder="₹₹" /></Field>
        </div>
      </Card>

      <Card title="Service areas" desc="Cities / regions you serve — added to Store schema 'areaServed' for local AI search.">
        <Field label="One city per line">
          <textarea rows={8} value={areas.join('\n')} onChange={(e) => set('geo_service_areas', e.target.value.split('\n').map(x => x.trim()).filter(Boolean))} className="border rounded-lg px-3 py-2 text-sm w-full" placeholder="Mumbai&#10;Delhi&#10;Bengaluru&#10;Jaipur&#10;Hyderabad" />
        </Field>
      </Card>

      <Card title="Opening hours" desc="Schema.org format. One per line: e.g. 'Mo-Sa 09:00-19:00' or 'Su 10:00-14:00'.">
        <textarea rows={4} value={hours.join('\n')} onChange={(e) => set('org_opening_hours', e.target.value.split('\n').map(x => x.trim()).filter(Boolean))} className="border rounded-lg px-3 py-2 text-xs font-mono w-full" placeholder="Mo-Sa 09:00-19:00" />
      </Card>

      <div className="text-right"><SaveBtn saving={saving} onClick={() => patch({ geo_latitude: s.geo_latitude, geo_longitude: s.geo_longitude, geo_price_range: s.geo_price_range, geo_service_areas: s.geo_service_areas, org_opening_hours: s.org_opening_hours })} /></div>
    </>
  );
}
