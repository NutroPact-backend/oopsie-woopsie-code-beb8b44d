// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { ShieldCheck, Printer, Download, Loader2 } from 'lucide-react';
import { getCertificate } from '@/lib/product-auth.functions';

export const Route = createFileRoute('/verify/$code/certificate')({
  head: ({ params }) => ({
    meta: [
      { title: `Certificate ${params.code} — NutroPact` },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: CertificatePage,
});

function CertificatePage() {
  const { code } = Route.useParams();
  const fetchCert = useServerFn(getCertificate);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCert({ data: { fullCode: code } }).then((r) => { setData(r); setLoading(false); });
  }, [code, fetchCert]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-orange-500" size={32} /></div>;
  }
  if (!data?.ok) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white border-2 border-red-300 rounded-2xl p-6 max-w-md text-center">
          <p className="font-black text-red-700">Certificate unavailable</p>
          <p className="text-sm text-gray-600 mt-2">{data?.reason || 'Unknown'} — this code cannot generate a certificate.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 print:p-0 print:bg-white">
      <div className="max-w-2xl mx-auto print:max-w-full">
        <div className="flex gap-2 mb-4 print:hidden">
          <button onClick={() => window.print()} className="flex-1 bg-orange-500 text-white font-bold rounded-full py-2.5 text-sm flex items-center justify-center gap-2">
            <Printer size={16} /> Print
          </button>
          <a href={`/verify/${code}`} className="flex-1 bg-white border-2 border-gray-300 font-bold rounded-full py-2.5 text-sm text-center">Back</a>
        </div>

        <div className="bg-white border-4 border-double border-orange-500 rounded-2xl p-8 print:border-2 print:rounded-none relative overflow-hidden">
          {/* Watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04]">
            <ShieldCheck size={400} />
          </div>

          <div className="relative">
            <div className="text-center mb-6">
              <ShieldCheck className="mx-auto text-orange-500 mb-2" size={48} />
              <p className="text-[10px] tracking-[0.3em] font-bold text-gray-500">PROOFPACK™ AUTHENTICITY</p>
              <h1 className="text-3xl font-black mt-1">Certificate of Genuine Product</h1>
              <p className="text-xs text-gray-500 mt-1">Issued by NutroPact India</p>
            </div>

            {data.productImage && (
              <div className="flex justify-center mb-4">
                <img src={data.productImage} alt={data.productName || ''} width={120} height={120} loading="lazy" className="w-24 h-24 object-cover rounded-lg border" />
              </div>
            )}

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4 text-center">
              <p className="text-xs text-gray-600">This certifies that</p>
              <p className="text-xl font-black text-gray-900 mt-1">{data.productName || 'NutroPact Product'}</p>
              <p className="text-[10px] text-gray-500 mt-1">Batch <b>{data.batch}</b> · Code <b>{data.code}</b></p>
            </div>

            <dl className="grid grid-cols-2 gap-3 text-xs mb-4">
              {data.ownerName && (
                <>
                  <dt className="text-gray-500">Registered owner</dt>
                  <dd className="font-bold text-right">{data.ownerName}</dd>
                </>
              )}
              {data.registeredAt && (
                <>
                  <dt className="text-gray-500">Registered on</dt>
                  <dd className="font-bold text-right">{new Date(data.registeredAt).toLocaleDateString()}</dd>
                </>
              )}
              {data.warrantyUntil && (
                <>
                  <dt className="text-gray-500">Warranty until</dt>
                  <dd className="font-bold text-right text-green-700">{new Date(data.warrantyUntil).toLocaleDateString()}</dd>
                </>
              )}
              {data.manufacturedAt && (
                <>
                  <dt className="text-gray-500">Manufactured</dt>
                  <dd className="font-bold text-right">{new Date(data.manufacturedAt).toLocaleDateString()}</dd>
                </>
              )}
              {data.firstScanAt && (
                <>
                  <dt className="text-gray-500">First verified</dt>
                  <dd className="font-bold text-right">{new Date(data.firstScanAt).toLocaleDateString()} {data.firstScanCity ? `· ${data.firstScanCity}` : ''}</dd>
                </>
              )}
              <dt className="text-gray-500">Status</dt>
              <dd className="font-bold text-right capitalize text-green-700">{data.status}</dd>
            </dl>

            <div className="border-t border-dashed border-gray-300 pt-4 mt-6 text-center">
              <p className="text-[10px] text-gray-500">Verify at any time at</p>
              <p className="text-xs font-mono font-bold mt-0.5">nutropact.com/verify/{code}</p>
              <p className="text-[10px] text-gray-400 mt-3">
                Protected by ProofPack™ — HMAC-SHA256 signed · AI seal vision · Geo-fence · Bulk-clone detection
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
