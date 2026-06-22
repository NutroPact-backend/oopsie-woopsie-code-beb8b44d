import { useSettings } from '@/lib/useSettings';
import { T } from '@/lib/useContentT';
import { useContentT } from '@/lib/useContentT';

const DEFAULT_TERMS = `Last updated: ${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}

By accessing or using nutropact.com ("the Site") you agree to these Terms of Service. If you do not agree, please do not use the Site.

1. ACCOUNTS
You must be 18+ to create an account. You are responsible for the confidentiality of your password and for all activity under your account. Notify us immediately of any unauthorised access.

2. PRODUCTS & PRICING
All products are subject to availability. Prices include GST unless stated otherwise. We may correct pricing errors at any time prior to dispatch. Product images are representative; actual packaging may vary.

3. ORDERS
An order is a binding offer once payment is received. We reserve the right to refuse or cancel any order (e.g. suspected fraud, stock issues, pricing error) and will refund in full if cancellation occurs after payment.

4. PAYMENTS
Payments are processed by PCI-DSS compliant gateways (Razorpay, PhonePe, UPI). We do not store full card numbers or CVV. Wallet ("NutroPay") credits are non-transferable and may carry an expiry.

5. SHIPPING
Shipping timelines, charges, and serviceable pin codes are listed on the Shipping page. Risk passes to you upon delivery to the address you specified.

6. RETURNS & REFUNDS
Eligible returns are accepted within 7 days of delivery for unopened, unused products. See the Refund page for the full process. Refunds are credited to the original payment method or your NutroPay wallet within 5–7 business days.

7. AUTHENTICITY & COUNTERFEIT
Every NutroPact product carries a ProofPack code. We reserve the right to refuse refund or replacement for products that fail authenticity verification.

8. ACCEPTABLE USE
You may not: reverse-engineer the Site, scrape data, bypass rate limits, submit fraudulent reviews, abuse coupon or referral systems, or use the Site for any unlawful purpose.

9. INTELLECTUAL PROPERTY
All content, logos, product photography, and trademarks on the Site are owned by NutroPact or used under licence. You may not reproduce them without written permission.

10. DISCLAIMER
Dietary supplements are not medicines and are not intended to diagnose, treat, cure or prevent any disease. Consult a qualified healthcare professional before use, especially if pregnant, breastfeeding, or on medication.

11. LIMITATION OF LIABILITY
To the maximum extent permitted by law, NutroPact's total liability for any claim is limited to the amount you paid for the product in question. We are not liable for indirect, consequential, or incidental damages.

12. GOVERNING LAW
These Terms are governed by the laws of India. Disputes are subject to the exclusive jurisdiction of the courts at our registered office.

13. CHANGES
We may amend these Terms at any time. The "Last updated" date above reflects the most recent revision. Continued use of the Site after changes constitutes acceptance.

14. CONTACT
Email: info@nutropact.com
Phone: +91-8955590350 (Mon–Sat, 11 AM – 6 PM IST)`;

export default function TermsPage() {
  const { settings } = useSettings();
  const page = settings?.termsPage;
  const title = page?.title || 'TERMS OF SERVICE';
  const content = page?.content || DEFAULT_TERMS;
  const tContent = useContentT('page_block', 'terms', 'content', content);
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-black mb-8"><T>{title}</T></h1>
      <div className="prose max-w-none text-gray-600 leading-relaxed whitespace-pre-wrap">
        {tContent}
      </div>
    </div>
  );
}
