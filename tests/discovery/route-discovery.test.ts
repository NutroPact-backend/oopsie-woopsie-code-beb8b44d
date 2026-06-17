/**
 * PHASE 1 & 3 — ROUTE DISCOVERY
 *
 * Crawls the entire site from the root, following internal links recursively.
 * Builds a complete route inventory.
 * Detects: 404s, redirects, broken pages, page titles, meta description presence.
 *
 * Output: reports/output/coverage/route-inventory.json
 */
import { test, expect } from '@playwright/test';
import { coverage } from '../../utils/coverage-tracker';
import { collectLinks, screenshot, attachConsoleLogger } from '../../utils/page-helpers';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

const BASE = process.env.BASE_URL || 'https://oopsie-woopsie-code.lovable.app';

// Known routes to seed the discovery (Lovable / Supabase app patterns)
const SEED_ROUTES = [
  '/',
  '/products',
  '/products/whey-protein',
  '/products/creatine',
  '/categories',
  '/about',
  '/faq',
  '/contact',
  '/shipping',
  '/refund',
  '/privacy',
  '/terms',
  '/blog',
  '/login',
  '/sign-in',
  '/signup',
  '/register',
  '/account',
  '/account/orders',
  '/account/wallet',
  '/account/profile',
  '/cart',
  '/checkout',
  '/checkout/payment',
  '/order-confirmation',
  '/track-order',
  '/admin',
  '/admin/dashboard',
  '/admin/products',
  '/admin/products/new',
  '/admin/categories',
  '/admin/orders',
  '/admin/users',
  '/admin/media',
  '/admin/settings',
  '/admin/settings/seo',
  '/admin/settings/integrations',
  '/admin/coupons',
  '/admin/analytics',
  '/admin/nutropay',
  '/coa',
  '/robots.txt',
  '/sitemap.xml',
  '/llms.txt',
];

interface RouteResult {
  path: string;
  status: number | null;
  title: string;
  metaDescription: string;
  h1: string;
  hasErrors: boolean;
  consoleErrors: string[];
  redirectedTo: string | null;
  loadTimeMs: number;
  linksFound: string[];
  formsFound: number;
  source: 'seed' | 'crawled';
}

const visited = new Set<string>();
const results: RouteResult[] = [];

async function auditRoute(page: any, path: string, source: 'seed' | 'crawled'): Promise<RouteResult> {
  if (visited.has(path)) return null as any;
  visited.add(path);

  const consoleErrors: string[] = [];
  page.on('console', (msg: any) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  const startTime = Date.now();
  let status: number | null = null;
  let redirectedTo: string | null = null;

  try {
    const response = await page.goto(`${BASE}${path}`, {
      waitUntil: 'networkidle',
      timeout: 20000,
    });

    status = response?.status() || null;
    const finalUrl = page.url();
    if (!finalUrl.endsWith(path) && !finalUrl.includes(path)) {
      redirectedTo = finalUrl.replace(BASE, '');
    }
  } catch (e: any) {
    status = null;
    consoleErrors.push(`Navigation error: ${e.message}`);
  }

  const loadTimeMs = Date.now() - startTime;

  // Extract page metadata
  const title = await page.title().catch(() => '');
  const metaDescription = await page
    .$eval('meta[name="description"]', (el: any) => el.content)
    .catch(() => '');
  const h1 = await page
    .$eval('h1', (el: any) => el.textContent?.trim())
    .catch(() => '');
  const formsFound = await page.$$eval('form', (f: any[]) => f.length).catch(() => 0);
  const links = await collectLinks(page).catch(() => []);

  const result: RouteResult = {
    path,
    status,
    title,
    metaDescription,
    h1,
    hasErrors: consoleErrors.length > 0,
    consoleErrors,
    redirectedTo,
    loadTimeMs,
    linksFound: links,
    formsFound,
    source,
  };

  // Register in coverage tracker
  coverage.addDiscoveredRoute(path, { title, status, source });
  coverage.markRouteTested(path, status === 200 ? 'pass' : 'fail', `Status: ${status}`);

  return result;
}

// ════════════════════════════════════════════════════════════════════════════
// TEST: Discover all routes
// ════════════════════════════════════════════════════════════════════════════
test('DISC-01: Crawl all seed routes and discover additional pages', async ({ page }) => {
  // Test seed routes
  for (const route of SEED_ROUTES) {
    const result = await auditRoute(page, route, 'seed');
    if (result) {
      results.push(result);
      console.log(
        `  ${result.status === 200 ? '✅' : result.status === 404 ? '❌' : '⚠️ '} ` +
        `[${result.status}] ${result.path} ${result.redirectedTo ? '→ ' + result.redirectedTo : ''} ` +
        `(${result.loadTimeMs}ms)`
      );

      // Crawl discovered links recursively (1 level deep)
      for (const link of result.linksFound) {
        if (!visited.has(link) && !SEED_ROUTES.includes(link)) {
          const subResult = await auditRoute(page, link, 'crawled');
          if (subResult) {
            results.push(subResult);
            console.log(
              `    ${subResult.status === 200 ? '✅' : '⚠️ '} [CRAWLED] [${subResult.status}] ${subResult.path}`
            );
          }
        }
      }
    }
  }

  // Save route inventory
  const inventory = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE,
    totalDiscovered: results.length,
    live: results.filter(r => r.status === 200).length,
    notFound: results.filter(r => r.status === 404).length,
    errors: results.filter(r => r.status === null || (r.status >= 500)).length,
    redirects: results.filter(r => r.redirectedTo).length,
    withErrors: results.filter(r => r.hasErrors).length,
    routes: results,
  };

  fs.mkdirSync('reports/output/coverage', { recursive: true });
  fs.writeFileSync('reports/output/coverage/route-inventory.json', JSON.stringify(inventory, null, 2));

  console.log('\n  📊 ROUTE DISCOVERY SUMMARY:');
  console.log(`     Total:     ${inventory.totalDiscovered}`);
  console.log(`     Live:      ${inventory.live}`);
  console.log(`     404:       ${inventory.notFound}`);
  console.log(`     Errors:    ${inventory.errors}`);
  console.log(`     Redirects: ${inventory.redirects}`);
  console.log(`     With JS errors: ${inventory.withErrors}`);

  // ASSERTIONS
  const notFoundRoutes = results.filter(r => r.status === 404 && SEED_ROUTES.includes(r.path));
  if (notFoundRoutes.length > 0) {
    console.warn(`  ⚠️  Missing expected routes: ${notFoundRoutes.map(r => r.path).join(', ')}`);
  }

  const withoutMeta = results.filter(r => r.status === 200 && !r.metaDescription);
  if (withoutMeta.length > 0) {
    console.warn(`  ⚠️  Pages without meta description: ${withoutMeta.map(r => r.path).join(', ')}`);
  }

  expect(inventory.live).toBeGreaterThan(0);
});

// ════════════════════════════════════════════════════════════════════════════
// TEST: Admin panel structure discovery
// ════════════════════════════════════════════════════════════════════════════
test('DISC-02: Admin panel section discovery', async ({ page }) => {
  // This test uses the admin auth state
  await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
  await screenshot(page, 'disc02-admin-panel');

  const adminUrl = page.url();
  console.log(`  📍 Admin URL after navigation: ${adminUrl}`);

  if (adminUrl.includes('/login') || adminUrl.includes('/sign-in')) {
    console.warn('  ⚠️  FINDING: /admin redirected to login — admin auth state not loaded or session expired');
    return;
  }

  // Discover admin sidebar links
  const navSelectors = ['nav a', '.sidebar a', '[data-testid*="nav"] a', 'aside a', '[role="navigation"] a'];
  const adminLinks: Array<{ text: string; href: string }> = [];

  for (const sel of navSelectors) {
    const links = await page.$$eval(sel, (els: any[]) =>
      els.map(el => ({ text: el.textContent?.trim(), href: el.getAttribute('href') }))
        .filter(l => l.href && !l.href.startsWith('#'))
    ).catch(() => []);
    adminLinks.push(...links);
  }

  console.log(`  📋 Admin navigation links found: ${adminLinks.length}`);
  adminLinks.forEach(l => {
    console.log(`     - "${l.text}" → ${l.href}`);
    if (l.href) coverage.addDiscoveredRoute(l.href, { section: 'admin', label: l.text });
  });

  // Visit each admin section
  for (const link of adminLinks.slice(0, 15)) { // cap at 15 for speed
    if (!link.href) continue;
    const fullUrl = link.href.startsWith('http') ? link.href : `${BASE}${link.href}`;
    try {
      await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 15000 });
      await screenshot(page, `disc02-admin-${link.text?.replace(/\s+/g, '-').toLowerCase()}`);
      const status = await page.evaluate(() => document.readyState);
      console.log(`     ✅ ${link.text}: ${page.url()} (readyState: ${status})`);
    } catch (e: any) {
      console.warn(`     ❌ ${link.text}: ${e.message}`);
    }
  }

  const adminInventory = { adminLinks, discoveredAt: new Date().toISOString() };
  fs.writeFileSync('reports/output/coverage/admin-inventory.json', JSON.stringify(adminInventory, null, 2));
});
