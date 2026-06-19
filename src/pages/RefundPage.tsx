// @ts-nocheck
import { useSettings } from '@/lib/useSettings';

// GEO-004: real default refund policy so the page is never a placeholder
// even before an admin populates `settings.refundPage.content`.
const DEFAULT_REFUND = `NutroPact accepts returns within 7 days of delivery on unopened, unused products in their original sealed packaging.

How to request a refund:
1. Email info@nutropact.com from your registered address with the order ID and reason for return.
2. Our team confirms eligibility within 24 hours and shares a return shipping label.
3. Once we receive and inspect the item, the refund is initiated within 2 business days.

Refund timelines:
- UPI / wallet: 1–3 business days.
- Card / netbanking: 5–7 business days.
- NutroPay wallet credit: instant.

Non-returnable items:
- Products with broken seals or signs of use.
- Free gifts, samples, and promotional bundles.
- Items returned after the 7-day window.

Damaged or wrong items received? Email info@nutropact.com with photos within 48 hours of delivery and we will arrange a free replacement or full refund.`;

export default function RefundPage() {
  const { settings } = useSettings();
  const page = settings?.refundPage;
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-black mb-8">{page?.title || 'REFUND POLICY'}</h1>
      <div className="prose max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
        {page?.content || DEFAULT_REFUND}
      </div>
    </div>
  );
}
