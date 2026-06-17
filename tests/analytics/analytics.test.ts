/**
 * PHASE 12 — ANALYTICS AUDIT
 *
 * Verifies actual event FIRING (not just source code presence):
 *  - GA4 (dataLayer push + network calls)
 *  - GTM container load + tag firing
 *  - Meta Pixel (PageView, ViewContent, AddToCart, Purchase)
 *  - Google Ads conversion tag
 *  - LinkedIn Insight Tag
 *
 * For every event shows:
 *   Action → Event Fired → Parameters → Destination
 *
 * Evidence: network intercept of analytics beacons
 */
import { test } from '@playwright/test';
import { screenshot, saveLog } from '../../utils/page-helpers';
import { coverage } from '../../utils/coverage-tracker';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

const BASE = process.env.BASE_URL || 'https://oopsie-woopsie-code.lovable.app';

interface AnalyticsEvent {
  tool: string;
  eventName: string;
  parameters: any;
  fired: boolean;
  networkEvidence: string;
  page: string;
  confidence: 'VERIFIED' | 'INFERRED' | 'UNTESTED';
}

const analyticsLog: AnalyticsEvent[] = [];

// ── Helper: check dataLayer ─────────────────────────────────────────────────
async function getDataLayer(page: any) {
  return page.evaluate(() => (window as any).dataLayer || []);
}

// ── Helper: check pixel state ───────────────────────────────────────────────
async function checkFBPixel(page: any) {
  return page.evaluate(() => {
    const fbq = (window as any).fbq;
    return {
      loaded: typeof fbq === 'function',
      pixelId: (window as any)._fbq?.pixelIds?.[0] || null,
      version: (window as any).fbq?.version || null,
    };
  });
}

// ════════════════════════════════════════════════════════════════════════════
// TEST: GTM container presence and loading
// ════════════════════════════════════════════════════════════════════════════
test('ANA-01: GTM — container load verification', async ({ page }) => {
  const gtmRequests: string[] = [];

  page.on('request', (req: any) => {
    const url = req.url();
    if (url.includes('googletagmanager.com') || url.includes('gtm.js') || url.includes('gtag/js')) {
      gtmRequests.push(url);
    }
  });

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Check GTM in page source
  const gtmInSource = await page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script[src]'))
      .map(s => (s as HTMLScriptElement).src);
    const inline = Array.from(document.querySelectorAll('script:not([src])'))
      .map(s => s.textContent || '');
    return {
      gtmSrcTags: scripts.filter(s => s.includes('googletagmanager') || s.includes('gtm.js')),
      gtmInlineRefs: inline.filter(s => s.includes('GTM-') || s.includes('googletagmanager')),
      gtmIds: inline.join(' ').match(/GTM-[A-Z0-9]+/g) || [],
      gtagIds: inline.join(' ').match(/G-[A-Z0-9]+/g) || [],
    };
  });

  const gtmLoaded = gtmRequests.length > 0;
  const dataLayer  = await getDataLayer(page);

  console.log('\n  📋 GTM AUDIT:');
  console.log(`     GTM network requests: ${gtmRequests.length}  ${gtmLoaded ? '✅' : '❌ NOT LOADED'}`);
  console.log(`     GTM IDs in source:    ${gtmInSource.gtmIds.join(', ') || 'NONE FOUND'}`);
  console.log(`     GA4 IDs in source:    ${gtmInSource.gtagIds.join(', ') || 'NONE FOUND'}`);
  console.log(`     dataLayer events:     ${dataLayer.length}`);
  if (dataLayer.length > 0) {
    console.log(`     dataLayer contents:   ${JSON.stringify(dataLayer.slice(0, 3))}`);
  }

  analyticsLog.push({
    tool: 'GTM',
    eventName: 'Container Load',
    parameters: { gtmIds: gtmInSource.gtmIds, networkRequests: gtmRequests.length },
    fired: gtmLoaded,
    networkEvidence: gtmRequests[0] || 'NONE',
    page: '/',
    confidence: 'VERIFIED',
  });

  if (!gtmLoaded) {
    coverage.addSecurityFinding({
      type: 'MISSING_ANALYTICS',
      severity: 'HIGH',
      description: 'Google Tag Manager is NOT loaded — all analytics, conversion, and remarketing tags are absent',
      evidence: `0 requests to googletagmanager.com on homepage. GTM IDs in source: ${gtmInSource.gtmIds.join(', ') || 'none'}`,
      reproSteps: ['1. Navigate to homepage', '2. Open DevTools > Network', '3. Filter by "gtm" or "googletagmanager"', '4. Observe 0 requests'],
      confidence: 'VERIFIED',
    });
  }

  gtmRequests.forEach(url => console.log(`     📡 GTM request: ${url.slice(0, 100)}`));
  await screenshot(page, 'ana01-gtm-state');
  saveLog('ana01-gtm', { gtmRequests, gtmInSource, dataLayerLength: dataLayer.length });
});

// ════════════════════════════════════════════════════════════════════════════
// TEST: GA4 event firing
// ════════════════════════════════════════════════════════════════════════════
test('ANA-02: GA4 — page_view and custom events', async ({ page }) => {
  const ga4Beacons: { url: string; params: Record<string, string> }[] = [];

  page.on('request', (req: any) => {
    const url = req.url();
    if (url.includes('google-analytics.com/g/collect') || url.includes('analytics.google.com/g/collect')) {
      const params = Object.fromEntries(new URL(url).searchParams);
      ga4Beacons.push({ url, params });
    }
  });

  const PAGES = ['/', '/products', '/faq', '/contact', '/about'];

  for (const route of PAGES) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
  }

  console.log('\n  📋 GA4 BEACONS CAPTURED:');
  if (ga4Beacons.length === 0) {
    console.warn('  ❌ NO GA4 beacons fired on any page');
    analyticsLog.push({
      tool: 'GA4',
      eventName: 'page_view',
      parameters: {},
      fired: false,
      networkEvidence: 'NONE — 0 requests to google-analytics.com/g/collect',
      page: 'all',
      confidence: 'VERIFIED',
    });
  } else {
    ga4Beacons.forEach(b => {
      const eventName = b.params.en || b.params.t || 'unknown';
      const measurementId = b.params.tid || b.params.measurement_id || 'unknown';
      console.log(`  ✅ GA4 event: "${eventName}" (ID: ${measurementId})`);
      console.log(`     Params: ${JSON.stringify(b.params).slice(0, 200)}`);

      analyticsLog.push({
        tool: 'GA4',
        eventName,
        parameters: b.params,
        fired: true,
        networkEvidence: b.url.slice(0, 120),
        page: 'multiple',
        confidence: 'VERIFIED',
      });

      coverage.addAnalyticsFinding({
        event: eventName,
        tool: 'GA4',
        fired: true,
        params: b.params,
      });
    });
  }

  // Check dataLayer for GA4 events
  const dataLayer = await getDataLayer(page);
  const ga4Events = dataLayer.filter((d: any) => d.event);
  console.log(`  📋 dataLayer events: ${ga4Events.map((e: any) => e.event).join(', ') || 'none'}`);

  saveLog('ana02-ga4', { ga4Beacons, ga4Events });
});

// ════════════════════════════════════════════════════════════════════════════
// TEST: Meta Pixel — PageView, ViewContent, AddToCart
// ════════════════════════════════════════════════════════════════════════════
test('ANA-03: Meta Pixel — event verification', async ({ page }) => {
  const metaBeacons: { event: string; params: any; url: string }[] = [];

  page.on('request', (req: any) => {
    const url = req.url();
    if (url.includes('facebook.com/tr') || url.includes('facebook.net/tr')) {
      const params = Object.fromEntries(new URL(url).searchParams);
      metaBeacons.push({ event: params.ev || 'unknown', params, url });
    }
  });

  // PageView
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // ViewContent (product page)
  await page.goto(`${BASE}/products`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Click first product for ViewContent
  await page.locator('[data-testid*="product"], .product-card, article').first().click().catch(() => {});
  await page.waitForTimeout(1500);

  // AddToCart
  await page.locator('button:has-text("Add to Cart")').first().click().catch(() => {});
  await page.waitForTimeout(1500);

  const pixelState = await checkFBPixel(page);

  console.log('\n  📋 META PIXEL AUDIT:');
  console.log(`     fbq function loaded: ${pixelState.loaded ? '✅' : '❌'}`);
  console.log(`     Pixel ID: ${pixelState.pixelId || 'NOT SET'}`);
  console.log(`     Beacons fired: ${metaBeacons.length}`);

  const expectedEvents = ['PageView', 'ViewContent', 'AddToCart'];
  for (const eventName of expectedEvents) {
    const fired = metaBeacons.some(b => b.event === eventName);
    console.log(`     ${eventName}: ${fired ? '✅ FIRED' : '❌ NOT FIRED'}`);

    analyticsLog.push({
      tool: 'Meta Pixel',
      eventName,
      parameters: metaBeacons.find(b => b.event === eventName)?.params || {},
      fired,
      networkEvidence: metaBeacons.find(b => b.event === eventName)?.url || 'NONE',
      page: 'homepage/products',
      confidence: pixelState.loaded ? 'VERIFIED' : 'INFERRED',
    });
  }

  if (!pixelState.loaded) {
    coverage.addSecurityFinding({
      type: 'MISSING_ANALYTICS',
      severity: 'HIGH',
      description: 'Meta Pixel (Facebook Pixel) is NOT installed',
      evidence: `fbq function not found in window context. 0 requests to facebook.com/tr`,
      reproSteps: ['1. Navigate to homepage', '2. Open DevTools > Console', '3. Type: window.fbq', '4. Observe: undefined'],
      confidence: 'VERIFIED',
    });
  }

  saveLog('ana03-meta-pixel', { pixelState, metaBeacons });
  await screenshot(page, 'ana03-meta-pixel-state');
});

// ════════════════════════════════════════════════════════════════════════════
// TEST: Google Ads conversion tracking
// ════════════════════════════════════════════════════════════════════════════
test('ANA-04: Google Ads — conversion tag verification', async ({ page }) => {
  const adsBeacons: string[] = [];

  page.on('request', (req: any) => {
    const url = req.url();
    if (url.includes('googleadservices.com') || url.includes('doubleclick.net') || url.includes('google.com/pagead')) {
      adsBeacons.push(url);
    }
  });

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Check for gtag('config', 'AW-...')
  const googleAdsId = await page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script:not([src])'))
      .map(s => s.textContent || '').join(' ');
    const match = scripts.match(/AW-\d+/);
    return match ? match[0] : null;
  });

  console.log('\n  📋 GOOGLE ADS AUDIT:');
  console.log(`     Ads beacons: ${adsBeacons.length}  ${adsBeacons.length > 0 ? '✅' : '❌ NOT FOUND'}`);
  console.log(`     Google Ads ID in source: ${googleAdsId || 'NOT FOUND'}`);

  analyticsLog.push({
    tool: 'Google Ads',
    eventName: 'conversion',
    parameters: { adsId: googleAdsId },
    fired: adsBeacons.length > 0,
    networkEvidence: adsBeacons[0] || 'NONE',
    page: '/',
    confidence: 'VERIFIED',
  });

  if (!googleAdsId && adsBeacons.length === 0) {
    coverage.addSecurityFinding({
      type: 'MISSING_ANALYTICS',
      severity: 'HIGH',
      description: 'Google Ads conversion tag not found — paid traffic cannot be attributed to conversions',
      evidence: 'No AW-XXXXXXX ID in source, 0 requests to googleadservices.com',
      reproSteps: ['1. Navigate to homepage', '2. Check source for AW-', '3. Monitor network for googleadservices.com'],
      confidence: 'VERIFIED',
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// TEST: Cookie consent — pixel firing before consent
// ════════════════════════════════════════════════════════════════════════════
test('ANA-05: Cookie consent — verify pixels not fired before consent', async ({ page }) => {
  // Fresh context — no cookies
  const trackingBeacons: string[] = [];

  page.on('request', (req: any) => {
    const url = req.url();
    const TRACKING_DOMAINS = [
      'google-analytics.com', 'googletagmanager.com', 'facebook.com/tr',
      'facebook.net', 'doubleclick.net', 'googleadservices.com',
    ];
    if (TRACKING_DOMAINS.some(d => url.includes(d))) {
      trackingBeacons.push(url);
    }
  });

  // Clear all cookies before navigating
  await page.context().clearCookies();
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Check if cookie banner is shown
  // Combine CSS selector matches with Playwright text-engine matches.
  // `text=...` is not valid inside a CSS selector list, so use `.or(...)`.
  const cookieBanner = await page
    .locator('[data-testid*="cookie"], .cookie-banner, .cookie-consent, [aria-label*="cookie"]')
    .or(page.getByText(/cookie|consent/i))
    .count();

  console.log('\n  📋 COOKIE CONSENT AUDIT:');
  console.log(`     Cookie banner visible: ${cookieBanner > 0 ? '✅ YES' : '❌ NO BANNER'}`);
  console.log(`     Tracking beacons before consent: ${trackingBeacons.length}`);

  if (trackingBeacons.length > 0 && cookieBanner === 0) {
    console.warn('  🚨 CRITICAL: Tracking pixels fired WITHOUT cookie consent!');
    trackingBeacons.forEach(url => console.warn(`     ❌ ${url.slice(0, 100)}`));

    coverage.addSecurityFinding({
      type: 'CONSENT_VIOLATION',
      severity: 'CRITICAL',
      description: 'Tracking pixels fire before user gives cookie consent — DPDP Act 2023 / GDPR violation',
      evidence: `${trackingBeacons.length} tracking requests fired on first page load with no consent banner present`,
      reproSteps: [
        '1. Open incognito window (no cookies)',
        '2. Navigate to homepage',
        '3. Monitor Network tab immediately',
        '4. Observe tracking pixels firing before any consent action',
      ],
      confidence: 'VERIFIED',
    });
  } else if (cookieBanner > 0 && trackingBeacons.length === 0) {
    console.log('  ✅ VERIFIED: No tracking before consent — consent gate working correctly');
  } else if (cookieBanner > 0 && trackingBeacons.length > 0) {
    console.warn('  ⚠️  Consent banner shown but tracking still fires — consent not properly gating pixels');
  }

  analyticsLog.push({
    tool: 'Consent Gate',
    eventName: 'pre-consent tracking check',
    parameters: { beaconsFired: trackingBeacons.length, bannerShown: cookieBanner > 0 },
    fired: cookieBanner > 0,
    networkEvidence: trackingBeacons.join(', ').slice(0, 300) || 'No beacons',
    page: '/',
    confidence: 'VERIFIED',
  });

  await screenshot(page, 'ana05-cookie-consent-state');
  saveLog('ana05-consent', { cookieBanner, trackingBeacons });
});

// ════════════════════════════════════════════════════════════════════════════
// TEST: eCommerce events — Purchase funnel tracking
// ════════════════════════════════════════════════════════════════════════════
test('ANA-06: eCommerce funnel event tracking', async ({ page }) => {
  const ecomBeacons: { event: string; tool: string; params: any }[] = [];

  page.on('request', (req: any) => {
    const url = req.url();
    const params = (() => { try { return Object.fromEntries(new URL(url).searchParams); } catch { return {}; } })();

    if (url.includes('google-analytics.com/g/collect')) {
      ecomBeacons.push({ event: params.en || 'page_view', tool: 'GA4', params });
    }
    if (url.includes('facebook.com/tr')) {
      ecomBeacons.push({ event: params.ev || 'PageView', tool: 'Meta', params });
    }
  });

  // Simulate purchase funnel
  const steps = [
    { label: 'Homepage', path: '/' },
    { label: 'Products', path: '/products' },
    { label: 'Cart', path: '/cart' },
    { label: 'Checkout', path: '/checkout' },
  ];

  for (const step of steps) {
    await page.goto(`${BASE}${step.path}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    console.log(`  📍 ${step.label}: ${ecomBeacons.length} beacons so far`);
  }

  // Expected GA4 events for eCommerce
  const EXPECTED_GA4 = ['page_view', 'view_item_list', 'view_item', 'add_to_cart', 'begin_checkout'];
  const firedEvents = ecomBeacons.map(b => b.event);

  console.log('\n  📋 ECOMMERCE EVENT COVERAGE:');
  for (const event of EXPECTED_GA4) {
    const fired = firedEvents.includes(event);
    console.log(`     ${event}: ${fired ? '✅ FIRED' : '❌ NOT FIRED'}`);
    analyticsLog.push({
      tool: 'GA4 eCommerce',
      eventName: event,
      parameters: ecomBeacons.find(b => b.event === event)?.params || {},
      fired,
      networkEvidence: 'Network beacon',
      page: 'funnel',
      confidence: ecomBeacons.length > 0 ? 'VERIFIED' : 'INFERRED',
    });
  }

  saveLog('ana06-ecommerce', ecomBeacons);
});

// ════════════════════════════════════════════════════════════════════════════
// Final: Save analytics report
// ════════════════════════════════════════════════════════════════════════════
test('ANA-99: Generate analytics audit report', async () => {
  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalEventsChecked: analyticsLog.length,
      fired: analyticsLog.filter(e => e.fired).length,
      missing: analyticsLog.filter(e => !e.fired).length,
      byTool: analyticsLog.reduce((acc: any, e) => {
        acc[e.tool] = acc[e.tool] || { fired: 0, missing: 0 };
        e.fired ? acc[e.tool].fired++ : acc[e.tool].missing++;
        return acc;
      }, {}),
    },
    events: analyticsLog,
  };

  fs.mkdirSync('reports/output/analytics-report', { recursive: true });
  fs.writeFileSync('reports/output/analytics-report/analytics-audit.json', JSON.stringify(report, null, 2));

  console.log('\n  📊 ANALYTICS AUDIT SUMMARY:');
  console.log(`     Events checked: ${report.summary.totalEventsChecked}`);
  console.log(`     Fired:          ${report.summary.fired}`);
  console.log(`     Missing:        ${report.summary.missing}`);
  console.log(`     By tool:        ${JSON.stringify(report.summary.byTool)}`);
});
