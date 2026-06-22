import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { ShieldCheck, ShieldAlert, MapPin, TrendingDown, Loader2 } from 'lucide-react';
import { counterfeitHeatmap } from '@/lib/product-auth.functions';

export const Route = createFileRoute('/verify/heatmap')({
  head: () => ({
    meta: [
      { title: 'Counterfeit Heatmap — NutroPact ProofPack' },
      { name: 'description', content: 'Public transparency: where counterfeit NutroPact products have been detected in the last 90 days.' },
    ],
  }),
  component: HeatmapPage,
});

function HeatmapPage() {
  const fetchMap = useServerFn(counterfeitHeatmap);
  const [data, setData] = useState<any>(null);

  useEffect(() => { fetchMap().then(setData); }, [fetchMap]);

  if (!data) return (
    <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-orange-500" /></div>
  );

  const maxRejected = Math.max(1, ...data.cities.map((c: any) => c.rejected));

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <ShieldCheck className="text-orange-500" size={32} />
          <div>
            <h1 className="text-2xl md:text-3xl font-black">Counterfeit Transparency Map</h1>
            <p className="text-sm text-gray-500">Last 90 days · publicly viewable for trust</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-2xl p-4 border">
            <p className="text-xs text-gray-500 font-semibold">Authentic scans</p>
            <p className="text-2xl font-black text-green-600 mt-1">{data.totalAccepted.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border">
            <p className="text-xs text-gray-500 font-semibold">Counterfeit attempts</p>
            <p className="text-2xl font-black text-red-600 mt-1">{data.totalRejected.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border col-span-2 md:col-span-1">
            <p className="text-xs text-gray-500 font-semibold">Authentic rate</p>
            <p className="text-2xl font-black text-orange-600 mt-1">
              {data.totalAccepted + data.totalRejected === 0 ? '—' :
                Math.round(data.totalAccepted / (data.totalAccepted + data.totalRejected) * 100) + '%'}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border">
          <h2 className="font-black text-lg mb-3 flex items-center gap-2">
            <TrendingDown className="text-red-500" size={20} /> Top counterfeit hotspots
          </h2>
          {data.cities.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No data yet.</p>
          ) : (
            <ul className="space-y-2">
              {data.cities.map((c: any, i: number) => (
                <li key={i} className="flex items-center gap-3">
                  <MapPin size={16} className="text-gray-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{c.city} <span className="text-xs text-gray-500 font-normal">· {c.country}</span></p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-red-500 h-full" style={{ width: `${(c.rejected / maxRejected) * 100}%` }} />
                      </div>
                      <span className="text-xs font-bold text-red-600 w-10 text-right">{c.rejected}</span>
                    </div>
                  </div>
                  {c.accepted > 0 && (
                    <span className="text-[10px] text-green-600 font-bold">+{c.accepted} ok</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-orange-100 border border-orange-200 rounded-2xl p-4 mt-6 text-sm">
          <p className="font-bold text-orange-900 flex items-center gap-2"><ShieldAlert size={16} /> Spotted a fake?</p>
          <p className="text-orange-800 text-xs mt-1">Verify your product code at <b>/verify</b> and report counterfeits to earn ₹500 wallet bounty + free product.</p>
        </div>

        <p className="text-[10px] text-gray-400 text-center mt-6">ProofPack™ public ledger · NutroPact</p>
      </div>
    </div>
  );
}
