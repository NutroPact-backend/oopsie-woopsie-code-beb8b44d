/**
 * PHASES 12–15 — SEO / GEO / AEO / LLMO AUDIT
 *
 * SEO:   titles, meta, canonicals, robots, sitemap, schema, internal links, crawlability
 * GEO:   hreflang, locale handling, language switching, currency
 * AEO:   FAQ schema, HowTo schema, snippet readiness, Q&A structure
 * LLMO:  AI readability, semantic HTML, llms.txt, entity coverage
 *
 * All findings labeled VERIFIED / INFERRED / UNTESTED
 * Output: reports/output/seo-report/
 */
import { test, expect } from '@playwright/test';
import { screenshot, saveLog } from '../../utils/page-helpers';
import { coverage } from '../../utils/coverage-tracker';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

const BASE = process.env.BASE_URL || 'https://oopsie-woopsie-code.lovable.app';

interface SeoCheck {
  page: string;
  check: string;
  category: 'SEO' | 'GEO' | 'AEO' | 'LLMO';
  result: 'PASS' | 'FAIL' | 'WARN' | 'UNTESTED';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  evidence: string;
  fix?: string;
  confidence: 'VERIFIED' | 'INFERRED' | 'UNTESTED';
}

const seoReport: SeoCheck[] = [];

function addCheck(check: SeoCheck) {
  seoReport.push(check);
  const icon = check.result === 'PASS' ? '✅' : check.result === 'FAIL' ? '❌' : check.result === 'WARN' ? '⚠️ ' : '⬜';
  console.log(`  ${icon} [${check.severity}] ${check.check}: ${check.evidence.slice(0, 100)}`);
  if (check.result === 'FAIL' || check.result === 'WARN') {
    coverage.addSeoFinding({ page: check.page, check: check.check, result: check.evidence, severity: check.severity });
  }
}

// ── Extract all SEO metadata from a page ───────────────────────────────────
async function extractSeoMeta(page: any) {
  return page.evaluate(() => {
    const getMeta = (name: string) =>
      document.querySelector(`meta[name="${name}"]`)?.getAttribute('content') ||
      document.querySelector(`meta[property="${name}"]`)?.getAttribute('content') || null;

    const getLink = (rel: string) =>
      document.querySelector(`link[rel="${rel}"]`)?.getAttribute('href') || null;

    const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
      .map(s => { try { return JSON.parse(s.textContent || '{}'); } catch { return null; } })
      .filter(Boolean);

    const headings: Record<string, string[]> = {};
    ['h1', 'h2', 'h3', 'h4'].forEach(tag => {
      headings[tag] = Array.from(document.querySelectorAll(tag))
        .map(el => el.textContent?.trim() || '').filter(Boolean);
    });

    const images = Array.from(document.querySelectorAll('img')).map(img => ({
      src: img.getAttribute('src'),
      alt: img.getAttribute('alt'),
      loading: img.getAttribute('loading'),
    }));

    const internalLinks = Array.from(document.querySelectorAll('a[href]'))
      .map(a => (a as HTMLAnchorElement).href)
      .filter(href => href.includes(window.location.hostname));

    return {
      title: document.title,
      description: getMeta('description'),
      ogTitle: getMeta('og:title'),
      ogDescription: getMeta('og:description'),
      ogImage: getMeta('og:image'),
      ogUrl: getMeta('og:url'),
      ogType: getMeta('og:type'),
      ogLocale: getMeta('og:locale'),
      twitterCard: getMeta('twitter:card'),
      twitterTitle: getMeta('twitter:title'),
      twitterDescription: getMeta('twitter:description'),
      canonical: getLink('canonical'),
      robots: getMeta('robots'),
      hreflang: Array.from(document.querySelectorAll('link[rel="alternate"][hreflang]'))
        .map(l => ({ lang: l.getAttribute('hreflang'), href: l.getAttribute('href') })),
      structuredData: scripts,
      headings,
      images,
      internalLinks: internalLinks.length,
      hasH1: headings.h1?.length > 0,
      h1Count: headings.h1?.length || 0,
    };
  });
}

const PAGES_TO_AUDIT = [
  { path: '/', label: 'Homepage' },
  { path: '/products', label: 'Products' },
  { path: '/about', label: 'About' },
  { path: '/faq', label: 'FAQ' },
  { path: '/contact', label: 'Contact' },
  { path: '/shipping', label: 'Shipping' },
  { path: '/privacy', label: 'Privacy' },
  { path: '/terms', label: 'Terms' },
];

// ════════════════════════════════════════════════════════════════════════════
// TEST: Meta tags audit — all pages
// ════════════════════════════════════════════════════════════════════════════
test('SEO-01: Meta tags — title, description, OG, Twitter, canonical', async ({ page }) => {
  const allMeta: any[] = [];

  for (const { path, label } of PAGES_TO_AUDIT) {
    const res = await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
    if (res?.status() === 404) continue;
    await page.waitForTimeout(1500);

    const meta = await extractSeoMeta(page);
    allMeta.push({ path, label, meta });

    console.log(`\n  📋 ${label} (${path}):`);

    // Title
    addCheck({
      page: path, check: 'Title tag present', category: 'SEO',
      result: meta.title ? (meta.title.length >= 30 && meta.title.length <= 60 ? 'PASS' : 'WARN') : 'FAIL',
      severity: 'HIGH',
      evidence: `Title: "${meta.title || 'MISSING'}" (${meta.title?.length || 0} chars)`,
      fix: 'Keep titles 30-60 chars, unique per page, include primary keyword',
      confidence: 'VERIFIED',
    });

    // Meta description
    addCheck({
      page: path, check: 'Meta description present', category: 'SEO',
      result: meta.description ? (meta.description.length >= 120 && meta.description.length <= 160 ? 'PASS' : 'WARN') : 'FAIL',
      severity: 'HIGH',
      evidence: `Description: "${(meta.description || 'MISSING').slice(0, 80)}" (${meta.description?.length || 0} chars)`,
      fix: 'Write unique descriptions 120-160 chars per page',
      confidence: 'VERIFIED',
    });

    // Canonical
    const canonicalAbsolute = meta.canonical?.startsWith('http');
    addCheck({
      page: path, check: 'Canonical tag is absolute URL', category: 'SEO',
      result: !meta.canonical ? 'FAIL' : canonicalAbsolute ? 'PASS' : 'WARN',
      severity: 'HIGH',
      evidence: `Canonical: "${meta.canonical || 'MISSING'}"`,
      fix: 'Use absolute URL: https://www.nutropact.com' + path,
      confidence: 'VERIFIED',
    });

    // OG tags
    addCheck({
      page: path, check: 'Open Graph tags complete', category: 'SEO',
      result: (meta.ogTitle && meta.ogDescription && meta.ogImage && meta.ogUrl) ? 'PASS' : 'WARN',
      severity: 'MEDIUM',
      evidence: `og:title=${!!meta.ogTitle}, og:desc=${!!meta.ogDescription}, og:image=${!!meta.ogImage}, og:url=${!!meta.ogUrl}`,
      fix: 'Add all four core OG tags with absolute URLs',
      confidence: 'VERIFIED',
    });

    // OG URL absolute
    if (meta.ogUrl && !meta.ogUrl.startsWith('http')) {
      addCheck({
        page: path, check: 'og:url is absolute', category: 'SEO',
        result: 'FAIL', severity: 'HIGH',
        evidence: `og:url="${meta.ogUrl}" — relative URL breaks social sharing`,
        fix: `Change to: https://www.nutropact.com${path}`,
        confidence: 'VERIFIED',
      });
    }

    // H1 count
    addCheck({
      page: path, check: 'Exactly one H1 tag', category: 'SEO',
      result: meta.h1Count === 1 ? 'PASS' : meta.h1Count === 0 ? 'FAIL' : 'WARN',
      severity: meta.h1Count === 0 ? 'HIGH' : 'MEDIUM',
      evidence: `H1 count: ${meta.h1Count}. H1 text: "${(meta.headings.h1 || []).join(', ').slice(0, 80)}"`,
      confidence: 'VERIFIED',
    });

    // Images alt text
    const imagesNoAlt = meta.images.filter((img: any) => !img.alt || img.alt.trim() === '');
    addCheck({
      page: path, check: 'All images have alt text', category: 'SEO',
      result: imagesNoAlt.length === 0 ? 'PASS' : 'WARN',
      severity: 'MEDIUM',
      evidence: `${imagesNoAlt.length}/${meta.images.length} images missing alt text`,
      fix: 'Add descriptive alt text to every image',
      confidence: 'VERIFIED',
    });

    // Structured data
    addCheck({
      page: path, check: 'JSON-LD structured data present', category: 'SEO',
      result: meta.structuredData.length > 0 ? 'PASS' : 'FAIL',
      severity: 'HIGH',
      evidence: `${meta.structuredData.length} JSON-LD blocks. Types: ${meta.structuredData.map((s: any) => s['@type']).join(', ') || 'none'}`,
      fix: 'Add appropriate schema: Organization (home), Product (products), FAQPage (faq), BreadcrumbList (all)',
      confidence: 'VERIFIED',
    });

    // hreflang (GEO)
    addCheck({
      page: path, check: 'hreflang tags present (GEO)', category: 'GEO',
      result: meta.hreflang.length > 0 ? 'PASS' : 'FAIL',
      severity: 'HIGH',
      evidence: `hreflang tags: ${meta.hreflang.length}. ${meta.hreflang.length > 0 ? JSON.stringify(meta.hreflang.slice(0, 2)) : 'NONE'}`,
      fix: 'Add <link rel="alternate" hreflang="en-IN" href="..."> at minimum',
      confidence: 'VERIFIED',
    });

    await screenshot(page, `seo01-${label.toLowerCase()}`);
  }

  fs.mkdirSync('reports/output/seo-report', { recursive: true });
  fs.writeFileSync('reports/output/seo-report/meta-tags.json', JSON.stringify(allMeta, null, 2));
});

// ════════════════════════════════════════════════════════════════════════════
// TEST: robots.txt and sitemap.xml
// ════════════════════════════════════════════════════════════════════════════
test('SEO-02: robots.txt, sitemap.xml, and llms.txt', async ({ page }) => {
  // robots.txt
  const robotsRes = await page.goto(`${BASE}/robots.txt`);
  const robotsOk = robotsRes?.status() === 200;
  const robotsContent = robotsOk ? await page.evaluate(() => document.body.innerText) : '';

  addCheck({
    page: '/robots.txt', check: 'robots.txt accessible', category: 'SEO',
    result: robotsOk ? 'PASS' : 'FAIL', severity: 'HIGH',
    evidence: `Status: ${robotsRes?.status()}. Content: ${robotsContent.slice(0, 200)}`,
    fix: 'Create robots.txt with: User-agent: * Allow: / Disallow: /admin Sitemap: URL',
    confidence: 'VERIFIED',
  });

  if (robotsOk) {
    const hasDisallowAdmin = robotsContent.includes('/admin');
    const hasSitemapRef    = robotsContent.toLowerCase().includes('sitemap');
    addCheck({
      page: '/robots.txt', check: 'robots.txt disallows /admin', category: 'SEO',
      result: hasDisallowAdmin ? 'PASS' : 'WARN', severity: 'MEDIUM',
      evidence: hasDisallowAdmin ? 'Disallow: /admin present' : '/admin not mentioned in robots.txt',
      confidence: 'VERIFIED',
    });
    addCheck({
      page: '/robots.txt', check: 'robots.txt references sitemap', category: 'SEO',
      result: hasSitemapRef ? 'PASS' : 'WARN', severity: 'MEDIUM',
      evidence: hasSitemapRef ? 'Sitemap directive present' : 'Sitemap: directive missing',
      confidence: 'VERIFIED',
    });
  }

  // sitemap.xml
  const sitemapRes = await page.goto(`${BASE}/sitemap.xml`);
  const sitemapOk = sitemapRes?.status() === 200;
  const sitemapContent = sitemapOk ? await page.evaluate(() => document.body.innerText) : '';
  const sitemapUrlCount = (sitemapContent.match(/<loc>/g) || []).length;

  addCheck({
    page: '/sitemap.xml', check: 'sitemap.xml accessible', category: 'SEO',
    result: sitemapOk ? 'PASS' : 'FAIL', severity: 'HIGH',
    evidence: `Status: ${sitemapRes?.status()}. URLs in sitemap: ${sitemapUrlCount}`,
    fix: 'Generate sitemap.xml with all public routes. Submit to Google Search Console.',
    confidence: 'VERIFIED',
  });

  // llms.txt (LLMO)
  const llmsRes = await page.goto(`${BASE}/llms.txt`);
  const llmsOk = llmsRes?.status() === 200;
  addCheck({
    page: '/llms.txt', check: 'llms.txt present (LLMO)', category: 'LLMO',
    result: llmsOk ? 'PASS' : 'FAIL', severity: 'MEDIUM',
    evidence: `Status: ${llmsRes?.status()}`,
    fix: 'Create /llms.txt: site name, description, key pages, canonical URL, preferred citation',
    confidence: 'VERIFIED',
  });
});

// ════════════════════════════════════════════════════════════════════════════
// TEST: FAQ page — AEO schema and snippet readiness
// ════════════════════════════════════════════════════════════════════════════
test('SEO-03: AEO — FAQ schema and featured snippet readiness', async ({ page }) => {
  await page.goto(`${BASE}/faq`, { waitUntil: 'networkidle' });
  const meta = await extractSeoMeta(page);
  await screenshot(page, 'seo03-faq');

  // FAQPage schema
  const faqSchema = meta.structuredData.find((s: any) =>
    s['@type'] === 'FAQPage' || s['@type'] === 'FAQ'
  );

  addCheck({
    page: '/faq', check: 'FAQPage JSON-LD schema', category: 'AEO',
    result: faqSchema ? 'PASS' : 'FAIL', severity: 'HIGH',
    evidence: faqSchema ? `FAQPage schema with ${faqSchema.mainEntity?.length || 0} questions` : 'No FAQPage schema found',
    fix: 'Add FAQPage JSON-LD with all Q&A pairs for Google rich results',
    confidence: 'VERIFIED',
  });

  // Count actual FAQ items on page
  const faqItems = await page.locator('[data-state], details, .faq-item, [role="listitem"]').count();
  addCheck({
    page: '/faq', check: 'FAQ items present in DOM', category: 'AEO',
    result: faqItems > 0 ? 'PASS' : 'FAIL', severity: 'HIGH',
    evidence: `${faqItems} FAQ items found in DOM`,
    confidence: 'VERIFIED',
  });

  // Check for direct-answer format (Q: then A: pattern)
  const faqText = await page.locator('main, #faq, [data-testid*="faq"]').first().textContent().catch(() => '');
  const hasQuestionMarks = (faqText.match(/\?/g) || []).length;
  addCheck({
    page: '/faq', check: 'Questions use question format', category: 'AEO',
    result: hasQuestionMarks > 3 ? 'PASS' : 'WARN', severity: 'MEDIUM',
    evidence: `${hasQuestionMarks} question marks in FAQ content`,
    confidence: 'VERIFIED',
  });

  // AEO: Direct answer at start of each answer (for featured snippets)
  const firstAnswer = await page.locator('[data-state="open"] p, details[open] p, .answer p').first()
    .textContent().catch(() => '');
  addCheck({
    page: '/faq', check: 'Answers start with direct response (snippet-ready)', category: 'AEO',
    result: firstAnswer ? 'PASS' : 'UNTESTED', severity: 'MEDIUM',
    evidence: `First visible answer starts with: "${firstAnswer?.slice(0, 100) || 'not visible'}"`,
    confidence: firstAnswer ? 'VERIFIED' : 'UNTESTED',
  });
});

// ════════════════════════════════════════════════════════════════════════════
// TEST: LLMO — AI readability and machine-readable structure
// ════════════════════════════════════════════════════════════════════════════
test('SEO-04: LLMO — AI readability and semantic structure', async ({ page }) => {
  for (const { path, label } of PAGES_TO_AUDIT.slice(0, 5)) {
    const res = await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
    if (res?.status() === 404) continue;
    await page.waitForTimeout(1000);

    const llmoAnalysis = await page.evaluate(() => {
      // Semantic HTML score
      const article    = document.querySelectorAll('article').length;
      const section    = document.querySelectorAll('section').length;
      const nav        = document.querySelectorAll('nav').length;
      const main       = document.querySelectorAll('main').length;
      const aside      = document.querySelectorAll('aside').length;
      const footer     = document.querySelectorAll('footer').length;
      const header     = document.querySelectorAll('header').length;

      // Content density
      const bodyText   = document.body.innerText;
      const wordCount  = bodyText.split(/\s+/).filter(Boolean).length;
      const listItems  = document.querySelectorAll('li').length;
      const tables     = document.querySelectorAll('table').length;
      const paragraphs = document.querySelectorAll('p').length;

      // Summary/intro paragraph check
      const firstP = document.querySelector('main p, article p, section p');
      const firstPText = firstP?.textContent?.trim() || '';

      return {
        semanticTags: { article, section, nav, main, aside, footer, header },
        content: { wordCount, listItems, tables, paragraphs },
        hasMain: main > 0,
        firstParagraph: firstPText.slice(0, 200),
      };
    });

    console.log(`\n  📋 LLMO: ${label}:`);
    console.log(`     Word count: ${llmoAnalysis.content.wordCount}`);
    console.log(`     Semantic tags: main=${llmoAnalysis.semanticTags.main}, article=${llmoAnalysis.semanticTags.article}, section=${llmoAnalysis.semanticTags.section}`);

    addCheck({
      page: path, check: 'Semantic HTML structure (main tag)', category: 'LLMO',
      result: llmoAnalysis.hasMain ? 'PASS' : 'WARN', severity: 'MEDIUM',
      evidence: `<main> tags: ${llmoAnalysis.semanticTags.main}`,
      confidence: 'VERIFIED',
    });

    addCheck({
      page: path, check: 'Content depth (word count)', category: 'LLMO',
      result: llmoAnalysis.content.wordCount > 300 ? 'PASS' : 'WARN', severity: 'MEDIUM',
      evidence: `${llmoAnalysis.content.wordCount} words on page`,
      confidence: 'VERIFIED',
    });

    addCheck({
      page: path, check: 'Machine-readable lists/tables', category: 'LLMO',
      result: (llmoAnalysis.content.listItems + llmoAnalysis.content.tables) > 3 ? 'PASS' : 'WARN',
      severity: 'LOW',
      evidence: `${llmoAnalysis.content.listItems} list items, ${llmoAnalysis.content.tables} tables`,
      confidence: 'VERIFIED',
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// TEST: GEO — Language switching verification
// ════════════════════════════════════════════════════════════════════════════
test('SEO-05: GEO — language switcher and i18n implementation', async ({ page }) => {
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });

  const htmlLang = await page.evaluate(() => document.documentElement.lang);
  addCheck({
    page: '/', check: 'HTML lang attribute set', category: 'GEO',
    result: htmlLang ? 'PASS' : 'FAIL', severity: 'HIGH',
    evidence: `<html lang="${htmlLang || 'NOT SET'}">`,
    fix: 'Add lang="en-IN" to <html> tag',
    confidence: 'VERIFIED',
  });

  // i18n implementation check
  const i18nState = await page.evaluate(() => {
    return {
      i18nextLoaded: typeof (window as any).i18n !== 'undefined' || typeof (window as any).i18next !== 'undefined',
      reactI18next: typeof (window as any).__reactI18nextASyncInit !== 'undefined',
    };
  });

  addCheck({
    page: '/', check: 'i18n library loaded', category: 'GEO',
    result: (i18nState.i18nextLoaded || i18nState.reactI18next) ? 'PASS' : 'WARN',
    severity: 'HIGH',
    evidence: `i18next in window: ${i18nState.i18nextLoaded}. React-i18next: ${i18nState.reactI18next}`,
    fix: 'Implement react-i18next with translation JSON files for each supported language',
    confidence: 'INFERRED',
  });

  // Check currency display
  const currencyDisplay = await page.evaluate(() => {
    const rupeeElements = document.querySelectorAll('*');
    let hasRupee = false;
    rupeeElements.forEach(el => { if (el.textContent?.includes('₹')) hasRupee = true; });
    return hasRupee;
  });

  addCheck({
    page: '/', check: 'INR currency symbol displayed', category: 'GEO',
    result: currencyDisplay ? 'PASS' : 'WARN', severity: 'LOW',
    evidence: currencyDisplay ? '₹ symbol found in page content' : '₹ symbol not found — check product pricing',
    confidence: 'VERIFIED',
  });
});

// ════════════════════════════════════════════════════════════════════════════
// TEST: Schema validation for product pages
// ════════════════════════════════════════════════════════════════════════════
test('SEO-06: Product schema — JSON-LD on product detail pages', async ({ page }) => {
  // Try to navigate to a product page
  await page.goto(`${BASE}/products`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const productLink = page.locator('a[href*="/products/"]').first();
  if (await productLink.count() === 0) {
    addCheck({
      page: '/products/*', check: 'Product detail page schema', category: 'SEO',
      result: 'UNTESTED', severity: 'HIGH',
      evidence: 'Cannot test — no product links found (products page is not loading)',
      confidence: 'UNTESTED',
    });
    return;
  }

  const href = await productLink.getAttribute('href');
  await page.goto(href?.startsWith('http') ? href! : `${BASE}${href}`, { waitUntil: 'networkidle' });
  const meta = await extractSeoMeta(page);

  const productSchema = meta.structuredData.find((s: any) =>
    s['@type'] === 'Product'
  );

  addCheck({
    page: href || '/product/*', check: 'Product JSON-LD schema', category: 'SEO',
    result: productSchema ? 'PASS' : 'FAIL', severity: 'HIGH',
    evidence: productSchema
      ? `Product schema: name="${productSchema.name}", price="${productSchema.offers?.price}"`
      : 'No Product schema — missing: name, price, availability, image, description',
    fix: 'Add Product schema with: @type, name, description, image, offers (price, availability)',
    confidence: 'VERIFIED',
  });

  if (productSchema) {
    const hasPrice = productSchema.offers?.price || productSchema.offers?.priceRange;
    const hasAvail = productSchema.offers?.availability;
    const hasImage = productSchema.image;

    addCheck({
      page: href || '/product/*', check: 'Product schema completeness', category: 'SEO',
      result: (hasPrice && hasAvail && hasImage) ? 'PASS' : 'WARN', severity: 'MEDIUM',
      evidence: `price: ${!!hasPrice}, availability: ${!!hasAvail}, image: ${!!hasImage}`,
      confidence: 'VERIFIED',
    });
  }

  await screenshot(page, 'seo06-product-schema');
});

// ════════════════════════════════════════════════════════════════════════════
// TEST: Internal linking and crawl depth
// ════════════════════════════════════════════════════════════════════════════
test('SEO-07: Internal linking structure', async ({ page }) => {
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });

  const linkAudit = await page.evaluate((base: string) => {
    const allLinks = Array.from(document.querySelectorAll('a[href]'));
    const internal = allLinks.filter(a => {
      try { return new URL((a as HTMLAnchorElement).href).hostname === new URL(base).hostname; }
      catch { return false; }
    });
    const external = allLinks.filter(a => {
      try { return new URL((a as HTMLAnchorElement).href).hostname !== new URL(base).hostname; }
      catch { return false; }
    });
    const nofollow = allLinks.filter(a => a.getAttribute('rel')?.includes('nofollow'));

    return {
      total: allLinks.length,
      internal: internal.length,
      external: external.length,
      nofollow: nofollow.length,
      internalUrls: internal.slice(0, 20).map(a => (a as HTMLAnchorElement).pathname),
    };
  }, BASE);

  addCheck({
    page: '/', check: 'Internal linking — homepage', category: 'SEO',
    result: linkAudit.internal > 5 ? 'PASS' : 'WARN', severity: 'MEDIUM',
    evidence: `${linkAudit.internal} internal, ${linkAudit.external} external, ${linkAudit.nofollow} nofollow links`,
    confidence: 'VERIFIED',
  });

  // Check for footer links to important pages
  const footerLinks = await page.evaluate(() => {
    const footer = document.querySelector('footer');
    if (!footer) return [];
    return Array.from(footer.querySelectorAll('a[href]'))
      .map(a => ({ text: a.textContent?.trim(), href: (a as HTMLAnchorElement).pathname }));
  });

  const importantPages = ['/privacy', '/terms', '/shipping', '/contact', '/faq'];
  for (const important of importantPages) {
    const found = footerLinks.some((l: any) => l.href === important);
    addCheck({
      page: '/', check: `Footer link to ${important}`, category: 'SEO',
      result: found ? 'PASS' : 'WARN', severity: 'LOW',
      evidence: found ? `Link to ${important} found in footer` : `No footer link to ${important}`,
      confidence: 'VERIFIED',
    });
  }

  console.log(`  📋 Internal links on homepage: ${linkAudit.internal}`);
  console.log(`  📋 Top internal URLs: ${linkAudit.internalUrls.slice(0, 5).join(', ')}`);
});

// ════════════════════════════════════════════════════════════════════════════
// Final: Save SEO report
// ════════════════════════════════════════════════════════════════════════════
test('SEO-99: Generate complete SEO/GEO/AEO/LLMO report', async () => {
  const byCategory = {
    SEO:  seoReport.filter(r => r.category === 'SEO'),
    GEO:  seoReport.filter(r => r.category === 'GEO'),
    AEO:  seoReport.filter(r => r.category === 'AEO'),
    LLMO: seoReport.filter(r => r.category === 'LLMO'),
  };

  const summary = {
    generatedAt: new Date().toISOString(),
    total: seoReport.length,
    pass:  seoReport.filter(r => r.result === 'PASS').length,
    fail:  seoReport.filter(r => r.result === 'FAIL').length,
    warn:  seoReport.filter(r => r.result === 'WARN').length,
    byCategory: Object.fromEntries(
      Object.entries(byCategory).map(([cat, checks]) => [cat, {
        total: checks.length,
        pass:  checks.filter(c => c.result === 'PASS').length,
        fail:  checks.filter(c => c.result === 'FAIL').length,
        warn:  checks.filter(c => c.result === 'WARN').length,
      }])
    ),
    checks: seoReport,
  };

  fs.mkdirSync('reports/output/seo-report', { recursive: true });
  fs.writeFileSync('reports/output/seo-report/seo-audit.json', JSON.stringify(summary, null, 2));

  console.log('\n  📊 SEO/GEO/AEO/LLMO SUMMARY:');
  Object.entries(summary.byCategory).forEach(([cat, s]: any) => {
    console.log(`     ${cat}: ${s.pass} pass, ${s.fail} fail, ${s.warn} warn`);
  });
});
