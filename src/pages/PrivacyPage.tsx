import { useSettings } from '@/lib/useSettings';

export default function PrivacyPage() {
  const { settings } = useSettings();
  const page = settings?.privacyPage;
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-black mb-8">{page?.title || 'PRIVACY POLICY'}</h1>
      <div className="prose max-w-none text-gray-600 leading-relaxed whitespace-pre-wrap">
        {page?.content || 'Privacy policy content will be added soon.'}
      </div>
    </div>
  );
}
