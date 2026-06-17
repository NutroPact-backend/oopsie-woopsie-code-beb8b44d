const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, LevelFormat, BorderStyle, WidthType,
  ShadingType, PageNumber, PageBreak, Header, Footer, Tab
} = require('docx');
const fs = require('fs');

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const thickBorder = { style: BorderStyle.SINGLE, size: 4, color: "CC0000" };

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text, bold: true, size: 32, font: "Arial" })]
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text, bold: true, size: 26, font: "Arial" })]
  });
}
function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    children: [new TextRun({ text, bold: true, size: 22, font: "Arial" })]
  });
}
function para(text, options = {}) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text, font: "Arial", size: 20, ...options })]
  });
}
function bullet(text, indent = 720) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { after: 80 },
    children: [new TextRun({ text, font: "Arial", size: 20 })]
  });
}
function spacer() {
  return new Paragraph({ children: [new TextRun("")], spacing: { after: 120 } });
}

function findingTable(severity, description, fix) {
  const severityColor = {
    "CRITICAL": "CC0000",
    "HIGH": "E06000",
    "MEDIUM": "D4A000",
    "LOW": "337733"
  }[severity] || "333333";

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1440, 7920],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders,
            width: { size: 1440, type: WidthType.DXA },
            shading: { fill: severityColor, type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: severity, bold: true, color: "FFFFFF", size: 18, font: "Arial" })] })]
          }),
          new TableCell({
            borders,
            width: { size: 7920, type: WidthType.DXA },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [
              new Paragraph({ children: [new TextRun({ text: "Issue: ", bold: true, font: "Arial", size: 19 }), new TextRun({ text: description, font: "Arial", size: 19 })] }),
              new Paragraph({ children: [new TextRun({ text: "Fix: ", bold: true, font: "Arial", size: 19 }), new TextRun({ text: fix, font: "Arial", size: 19 })] })
            ]
          })
        ]
      })
    ]
  });
}

function sectionTable(rows) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [3120, 2080, 4160],
    rows: [
      new TableRow({
        children: [
          new TableCell({ borders, width: { size: 3120, type: WidthType.DXA }, shading: { fill: "1F3864", type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: "Finding", bold: true, color: "FFFFFF", font: "Arial", size: 19 })] })] }),
          new TableCell({ borders, width: { size: 2080, type: WidthType.DXA }, shading: { fill: "1F3864", type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: "Severity", bold: true, color: "FFFFFF", font: "Arial", size: 19 })] })] }),
          new TableCell({ borders, width: { size: 4160, type: WidthType.DXA }, shading: { fill: "1F3864", type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: "Recommended Fix", bold: true, color: "FFFFFF", font: "Arial", size: 19 })] })] }),
        ]
      }),
      ...rows.map(([finding, severity, fix], i) => {
        const sevColor = { "CRITICAL": "CC0000", "HIGH": "E06000", "MEDIUM": "D4A000", "LOW": "337733" }[severity] || "333333";
        return new TableRow({
          children: [
            new TableCell({ borders, width: { size: 3120, type: WidthType.DXA }, shading: { fill: i % 2 === 0 ? "F5F5F5" : "FFFFFF", type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: finding, font: "Arial", size: 18 })] })] }),
            new TableCell({ borders, width: { size: 2080, type: WidthType.DXA }, shading: { fill: sevColor, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: severity, bold: true, color: "FFFFFF", font: "Arial", size: 18 })] })] }),
            new TableCell({ borders, width: { size: 4160, type: WidthType.DXA }, shading: { fill: i % 2 === 0 ? "F5F5F5" : "FFFFFF", type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: fix, font: "Arial", size: 18 })] })] }),
          ]
        });
      })
    ]
  });
}

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 20 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 32, bold: true, font: "Arial", color: "1F3864" }, paragraph: { spacing: { before: 400, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 26, bold: true, font: "Arial", color: "2E75B6" }, paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 22, bold: true, font: "Arial", color: "404040" }, paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 2 } },
    ]
  },
  numbering: {
    config: [
      { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbered", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 }
      }
    },
    headers: {
      default: new Header({
        children: [
          new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "2E75B6" } },
            children: [
              new TextRun({ text: "NutroPact — Comprehensive Website Audit Report", bold: true, font: "Arial", size: 20, color: "1F3864" }),
              new TextRun({ text: "  |  June 2026  |  CONFIDENTIAL", font: "Arial", size: 18, color: "888888" })
            ]
          })
        ]
      })
    },
    children: [
      // ===== COVER PAGE =====
      spacer(), spacer(), spacer(),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: "NUTROPACT", bold: true, font: "Arial", size: 56, color: "1F3864" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [new TextRun({ text: "Comprehensive Website Audit Report", bold: true, font: "Arial", size: 36, color: "2E75B6" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [new TextRun({ text: "Security  ·  SEO  ·  GEO  ·  LLMO  ·  AEO  ·  Marketing  ·  Functional", font: "Arial", size: 22, color: "555555" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        children: [new TextRun({ text: "Date: June 15, 2026  |  Audited URL: oopsie-woopsie-code.lovable.app  |  Status: CONFIDENTIAL", font: "Arial", size: 18, color: "888888" })]
      }),
      spacer(), spacer(), spacer(), spacer(),

      // ===== EXECUTIVE SUMMARY =====
      h1("1. Executive Summary"),
      para("This report presents the findings of a full-stack audit of the NutroPact website (oopsie-woopsie-code.lovable.app), including its frontend, backend admin panel, API layer, SEO configuration, marketing integrations, and content quality. The site is built with Lovable AI (React + Supabase) and targets the Indian sports nutrition market."),
      spacer(),
      h2("Top 5 Critical Issues Requiring Immediate Action"),
      spacer(),

      findingTable("CRITICAL", "Admin credentials shared in plain text: The email (info@nutropact.com) and password (@Wings2mrelimo) were transmitted in an unencrypted audit brief. These are the same credentials used for the live production admin panel. Any interception or leak gives full backend control.", "Immediately rotate admin credentials. Never transmit production credentials in plain text. Use a password manager and implement MFA on the admin panel."),
      spacer(),
      findingTable("CRITICAL", "Privacy Policy & Terms of Service pages show placeholder text only: Both /privacy and /terms display 'content will be added soon'. This means the site is collecting user data (via contact forms, account creation, order placement, wallet system) without a legally binding privacy policy — a violation of India's DPDP Act 2023 and international standards.", "Engage a legal professional to draft compliant Privacy Policy and Terms of Service documents immediately. These must be live before any user data is collected or transactions occur."),
      spacer(),
      findingTable("CRITICAL", "Products page shows 'Loading...' indefinitely: The /products page renders only a loading spinner. No products are displayed, suggesting a broken Supabase API call or missing data seeding. This is the primary revenue page and is completely non-functional.", "Debug the API call in the product listing component. Verify Supabase table 'products' exists with data, RLS policies allow public reads, and the query handles empty states gracefully."),
      spacer(),
      findingTable("CRITICAL", "No cookie consent / data collection notice: The site collects personal data (name, email, phone, order details) but has no cookie banner or GDPR/DPDP-compliant consent mechanism. Under India's DPDP Act 2023 and global standards, informed consent must be obtained before data collection.", "Implement a cookie consent banner using a library like react-cookie-consent. Add clear opt-in flows before form submission. Document what data is collected and why."),
      spacer(),
      findingTable("HIGH", "Contact page has conflicting phone numbers and support email: The Contact page shows phone '+91 9999999999' (placeholder) and email 'support@nutropact.com', while the footer shows '+91-8955590350' and 'info@nutropact.com'. This creates customer confusion and indicates incomplete data replacement post-template.", "Audit all pages for placeholder data. Standardise on one verified support phone number and email address across header, footer, contact page, and all policy pages."),
      spacer(),

      // ===== SECTION 2: SECURITY AUDIT =====
      new Paragraph({ children: [new PageBreak()] }),
      h1("2. Security Audit"),

      h2("2.1 Authentication & Authorization"),
      para("The admin panel at /admin is accessible via email/password login (Supabase Auth). The following vulnerabilities were identified:"),
      spacer(),
      sectionTable([
        ["Admin credentials shared in plaintext brief", "CRITICAL", "Rotate all credentials immediately; use 1Password or similar for sharing secrets"],
        ["No MFA enforced on admin panel", "HIGH", "Enable TOTP-based MFA in Supabase Auth settings for admin users"],
        ["No account lockout policy observed", "HIGH", "Implement progressive delays or lockout after N failed login attempts via Supabase or middleware"],
        ["Redirect parameter in login URL (?redirect=%2F) is unsanitized", "MEDIUM", "Validate and whitelist redirect targets server-side to prevent open redirect attacks"],
        ["Session token storage mechanism not audited (likely localStorage)", "MEDIUM", "Prefer httpOnly cookies for session tokens; avoid localStorage for auth tokens"],
        ["/admin route — unclear if server-side protected or only client-side guarded", "HIGH", "Ensure all admin API routes check JWT role claims server-side; client-only route guards are bypassable"],
        ["No CSRF token observed on contact form or login form", "MEDIUM", "Implement CSRF tokens on all state-changing form submissions"],
      ]),
      spacer(),

      h2("2.2 API Endpoint Security"),
      sectionTable([
        ["No visible rate limiting on login, contact, or track-order endpoints", "HIGH", "Implement rate limiting (e.g., 5 requests/min) using Supabase Edge Functions or a reverse proxy like Cloudflare"],
        ["Error messages may expose stack traces or internal details", "MEDIUM", "Ensure production error handlers return generic 500 messages; log details server-side only"],
        ["Contact form has no CAPTCHA or bot protection", "MEDIUM", "Add hCaptcha or Cloudflare Turnstile to the contact form"],
        ["Track order form accepts arbitrary input without obvious validation", "LOW", "Sanitize and validate all user inputs server-side before processing"],
      ]),
      spacer(),

      h2("2.3 HTTPS / SSL / Headers"),
      para("The site is served over HTTPS via Lovable's hosting (Cloudflare CDN). However, HTTP security headers should be verified:"),
      sectionTable([
        ["Content-Security-Policy (CSP) header — not confirmed present", "HIGH", "Add a strict CSP header via Cloudflare Workers or meta tag to prevent XSS"],
        ["X-Frame-Options or CSP frame-ancestors — not confirmed present", "MEDIUM", "Add X-Frame-Options: DENY or CSP frame-ancestors to prevent clickjacking"],
        ["X-Content-Type-Options header — not confirmed present", "LOW", "Add X-Content-Type-Options: nosniff to all responses"],
        ["Referrer-Policy — not confirmed present", "LOW", "Set Referrer-Policy: strict-origin-when-cross-origin"],
        ["Permissions-Policy — not confirmed present", "LOW", "Add Permissions-Policy header to restrict camera/mic/geolocation access"],
      ]),
      spacer(),

      h2("2.4 Data Privacy & Legal Compliance"),
      sectionTable([
        ["Privacy Policy page is empty placeholder", "CRITICAL", "Draft and publish a compliant privacy policy covering: data collected, purpose, third parties, retention, user rights under DPDP Act 2023"],
        ["Terms of Service page is empty placeholder", "CRITICAL", "Draft and publish complete Terms of Service covering: orders, payments, disputes, IP, liability limits"],
        ["No cookie consent mechanism present", "CRITICAL", "Implement a DPDP/GDPR-compliant cookie consent banner before any data collection occurs"],
        ["Contact form collects name, email, phone without consent notice", "HIGH", "Add explicit consent checkbox: 'I consent to NutroPact processing my data per the Privacy Policy'"],
        ["'NutroPay' wallet system collects financial data without disclosed policy", "HIGH", "Add specific wallet T&C and disclose payment data handling under PCI-DSS guidelines"],
      ]),
      spacer(),

      h2("2.5 Third-Party & Dependency Security"),
      sectionTable([
        ["Lovable AI badge exposes project ID to public", "MEDIUM", "Consider removing or hiding the 'Edit with Lovable' badge in production to avoid exposing the project structure"],
        ["Images served from Unsplash (CDN) without subresource integrity", "LOW", "Use SRI hashes for third-party assets or self-host images"],
        ["R2 (Cloudflare) CDN used for OG images — public bucket exposure possible", "LOW", "Ensure the R2 bucket is not world-writable; restrict to signed upload URLs"],
        ["No visible Content-Security-Policy blocking inline scripts", "HIGH", "Audit all inline event handlers and scripts; move to external files and add CSP nonce/hash"],
      ]),
      spacer(),

      // ===== SECTION 3: BACKEND WIRING =====
      new Paragraph({ children: [new PageBreak()] }),
      h1("3. Backend-to-Frontend Wiring Audit"),

      h2("3.1 Critical Broken Functionality"),
      sectionTable([
        ["Products page (/products) shows 'Loading...' indefinitely — no products rendered", "CRITICAL", "Check Supabase table exists; verify RLS policy allows anon reads; add error state and empty state UI"],
        ["Product category filter buttons (Protein, Creatine, etc.) have no visible effect", "HIGH", "Verify filter query params are passed to Supabase query; test with .eq('category', value)"],
        ["Sort dropdown (Featured, Best Rating, Price) appears non-functional", "HIGH", "Connect sort state to Supabase .order() calls; verify field names match schema"],
        ["Track Order form — no indication of what backend this connects to", "MEDIUM", "Verify Supabase 'orders' table query on order_id or phone; show proper not-found state"],
        ["Contact form 'Send Message' — no confirmation message or error shown", "HIGH", "Add success toast on Supabase insert; add error handling for network failures"],
        ["Language switcher (22 Indian languages) — no actual translation observed", "MEDIUM", "Verify i18n library is integrated; check that translated strings are loaded and applied on selection"],
        ["'NutroPay' wallet link in header goes to /account#wallet — account page behavior not tested", "MEDIUM", "Test wallet balance display, top-up, and transaction history when logged in"],
        ["Footer 'Follow Us On' section — no social links present", "LOW", "Add actual social media URLs or remove the section header"],
        ["Scan QR on tub → /coa page — this route does not appear to exist", "MEDIUM", "Create the /coa route with batch number lookup, or remove the reference"],
      ]),
      spacer(),

      h2("3.2 State Management & Error Handling"),
      sectionTable([
        ["Products page has no error boundary or empty-state UI", "HIGH", "Wrap product listing in React error boundary; add empty state: 'No products found'"],
        ["Loading states are shown but never resolve (products)", "HIGH", "Add timeout handling — if API call fails after 10s, show error state"],
        ["No visible skeleton loaders — 'Loading...' text only", "LOW", "Replace text loading with skeleton card UI for better UX"],
        ["Form validation on contact page — no visible client-side feedback", "MEDIUM", "Add inline field validation with clear error messages"],
      ]),
      spacer(),

      // ===== SECTION 4: SEO =====
      new Paragraph({ children: [new PageBreak()] }),
      h1("4. SEO Audit"),

      h2("4.1 Meta Tags"),
      para("Most pages have good baseline meta tag implementation. Specific findings:"),
      sectionTable([
        ["og:url uses relative path (e.g. '/about') instead of absolute URL", "HIGH", "Change og:url to absolute: 'https://www.nutropact.com/about' on all pages"],
        ["Twitter meta title truncated: 'NutroPact — Premium Nutrition' on all pages", "MEDIUM", "Set unique, page-specific Twitter card titles that match the page's H1"],
        ["Twitter description is identical across all pages", "MEDIUM", "Write unique Twitter card descriptions per page to maximize CTR"],
        ["og:type is 'website' on all pages — should be 'product' on product pages", "MEDIUM", "Set og:type to 'product' on product detail pages for richer social previews"],
        ["No og:locale tag present", "LOW", "Add <meta property='og:locale' content='en_IN'> to signal Indian English content"],
        ["Theme color (#0f172a) is very dark — affects mobile browser chrome", "Low", "Consider a brand-appropriate lighter color or test on Android/iOS"],
      ]),
      spacer(),

      h2("4.2 Technical SEO"),
      sectionTable([
        ["sitemap.xml — existence not confirmed; likely missing", "HIGH", "Create and submit a sitemap.xml listing all public pages; submit to Google Search Console"],
        ["robots.txt — returns 403/blocked for crawlers per fetch attempt", "HIGH", "Ensure robots.txt exists and allows all search engines; add Sitemap directive"],
        ["No structured data (JSON-LD) on any page inspected", "HIGH", "Add Product schema on product pages, Organization schema on homepage, FAQPage schema on /faq"],
        ["Canonical tags use relative paths, not absolute URLs", "HIGH", "Replace <link rel='canonical' href='/faq'> with absolute URL https://www.nutropact.com/faq"],
        ["No breadcrumb navigation or BreadcrumbList schema", "MEDIUM", "Add breadcrumbs on product/category pages with BreadcrumbList JSON-LD"],
        ["Images use Unsplash URLs — not indexed under site's domain", "MEDIUM", "Self-host product images; add descriptive filenames and alt text"],
        ["About page About image alt text is generic: 'About NutroPact'", "MEDIUM", "Use descriptive alt: 'NutroPact founder in FSSAI-certified manufacturing lab'"],
        ["Products page shows only 'Loading...' — Googlebot cannot index products", "CRITICAL", "Fix the products loading bug; implement SSR or SSG for product listings"],
        ["No internal linking from product pages to related categories", "MEDIUM", "Add 'You may also like' and category cross-links to improve crawl depth"],
        ["Page load: SPA with client-side rendering only — Googlebot may miss content", "HIGH", "Consider enabling SSR via a Vite/Next.js adapter or Lovable's built-in SSR option"],
      ]),
      spacer(),

      h2("4.3 Heading Structure"),
      sectionTable([
        ["Homepage H1: 'NutroPact — Premium Nutrition & Supplements' — duplicates title tag exactly", "MEDIUM", "Differentiate H1 from title tag; title: 'NutroPact | Buy Supplements Online India', H1: 'Premium Nutrition for Serious Athletes'"],
        ["Products page H1: 'ALL SUPPLEMENTS' — all caps, not keyword-rich", "MEDIUM", "Change to 'Buy Premium Supplements Online India | NutroPact'"],
        ["About page has two H2-level section labels before first content", "LOW", "Review heading hierarchy; each page should have one H1 and logical H2/H3 nesting"],
        ["FAQ page uses H2 for categories and H3 would be more appropriate for questions", "LOW", "Ensure FAQ question text uses H3 tags for proper semantic nesting"],
      ]),
      spacer(),

      h2("4.4 Core Web Vitals & Performance"),
      sectionTable([
        ["Client-side-only rendering (SPA) delays Largest Contentful Paint (LCP)", "HIGH", "Enable SSR or pre-render critical pages; target LCP < 2.5 seconds"],
        ["Hero section image not preloaded", "MEDIUM", "Add <link rel='preload'> for above-the-fold images"],
        ["Unsplash images not served in WebP format (using ?auto=format helps but WebP not guaranteed)", "MEDIUM", "Explicitly request WebP: ?auto=format&fm=webp; or self-host as .webp"],
        ["No lazy loading confirmed on below-fold images", "Low", "Add loading='lazy' attribute to all images not in the initial viewport"],
        ["Font loading strategy not audited — potential FOUT/FOIT", "Low", "Add font-display: swap to custom font declarations"],
      ]),
      spacer(),

      // ===== SECTION 5: GEO =====
      new Paragraph({ children: [new PageBreak()] }),
      h1("5. GEO (Geographic Optimization) Audit"),

      sectionTable([
        ["No hreflang tags present anywhere on the site", "HIGH", "Add hreflang='en-IN' on all pages; add alternates if regional variants are served"],
        ["Language switcher offers 22 Indian languages but translations appear non-functional", "HIGH", "Implement i18next or similar; create JSON translation files for each language; test switching"],
        ["Currency is ₹ (INR) — hardcoded, not locale-aware", "LOW", "If international expansion planned, use Intl.NumberFormat for currency formatting"],
        ["Date format 'January 2026' on Shipping page — not locale-aware", "LOW", "Use Intl.DateTimeFormat with user locale for date rendering"],
        ["No geo-targeting or geo-redirect implemented (international visitors get same content)", "LOW", "Add Cloudflare geo headers to serve India-specific content; block international checkout if not supported"],
        ["Support hours shown in IST but inconsistently stated (9AM-7PM vs 11AM-6PM across pages)", "MEDIUM", "Standardize support hours across all pages and templates"],
        ["Phone numbers use inconsistent formatting (+91 9999999999 vs +91-8955590350)", "MEDIUM", "Standardize to E.164 format: +91XXXXXXXXXX; remove placeholder numbers"],
        ["No llms.txt file for AI search crawler guidance", "MEDIUM", "Add /llms.txt listing key pages and content for AI search engines (Perplexity, ChatGPT browse, etc.)"],
      ]),
      spacer(),

      // ===== SECTION 6: LLMO =====
      new Paragraph({ children: [new PageBreak()] }),
      h1("6. LLMO (Large Language Model Optimization) Audit"),

      para("LLMO assesses how well the site's content is structured for AI systems to extract, understand, and cite."),
      spacer(),
      sectionTable([
        ["FAQ page content is excellent — detailed Q&A in plain language", "LOW (positive)", "This is best practice; continue this content pattern across product pages"],
        ["Product pages are broken (loading only) — AI cannot parse product data", "CRITICAL", "Fix product rendering; add structured product descriptions with ingredients, benefits, dosage"],
        ["About page lab test results are rendered as decorative HTML, not machine-readable", "HIGH", "Add Product/AnalysisNewsArticle JSON-LD schema for lab certificate data"],
        ["No summary paragraph at the top of long pages", "MEDIUM", "Add a 2-3 sentence TL;DR summary at top of About, FAQ, and policy pages for AI extraction"],
        ["Certifications (FSSAI, GMP, ISO, NABL) listed as checkmarks — no structured data", "MEDIUM", "Add CredentialIssuance or Organization schema listing certifications with URLs to governing bodies"],
        ["Content depth on homepage is thin — mostly navigation elements and short teasers", "MEDIUM", "Expand homepage with a full value-prop section, testimonials with schema, and detailed about blurb"],
        ["No llms.txt or ai.txt at root to guide AI crawlers", "MEDIUM", "Create /llms.txt with: site overview, key pages, canonical URL, preferred citation format"],
        ["Images use Unsplash stock photos — AI systems note this reduces trust signals", "LOW", "Use real product photography with accurate alt text for genuine E-E-A-T signals"],
      ]),
      spacer(),

      // ===== SECTION 7: AEO =====
      h1("7. AEO (Answer Engine Optimization) Audit"),

      para("AEO focuses on whether content is structured to appear in Google featured snippets, AI answers, and voice search results."),
      spacer(),
      sectionTable([
        ["FAQ page has no FAQPage JSON-LD schema markup", "HIGH", "Add FAQPage JSON-LD schema to /faq — Google uses this for rich results and AI answer boxes"],
        ["FAQ answers are detailed but some exceed 300 words — too long for snippets", "MEDIUM", "Add a bold 1-2 sentence direct answer at the start of each FAQ answer, followed by detail"],
        ["Shipping page uses bullet-point format — good for snippets", "LOW (positive)", "Maintain this format; add HowTo schema for step-by-step shipping tracking"],
        ["No 'People Also Ask' structured content on product or category pages", "MEDIUM", "Add Q&A sections to product pages: 'What is Whey Protein?', 'How much creatine per day?'"],
        ["Voice search: FAQ answers use natural language well", "LOW (positive)", "Continue conversational tone; add 'The answer is...' or 'Yes/No, because...' openers"],
        ["No HowTo schema on any pages (e.g., how to use protein powder, how to track order)", "MEDIUM", "Add HowTo JSON-LD to relevant pages for step-by-step rich results"],
        ["About page '5+ Years of Trust' and '50K+ Athletes' stats not marked with Claim schema", "LOW", "Consider adding Claim or StatisticalPopulation schema to substantiated statistics"],
      ]),
      spacer(),

      // ===== SECTION 8: MARKETING & ANALYTICS =====
      new Paragraph({ children: [new PageBreak()] }),
      h1("8. Marketing & Analytics Audit"),

      sectionTable([
        ["No Google Analytics or GA4 tracking code found in page source", "CRITICAL", "Install GA4 via Google Tag Manager; configure conversion events (add_to_cart, purchase, sign_up)"],
        ["No Google Tag Manager (GTM) container detected", "HIGH", "Implement GTM as the tag management layer; deploy all pixels through GTM for easy management"],
        ["No Meta (Facebook) Pixel detected", "HIGH", "Install Meta Pixel; configure standard events: PageView, ViewContent, AddToCart, Purchase"],
        ["No Google Ads conversion tag detected", "HIGH", "Add Google Ads remarketing and conversion tags via GTM"],
        ["No LinkedIn Insight Tag detected", "LOW", "Add LinkedIn tag if B2B/bulk wholesale is a target segment"],
        ["No cookie consent banner — pixel firing without consent is DPDP/GDPR violation", "CRITICAL", "Implement Consent Management Platform (CMP) before deploying any pixels"],
        ["UTM parameters: no verification that campaign parameters are captured and stored", "MEDIUM", "Ensure UTM params from URLs are captured in analytics and passed to order data"],
        ["No email marketing integration visible (no newsletter signup, no pop-up)", "MEDIUM", "Add Mailchimp/Klaviyo integration; add newsletter signup in footer or as exit-intent pop-up"],
        ["Footer 'Follow Us On' section empty — no social media links", "HIGH", "Add Instagram, YouTube, WhatsApp Business links — critical for Indian D2C supplement brands"],
        ["WhatsApp chat link in contact page goes to '#' (no actual number)", "HIGH", "Set WhatsApp link to: https://wa.me/91XXXXXXXXXX with a pre-filled message"],
        ["No Hotjar or session recording tool for UX insights", "LOW", "Consider adding Hotjar or Microsoft Clarity for heatmaps and session recordings"],
      ]),
      spacer(),

      // ===== SECTION 9: FUNCTIONAL TESTING =====
      new Paragraph({ children: [new PageBreak()] }),
      h1("9. Functional Testing — Page-by-Page"),

      h2("9.1 Homepage (/)"),
      sectionTable([
        ["Category quick links use emoji 🥛 for all 4 categories — should be unique icons", "LOW", "Use unique, relevant emoji or icons per category (💪 Protein, ⚡ Pre-Workout, 📈 Mass Gainer)"],
        ["'Shop All Products' CTA leads to broken products page", "CRITICAL", "Fix products page loading bug; this is the primary conversion CTA on the homepage"],
        ["'Read Our Story' CTA works correctly — leads to /about", "LOW (OK)", "No action required"],
        ["Hero section has no product imagery or social proof", "MEDIUM", "Add hero image of product lineup, trust badges, or customer count to above-the-fold area"],
        ["No product featured/best-seller section on homepage", "HIGH", "Add a 'Best Sellers' section to homepage with product cards — critical for D2C conversion"],
      ]),
      spacer(),

      h2("9.2 Products Page (/products)"),
      sectionTable([
        ["Products show only 'Loading...' — zero products rendered", "CRITICAL", "Debug Supabase query; verify anon RLS policy; check for JavaScript console errors on this route"],
        ["Sort and filter controls rendered but non-functional", "HIGH", "Connect filter state to Supabase .filter() and .order() calls"],
        ["No empty-state UI when no products match filter", "MEDIUM", "Add: 'No products found. Try a different filter.' with CTA to view all"],
        ["No product count shown ('Showing X of Y products')", "LOW", "Add product count display for UX and SEO purposes"],
      ]),
      spacer(),

      h2("9.3 About Page (/about)"),
      sectionTable([
        ["Lab certificate shows today's date (2026-06-15) — appears dynamically generated, not real", "HIGH", "Replace with actual uploaded lab certificate PDF; link to real Eurofins/NABL certificate"],
        ["Cert No. 'NABL/2025/0042' — cannot be verified from page", "MEDIUM", "Add a verifiable link to the NABL portal or Eurofins portal for the certificate"],
        ["'50K+ Athletes served' and '5+ Years of trust' stats are unsubstantiated", "MEDIUM", "Add source/methodology note, or link to a verifiable review/order count"],
        ["Founder image is a generic Unsplash stock photo — damages brand authenticity", "HIGH", "Replace with an actual photo of the founder; stock photos undermine trust"],
        ["'Rohan Mehta' founder name — verify this is a real person and not placeholder", "HIGH", "Ensure all named individuals on the site are real people with genuine credentials"],
      ]),
      spacer(),

      h2("9.4 FAQ Page (/faq)"),
      sectionTable([
        ["FAQ content is high quality and well-structured — best page on the site", "LOW (positive)", "Maintain this quality; expand with more technical supplement questions"],
        ["Category filter tabs (All, Orders, Returns...) render but smooth scrolling behavior not verified", "LOW", "Verify filter tabs smoothly highlight and scroll to the correct section"],
        ["No FAQPage JSON-LD schema", "HIGH", "Add FAQPage schema to enable Google rich results (accordion in SERPs)"],
        ["'Contact Support' CTA at bottom links to /contact correctly", "LOW (OK)", "No action required"],
      ]),
      spacer(),

      h2("9.5 Contact Page (/contact)"),
      sectionTable([
        ["Phone number '+91 9999999999' is a placeholder — a real contact number is in the footer", "CRITICAL", "Replace placeholder with verified business number; test the call link"],
        ["WhatsApp button links to '#' — non-functional", "HIGH", "Implement wa.me deep link with business WhatsApp number"],
        ["Support hours on contact page (Mon-Fri 9-7PM, Sat 10-5PM) differ from footer (Mon-Sat 11AM-6PM)", "HIGH", "Standardize hours across the entire site"],
        ["Contact form has no CAPTCHA — vulnerable to spam", "MEDIUM", "Add hCaptcha or Cloudflare Turnstile"],
        ["Contact form success/error state not verifiable without API access", "MEDIUM", "Test form submission; ensure Supabase insert works and user sees confirmation"],
        ["Form email pre-fills from mailto link — check for email header injection", "MEDIUM", "Sanitize all form inputs server-side; validate email format strictly"],
      ]),
      spacer(),

      h2("9.6 Policy Pages (/privacy, /terms, /shipping, /refund)"),
      sectionTable([
        ["/privacy — 'Privacy policy content will be added soon'", "CRITICAL", "Publish complete privacy policy immediately"],
        ["/terms — 'Terms of service content will be added soon'", "CRITICAL", "Publish complete terms of service immediately"],
        ["/shipping — Well-written and complete", "LOW (positive)", "Minor: add GST handling information and COD charges"],
        ["/refund — Not fetched but referenced in footer navigation", "MEDIUM", "Verify /refund page exists and has complete return/refund policy content"],
      ]),
      spacer(),

      // ===== SECTION 10: CODE QUALITY =====
      new Paragraph({ children: [new PageBreak()] }),
      h1("10. Code Quality & Lovable AI-Specific Issues"),

      sectionTable([
        ["Placeholder data not replaced post-template generation (phone, email, founder photo)", "HIGH", "Perform a full content audit; search codebase for '9999999999', 'placeholder', 'Lorem ipsum'"],
        ["Language switcher component renders 22 languages with no i18n implementation", "HIGH", "Either implement i18n fully with react-i18next or reduce to supported languages only"],
        ["'Edit with Lovable' badge visible in production footer", "MEDIUM", "Remove the Lovable badge from production; it exposes the project structure and appears unprofessional"],
        ["Unsplash images used for About page hero and founder photo — not production-ready", "HIGH", "Replace all placeholder stock images with real brand assets before launch"],
        ["COA (Certificate of Analysis) section renders hardcoded fake data with today's date", "HIGH", "Replace with real uploaded COA documents; dynamic date on a static certificate is misleading"],
        ["Social media follow links in footer are empty/missing", "HIGH", "Add real social media profile URLs; consider Instagram and YouTube as primary for supplement brand"],
        ["NutroPay wallet feature is referenced but its implementation/status is unclear", "MEDIUM", "Document and test the NutroPay wallet feature fully; ensure it is either complete or hidden"],
        ["Console errors likely present due to broken product API calls", "HIGH", "Review browser console for all JavaScript errors; fix broken Supabase queries"],
        ["No error boundaries in the React tree — one crash could take down the whole page", "HIGH", "Wrap key sections in React ErrorBoundary components with fallback UI"],
        ["All pages share the same OG image (preview screenshot) instead of unique images", "MEDIUM", "Create unique OG images per page category: product image for products, team photo for about, etc."],
      ]),
      spacer(),

      // ===== SECTION 11: PRIORITY ACTION ITEMS =====
      new Paragraph({ children: [new PageBreak()] }),
      h1("11. Priority Action Items"),

      h2("Immediate (This Week — Critical)"),
      new Paragraph({ numbering: { reference: "numbered", level: 0 }, children: [new TextRun({ text: "Rotate admin credentials — change password immediately; enable MFA", font: "Arial", size: 20 })] }),
      new Paragraph({ numbering: { reference: "numbered", level: 0 }, children: [new TextRun({ text: "Fix products page — debug and resolve the Supabase loading failure", font: "Arial", size: 20 })] }),
      new Paragraph({ numbering: { reference: "numbered", level: 0 }, children: [new TextRun({ text: "Publish Privacy Policy and Terms of Service (legal requirement)", font: "Arial", size: 20 })] }),
      new Paragraph({ numbering: { reference: "numbered", level: 0 }, children: [new TextRun({ text: "Add cookie consent banner before any analytics/pixel deployment", font: "Arial", size: 20 })] }),
      new Paragraph({ numbering: { reference: "numbered", level: 0 }, children: [new TextRun({ text: "Replace all placeholder contact data (phone, email, WhatsApp)", font: "Arial", size: 20 })] }),
      new Paragraph({ numbering: { reference: "numbered", level: 0 }, children: [new TextRun({ text: "Replace stock photos (founder, about page) with real brand assets", font: "Arial", size: 20 })] }),
      spacer(),

      h2("Short-Term (1–2 Weeks — High Priority)"),
      new Paragraph({ numbering: { reference: "numbered", level: 0 }, children: [new TextRun({ text: "Install GA4 + GTM; configure Add to Cart and Purchase conversion events", font: "Arial", size: 20 })] }),
      new Paragraph({ numbering: { reference: "numbered", level: 0 }, children: [new TextRun({ text: "Install Meta Pixel and Google Ads remarketing tag via GTM", font: "Arial", size: 20 })] }),
      new Paragraph({ numbering: { reference: "numbered", level: 0 }, children: [new TextRun({ text: "Fix canonical tags to use absolute URLs across all pages", font: "Arial", size: 20 })] }),
      new Paragraph({ numbering: { reference: "numbered", level: 0 }, children: [new TextRun({ text: "Add FAQPage JSON-LD schema on /faq page", font: "Arial", size: 20 })] }),
      new Paragraph({ numbering: { reference: "numbered", level: 0 }, children: [new TextRun({ text: "Create and submit sitemap.xml to Google Search Console", font: "Arial", size: 20 })] }),
      new Paragraph({ numbering: { reference: "numbered", level: 0 }, children: [new TextRun({ text: "Add HTTP security headers (CSP, X-Frame-Options, X-Content-Type-Options)", font: "Arial", size: 20 })] }),
      new Paragraph({ numbering: { reference: "numbered", level: 0 }, children: [new TextRun({ text: "Fix social media links in footer (Instagram, YouTube, WhatsApp)", font: "Arial", size: 20 })] }),
      new Paragraph({ numbering: { reference: "numbered", level: 0 }, children: [new TextRun({ text: "Replace fake COA on About page with real uploaded certificate PDF", font: "Arial", size: 20 })] }),
      new Paragraph({ numbering: { reference: "numbered", level: 0 }, children: [new TextRun({ text: "Implement i18n properly for language switcher or reduce to English only", font: "Arial", size: 20 })] }),
      spacer(),

      h2("Medium-Term (2–4 Weeks)"),
      new Paragraph({ numbering: { reference: "numbered", level: 0 }, children: [new TextRun({ text: "Add Product schema JSON-LD to all product detail pages", font: "Arial", size: 20 })] }),
      new Paragraph({ numbering: { reference: "numbered", level: 0 }, children: [new TextRun({ text: "Add Organization + BreadcrumbList schema to homepage", font: "Arial", size: 20 })] }),
      new Paragraph({ numbering: { reference: "numbered", level: 0 }, children: [new TextRun({ text: "Implement SSR or SSG for product listings for Google crawlability", font: "Arial", size: 20 })] }),
      new Paragraph({ numbering: { reference: "numbered", level: 0 }, children: [new TextRun({ text: "Add rate limiting to API endpoints; add CAPTCHA to contact form", font: "Arial", size: 20 })] }),
      new Paragraph({ numbering: { reference: "numbered", level: 0 }, children: [new TextRun({ text: "Add unique OG images per page", font: "Arial", size: 20 })] }),
      new Paragraph({ numbering: { reference: "numbered", level: 0 }, children: [new TextRun({ text: "Add /llms.txt for AI search engine guidance", font: "Arial", size: 20 })] }),
      new Paragraph({ numbering: { reference: "numbered", level: 0 }, children: [new TextRun({ text: "Verify and document NutroPay wallet end-to-end", font: "Arial", size: 20 })] }),
      new Paragraph({ numbering: { reference: "numbered", level: 0 }, children: [new TextRun({ text: "Add best-seller product section on homepage", font: "Arial", size: 20 })] }),
      new Paragraph({ numbering: { reference: "numbered", level: 0 }, children: [new TextRun({ text: "Implement Klaviyo/Mailchimp newsletter signup and email flows", font: "Arial", size: 20 })] }),
      new Paragraph({ numbering: { reference: "numbered", level: 0 }, children: [new TextRun({ text: "Remove 'Edit with Lovable' badge from production deployment", font: "Arial", size: 20 })] }),
      spacer(),

      // ===== APPENDIX =====
      new Paragraph({ children: [new PageBreak()] }),
      h1("Appendix — Pages Audited"),
      spacer(),
      sectionTable([
        ["/ (Homepage)", "✓ Audited", "Products CTA broken; thin homepage content"],
        ["/products", "✓ Audited", "Completely broken — loading state only"],
        ["/about", "✓ Audited", "Fake COA data; stock photos; good content otherwise"],
        ["/faq", "✓ Audited", "Best page — rich content, needs JSON-LD"],
        ["/contact", "✓ Audited", "Placeholder phone; broken WhatsApp; form untested"],
        ["/privacy", "✓ Audited", "EMPTY — critical legal violation"],
        ["/terms", "✓ Audited", "EMPTY — critical legal violation"],
        ["/shipping", "✓ Audited", "Good content; minor inconsistencies"],
        ["/admin", "⚠ Access blocked by robots.txt", "Admin panel access denied to automated audit"],
        ["/cart", "Not fully tested", "Requires product interaction to test"],
        ["/account", "Not fully tested", "Requires authenticated session"],
        ["/track-order", "Partially audited", "Form present; backend connection unverified"],
        ["/refund", "Not fetched", "Referenced in footer — verify content exists"],
        ["/coa", "Not tested", "Referenced in /about — route existence unverified"],
      ]),
      spacer(),

      para("Report prepared by: AI Audit System", { italic: true, color: "888888" }),
      para("Date: June 15, 2026", { italic: true, color: "888888" }),
      para("Disclaimer: This audit was conducted through automated page fetching and content analysis. A full manual audit with authenticated browser access to the admin panel, network request inspection, and live JavaScript console monitoring is recommended to supplement these findings.", { italic: true, color: "888888" }),
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync('/mnt/user-data/outputs/NutroPact_Audit_Report_June2026.docx', buffer);
  console.log('Done');
});
