import { createFileRoute, Link } from '@tanstack/react-router';
import SavedAddresses from '@/components/SavedAddresses';
import { useAuthStore } from '@/store/authStore';
import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { MapPin, ArrowLeft } from 'lucide-react';

function AddressesPage() {
  const { user, ready } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (ready && !user) navigate({ to: '/login', search: { redirect: '/account/addresses' } as any });
  }, [ready, user, navigate]);

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link to="/account" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-4">
        <ArrowLeft size={14} /> Back to account
      </Link>
      <h1 className="text-2xl font-black mb-2 flex items-center gap-2"><MapPin size={22} /> Saved addresses</h1>
      <p className="text-sm text-gray-500 mb-6">Add, edit or delete your delivery addresses. Default address auto-fills at checkout.</p>
      <SavedAddresses mode="manage" />
    </div>
  );
}

export const Route = createFileRoute('/account/addresses')({
  head: () => ({
    meta: [
      { title: 'Saved Addresses — NutroPact' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: AddressesPage,
});
