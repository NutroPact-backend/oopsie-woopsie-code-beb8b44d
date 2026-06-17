// @ts-nocheck
import { useSettings } from '@/lib/useSettings';
import { T, useContentT } from '@/lib/useContentT';

const DEFAULT_PRIVACY = `Last updated: ${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}

NutroPact ("we", "us", "our") respects your privacy and is committed to protecting your personal data in compliance with the Digital Personal Data Protection Act, 2023 (India) and applicable global standards (including GDPR where relevant).

1. INFORMATION WE COLLECT
• Account data: name, email, phone, hashed password, addresses.
• Order data: items purchased, shipping address, billing details, order history.
• Payment data: handled by PCI-DSS compliant gateways (Razorpay, PhonePe). We never store full card numbers or CVV.
• Wallet data ("NutroPay"): wallet balance, top-ups, transaction history.
• Usage data: pages visited, device, IP address, cookies (consent-based).
• Communications: messages you send via contact forms, WhatsApp, or email.

2. WHY WE COLLECT IT
• To process and deliver your orders.
• To provide customer support and respond to enquiries.
• To maintain wallet, loyalty, and referral programmes.
• To detect fraud, counterfeit products, and abuse.
• To send transactional and (with consent) marketing communications.
• To comply with tax, GST, and regulatory obligations.

3. LEGAL BASIS
We process data on the basis of: (a) your consent, (b) performance of a contract (your order), (c) legal obligation (tax, GST), and (d) our legitimate interest in operating a secure storefront.

4. SHARING
We share data only with: payment gateways, shipping partners (Delhivery, Shiprocket, etc.), SMS/email/WhatsApp providers, analytics providers (where consent is given), and government authorities when legally required. We never sell your personal data.

5. RETENTION
Order and tax records: 8 years (statutory). Account data: until you delete your account. Marketing data: until you opt out. Cookies: as set in our cookie consent banner.

6. YOUR RIGHTS (DPDP Act 2023)
You have the right to: access your data, correct inaccuracies, erase your data, withdraw consent, port your data to another service, and lodge a grievance. To exercise any of these, email info@nutropact.com.

7. SECURITY
We use HTTPS everywhere, encryption at rest, row-level access control on our database, TOTP-based MFA for admin accounts, and rate-limited login endpoints. No system is 100% secure — please use a strong, unique password.

8. COOKIES
Strictly necessary cookies are always on (cart, session, security). Analytics and marketing cookies fire only after you click "Accept" on our consent banner.

9. CHILDREN
Our products are not directed at children under 18. We do not knowingly collect data from minors.

10. CHANGES
We may update this policy. Material changes will be announced on this page and (where you have an account) by email.

11. GRIEVANCE OFFICER
Per the DPDP Act, our Grievance Officer can be reached at info@nutropact.com or +91-8955590350 (Mon–Sat, 11 AM – 6 PM IST).

12. CONTACT
NutroPact, India.
Email: info@nutropact.com
Phone: +91-8955590350`;

export default function PrivacyPage() {
  const { settings } = useSettings();
  const page = settings?.privacyPage;
  const title = page?.title || 'PRIVACY POLICY';
  const content = page?.content || DEFAULT_PRIVACY;
  const tContent = useContentT('page_block', 'privacy', 'content', content);
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-black mb-8"><T>{title}</T></h1>
      <div className="prose max-w-none text-gray-600 leading-relaxed whitespace-pre-wrap">
        {tContent}
      </div>
    </div>
  );
}
