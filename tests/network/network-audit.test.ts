/**
 * PHASE 10 — NETWORK AUDIT
 *
 * Captures and analyzes all network traffic:
 *  - XHR / Fetch requests
 *  - REST API calls to Supabase
 *  - WebSocket connections
 *  - Failed requests
 *  - Slow requests (>2s)
 *  - Duplicate/redundant requests
 *  - Unexpected third-party calls
 *  - Payload size analysis
 *
 * Generates: reports/output/network-audit.json
 */
import { test } from '@playwright/test';
import { screenshot, saveLog } from '../../utils/page-helpers';
import { coverage } from '../../utils/coverage-tracker';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

const BASE = process.env.BASE_URL || 'https://oopsie-woopsie-code.lovable.app';

interface NetworkEntry {
  url: string;
  method: string;
  status?: number;
  type: 'request' | 'response' | 'failed' | 'websocket';
  duration?: number;
  requestSize?: number;
  responseSize?: number;
  page: string;
  timestamp: number;
  isThirdParty: boolean;
  resourceType: string;
  error?: string;
}

const allEntries: NetworkEntry[] = [];

async function captureNetworkForPage(page: any, route: string) {
  const entries: NetworkEntry[] = [];
  const requestTimings: Map<string, number> = new Map();

  page.on('request', (req: any) => {
    const url = req.url();
    const ts = Date.now();
    requestTimings.set(url, ts);
    entries.push({
      url,
      method: req.method(),
      type: 'request',
      page: route,
      timestamp: ts,
      isThirdParty: !url.includes(new URL(BASE).hostname),
      resourceType: req.resourceType(),
      requestSize: req.postData()?.length || 0,
    });
  });

  page.on('response', async (res: any) => {
    const url = res.url();
    const startTs = requestTimings.get(url) || Date.now();
    const duration = Date.now() - startTs;
    let responseSize = 0;

    try {
      const body = await res.body();
      responseSize = body.length;
    } catch {}

    entries.push({
      url,
      method: res.request().method(),
      status: res.status(),
      type: 'response',
      duration,
      responseSize,
      page: route,
      timestamp: Date.now(),
      isThirdParty: !url.includes(new URL(BASE).hostname),
      resourceType: res.request().resourceType(),
    });
  });

  page.on('requestfailed', (req: any) => {
    entries.push({
      url: req.url(),
      method: req.method(),
      type: 'failed',
      error: req.failure()?.errorText,
      page: route,
      timestamp: Date.now(),
      isThirdParty: !req.url().includes(new URL(BASE).hostname),
      resourceType: req.resourceType(),
    });
  });

  page.on('websocket', (ws: any) => {
    entries.push({
      url: ws.url(),
      method: 'WS',
      type: 'websocket',
      page: route,
      timestamp: Date.now(),
      isThirdParty: !ws.url().includes(new URL(BASE).hostname),
      resourceType: 'websocket',
    });
    console.log(`  🔌 WebSocket detected: ${ws.url()}`);
  });

  await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  return entries;
}

// ════════════════════════════════════════════════════════════════════════════
// TEST: Capture network traffic on all key pages
// ════════════════════════════════════════════════════════════════════════════
test('NET-01: Full network capture — all pages', async ({ page }) => {
  const PAGES_TO_AUDIT = ['/', '/products', '/faq', '/contact', '/about', '/shipping', '/track-order'];

  for (const route of PAGES_TO_AUDIT) {
    console.log(`\n  📡 Capturing network for ${route}...`);
    const entries = await captureNetworkForPage(page, route);
    allEntries.push(...entries);

    const responses     = entries.filter(e => e.type === 'response');
    const failed        = entries.filter(e => e.type === 'failed');
    const slow          = responses.filter(e => (e.duration || 0) > 2000);
    const thirdParty    = entries.filter(e => e.isThirdParty && e.type === 'response');
    const supabaseCalls = entries.filter(e => e.url?.includes('supabase'));

    console.log(`     Responses:     ${responses.length}`);
    console.log(`     Failed:        ${failed.length}  ${failed.length > 0 ? '⚠️ ' : ''}`);
    console.log(`     Slow (>2s):    ${slow.length}    ${slow.length > 0 ? '⚠️ ' : ''}`);
    console.log(`     Third-party:   ${thirdParty.length}`);
    console.log(`     Supabase:      ${supabaseCalls.length}`);

    if (failed.length > 0) {
      failed.forEach(f => {
        console.warn(`     ❌ FAILED: ${f.method} ${f.url?.slice(0, 100)}: ${f.error}`);
        coverage.addSecurityFinding({
          type: 'NETWORK_ERROR',
          severity: 'HIGH',
          description: `Failed network request on ${route}: ${f.url}`,
          evidence: `Request to ${f.url} failed with: ${f.error}`,
          reproSteps: [`1. Navigate to ${route}`, '2. Monitor Network tab', `3. Observe failed request: ${f.url}`],
          confidence: 'VERIFIED',
        });
      });
    }

    if (slow.length > 0) {
      slow.forEach(s => console.warn(`     ⏱️  SLOW: ${s.url?.slice(0, 80)} — ${s.duration}ms`));
    }
  }

  await screenshot(page, 'net01-network-complete');
});

// ════════════════════════════════════════════════════════════════════════════
// TEST: Admin panel network capture
// ════════════════════════════════════════════════════════════════════════════
test('NET-02: Admin panel network traffic', async ({ page }) => {
  const ADMIN_PAGES = ['/admin', '/admin/products', '/admin/orders', '/admin/users', '/admin/settings'];

  for (const route of ADMIN_PAGES) {
    console.log(`\n  📡 Admin network: ${route}`);
    const entries = await captureNetworkForPage(page, route);
    allEntries.push(...entries);

    if (page.url().includes('/login')) {
      console.warn(`     ⚠️  ${route} — redirected to login, not capturing admin traffic`);
      continue;
    }

    const apiCalls = entries.filter(e => e.url?.includes('supabase') || e.url?.includes('/api/'));
    apiCalls.forEach(c => {
      console.log(`     ${c.status || 'REQ'} ${c.method} ${c.url?.slice(0, 100)} (${c.duration}ms)`);
      coverage.addDiscoveredApi(c.url!, c.method, `admin-${route}`);
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// TEST: Detect duplicate / redundant API calls
// ════════════════════════════════════════════════════════════════════════════
test('NET-03: Detect duplicate API calls (React re-renders)', async ({ page }) => {
  const networkLog: { url: string; method: string; ts: number }[] = [];

  page.on('request', (req: any) => {
    if (req.url().includes('supabase') || req.url().includes('/api/')) {
      networkLog.push({ url: req.url(), method: req.method(), ts: Date.now() });
    }
  });

  await page.goto(`${BASE}/products`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // Count duplicate requests (same URL + method within 5s)
  const urlCounts: Record<string, number> = {};
  networkLog.forEach(r => {
    const key = `${r.method}:${r.url}`;
    urlCounts[key] = (urlCounts[key] || 0) + 1;
  });

  const duplicates = Object.entries(urlCounts).filter(([, count]) => count > 1);

  if (duplicates.length > 0) {
    console.warn(`  ⚠️  DUPLICATE API CALLS DETECTED:`);
    duplicates.forEach(([key, count]) => {
      console.warn(`     ${count}x ${key}`);
      coverage.addSecurityFinding({
        type: 'PERFORMANCE',
        severity: 'MEDIUM',
        description: `Duplicate API call: ${key} called ${count} times on single page load`,
        evidence: `Observed ${count} identical requests to ${key} within 3 seconds of page load`,
        reproSteps: ['1. Navigate to /products', '2. Monitor Network tab', `3. Observe ${count} calls to ${key}`],
        confidence: 'VERIFIED',
      });
    });
  } else {
    console.log('  ✅ No duplicate API calls detected');
  }

  console.log(`  📡 Total API calls on /products: ${networkLog.length}`);
  saveLog('net03-duplicates', { urlCounts, duplicates, networkLog });
});

// ════════════════════════════════════════════════════════════════════════════
// TEST: Third-party requests audit (tracking, analytics, CDNs)
// ════════════════════════════════════════════════════════════════════════════
test('NET-04: Third-party requests — analytics and tracking inventory', async ({ page }) => {
  const thirdPartyDomains: Record<string, number> = {};

  page.on('request', (req: any) => {
    const url = req.url();
    try {
      const hostname = new URL(url).hostname;
      if (!hostname.includes(new URL(BASE).hostname)) {
        thirdPartyDomains[hostname] = (thirdPartyDomains[hostname] || 0) + 1;
      }
    } catch {}
  });

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.goto(`${BASE}/products`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  console.log('\n  📋 THIRD-PARTY DOMAINS CALLED:');
  Object.entries(thirdPartyDomains).forEach(([domain, count]) => {
    const knownTrackers: Record<string, string> = {
      'google-analytics.com': 'GA4',
      'analytics.google.com': 'GA4',
      'googletagmanager.com': 'GTM',
      'facebook.net': 'Meta Pixel',
      'connect.facebook.net': 'Meta Pixel',
      'googleadservices.com': 'Google Ads',
      'doubleclick.net': 'Google Ads',
      'linkedin.com': 'LinkedIn Insight',
      'snap.licdn.com': 'LinkedIn Insight',
      'hotjar.com': 'Hotjar',
      'clarity.ms': 'Microsoft Clarity',
    };

    const label = knownTrackers[domain] || 'Unknown/CDN';
    console.log(`     ${domain} (${count} calls) — ${label}`);
    coverage.addAnalyticsFinding({
      event: `Third-party: ${domain}`,
      tool: label,
      fired: count > 0,
      params: { callCount: count },
      notes: `Detected on homepage/products page`,
    });
  });

  const hasGA4   = Object.keys(thirdPartyDomains).some(d => d.includes('google-analytics') || d.includes('analytics.google'));
  const hasGTM   = Object.keys(thirdPartyDomains).some(d => d.includes('googletagmanager'));
  const hasMeta  = Object.keys(thirdPartyDomains).some(d => d.includes('facebook'));
  const hasAds   = Object.keys(thirdPartyDomains).some(d => d.includes('googleadservices') || d.includes('doubleclick'));

  console.log('\n  📊 ANALYTICS PRESENCE:');
  console.log(`     GA4:          ${hasGA4   ? '✅ Present' : '❌ MISSING'}`);
  console.log(`     GTM:          ${hasGTM   ? '✅ Present' : '❌ MISSING'}`);
  console.log(`     Meta Pixel:   ${hasMeta  ? '✅ Present' : '❌ MISSING'}`);
  console.log(`     Google Ads:   ${hasAds   ? '✅ Present' : '❌ MISSING'}`);

  saveLog('net04-third-party', thirdPartyDomains);

  fs.mkdirSync('reports/output/analytics-report', { recursive: true });
  fs.writeFileSync('reports/output/analytics-report/third-party-inventory.json',
    JSON.stringify({ thirdPartyDomains, analytics: { hasGA4, hasGTM, hasMeta, hasAds } }, null, 2));
});

// ════════════════════════════════════════════════════════════════════════════
// TEST: Payload size and compression
// ════════════════════════════════════════════════════════════════════════════
test('NET-05: Response payload sizes and compression', async ({ page }) => {
  const largResponses: { url: string; size: number; compressed: boolean }[] = [];

  page.on('response', async (res: any) => {
    const url = res.url();
    const contentEncoding = res.headers()['content-encoding'] || '';
    const isCompressed = contentEncoding.includes('gzip') || contentEncoding.includes('br') || contentEncoding.includes('zstd');
    let size = 0;
    try { const body = await res.body(); size = body.length; } catch {}

    if (size > 100 * 1024) { // flag anything > 100KB
      largResponses.push({ url: url.slice(0, 100), size, compressed: isCompressed });
    }
  });

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  if (largResponses.length > 0) {
    console.log('  ⚠️  LARGE RESPONSES:');
    largResponses.forEach(r => {
      console.log(`     ${(r.size / 1024).toFixed(1)}KB ${r.compressed ? '(compressed)' : '⚠️  NOT COMPRESSED'} — ${r.url}`);
    });
  } else {
    console.log('  ✅ No responses >100KB detected');
  }

  saveLog('net05-payload-sizes', largResponses);
});

// ════════════════════════════════════════════════════════════════════════════
// Final: Save complete network audit
// ════════════════════════════════════════════════════════════════════════════
test('NET-99: Generate network audit report', async () => {
  const report = {
    generatedAt: new Date().toISOString(),
    totalRequests: allEntries.filter(e => e.type === 'request').length,
    totalResponses: allEntries.filter(e => e.type === 'response').length,
    failed: allEntries.filter(e => e.type === 'failed').length,
    websockets: allEntries.filter(e => e.type === 'websocket').length,
    slowRequests: allEntries.filter(e => (e.duration || 0) > 2000).length,
    entries: allEntries,
  };

  fs.mkdirSync('reports/output', { recursive: true });
  fs.writeFileSync('reports/output/network-audit.json', JSON.stringify(report, null, 2));
  console.log(`\n  📊 Network audit: ${report.totalRequests} req, ${report.failed} failed, ${report.slowRequests} slow`);
});
