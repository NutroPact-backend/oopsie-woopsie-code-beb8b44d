import { useSettings } from '@/lib/useSettings';

export default function TermsPage() {
  const { settings } = useSettings();
  const page = settings?.termsPage;
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-black mb-8">{page?.title || 'TERMS OF SERVICE'}</h1>
      <div className="prose max-w-none text-gray-600 leading-relaxed whitespace-pre-wrap">
        {page?.content || 'Terms of service content will be added soon.'}
      </div>
    </div>
  );
}
