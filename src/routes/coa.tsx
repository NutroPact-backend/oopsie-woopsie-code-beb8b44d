// @ts-nocheck
import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { FileText, Search, ShieldCheck, ExternalLink } from 'lucide-react';
import { useSEO } from '@/lib/useSEO';

export const Route = createFileRoute('/coa')({
  validateSearch: (s: Record<string, unknown>) => ({
    batch: typeof s.batch === 'string' ? s.batch : undefined,
  }),
  component: CoaPage,
});

function CoaPage() {
  const { batch: initial } = useSearch({ from: '/coa' });
  const navigate = useNavigate({ from: '/coa' });
  const [batch, setBatch] = useState(initial || '');

  useSEO({
    title: 'Certificate of Analysis (CoA) Lookup',
    description:
      'Look up the lab Certificate of Analysis (CoA) for your NutroPact product batch. Every batch is tested at NABL / FSSAI-accredited labs.',
  });

  useEffect(() => {
    if (initial) setBatch(initial);
  }, [initial]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = batch.trim();
    if (!v) return;
    navigate({ search: { batch: v } });
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-orange-100 mx-auto flex items-center justify-center mb-4">
          <ShieldCheck className="text-orange-500" size={26} />
        </div>
        <h1 className="text-3xl font-black mb-2">Certificate of Analysis</h1>
        <p className="text-gray-500">
          Enter the batch number printed on your tub to download the lab CoA PDF.
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex gap-3 mb-8">
        <input
          value={batch}
          onChange={(e) => setBatch(e.target.value)}
          placeholder="Batch number (e.g. NP-2025-04-A12)"
          className="flex-1 border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500 transition"
          required
        />
        <button
          type="submit"
          className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-bold inline-flex items-center gap-2"
        >
          <Search size={16} /> Find
        </button>
      </form>

      {initial ? (
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-3">
            <FileText className="text-orange-500" />
            <div>
              <div className="text-xs text-gray-500">Batch number</div>
              <div className="font-mono font-bold">{initial}</div>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            We're preparing your CoA. If a PDF is not visible below, email{' '}
            <a href="mailto:info@nutropact.com" className="text-orange-600 font-bold">
              info@nutropact.com
            </a>{' '}
            with your batch number and we'll send it within 24 hours.
          </p>
          <a
            href={`mailto:info@nutropact.com?subject=${encodeURIComponent(
              `CoA request — batch ${initial}`,
            )}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-bold"
          >
            Request CoA by email <ExternalLink size={14} />
          </a>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-2xl p-6 text-sm text-gray-600 space-y-2">
          <p className="font-bold text-gray-900">Where is my batch number?</p>
          <p>
            Look at the bottom or side of your NutroPact tub. The batch code is printed
            next to the manufacturing date — usually in the format{' '}
            <span className="font-mono">NP-YYYY-MM-XX</span>.
          </p>
          <p>
            Every NutroPact batch is tested for protein content, heavy metals, microbial
            limits, and banned substances at NABL / FSSAI-accredited laboratories.
          </p>
        </div>
      )}
    </div>
  );
}