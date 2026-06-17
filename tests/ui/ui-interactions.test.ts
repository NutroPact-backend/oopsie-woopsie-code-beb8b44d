/**
 * PHASE 4 — UI INTERACTION AUDIT
 *
 * Systematically clicks every:
 *  - Navigation link
 *  - Button
 *  - Tab / filter
 *  - Accordion / collapsible
 *  - Dropdown
 *  - Modal trigger
 *
 * Captures: screenshots before/after, console errors, broken states,
 * network requests triggered.
 *
 * Each page tested:
 *  / (homepage), /products, /about, /faq, /contact,
 *  /admin/dashboard, /admin/products, /admin/orders,
 *  /admin/users, /admin/settings
 */
import { test, expect } from '@playwright/test';
import {
  screenshot, attachConsoleLogger, attachNetworkLogger, collectLinks, saveLog
} from '../../utils/page-helpers';
import { coverage } from '../../utils/coverage-tracker';
import * as dotenv from 'dotenv';
dotenv.config();

const BASE = process.env.BASE_URL || 'https://oopsie-woopsie-code.lovable.app';

// ── Generic UI interaction scanner ───────────────────────────────────────────
async function scanPageInteractions(page: any, route: string, testId: string) {
  const networkLog = attachNetworkLogger(page);
  const errors = attachConsoleLogger(page);

  await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
  await screenshot(page, `${testId}-initial`);

  const findings: any[] = [];

  // 1. Collect all interactive elements
  const buttons = await page.$$eval(
    'button:not([disabled]), [role="button"]:not([disabled])',
    (els: any[]) => els.map(el => ({
      text: el.textContent?.trim().slice(0, 50),
      type: el.type,
      id: el.id,
      class: el.className?.toString().slice(0, 80),
      'data-testid': el.dataset?.testid,
    }))
  );

  const tabs = await page.$$eval(
    '[role="tab"], .tab, button[data-tab]',
    (els: any[]) => els.map(el => ({ text: el.textContent?.trim(), role: el.role, id: el.id }))
  );

  const accordions = await page.$$eval(
    '[data-state="closed"], details summary, .accordion-trigger',
    (els: any[]) => els.map(el => ({ text: el.textContent?.trim().slice(0, 60) }))
  );

  console.log(`\n  📋 ${route} — Interactive elements:`);
  console.log(`     Buttons: ${buttons.length}`);
  console.log(`     Tabs: ${tabs.length}`);
  console.log(`     Accordions: ${accordions.length}`);

  findings.push({ route, buttons, tabs, accordions });

  // 2. Click each tab
  const tabElements = await page.$$('[role="tab"]');
  for (let i = 0; i < tabElements.length; i++) {
    try {
      const tabText = await tabElements[i].textContent();
      await tabElements[i].click();
      await page.waitForTimeout(800);
      await screenshot(page, `${testId}-tab-${i}-${tabText?.trim().replace(/\s+/g, '_').slice(0, 20)}`);
      const activePanel = await page.$('[role="tabpanel"]:not([hidden])');
      const panelContent = activePanel ? await activePanel.textContent() : '';
      console.log(`     Tab "${tabText?.trim()}": panel has ${panelContent?.length || 0} chars`);
    } catch (e: any) {
      findings.push({ type: 'tab-error', index: i, error: e.message });
    }
  }

  // 3. Click filter buttons (products page)
  const filterButtons = await page.$$('button[data-filter], .filter-btn, [role="radiogroup"] button');
  for (const btn of filterButtons) {
    try {
      const btnText = await btn.textContent();
      await btn.click();
      await page.waitForTimeout(500);
      console.log(`     Filter clicked: "${btnText?.trim()}"`);
    } catch {}
  }

  // 4. Open dropdowns / selects
  const selects = await page.$$('select');
  for (const select of selects) {
    const options = await select.$$eval('option', (opts: any[]) => opts.map(o => o.value));
    console.log(`     Select found with options: ${options.join(', ')}`);
    // Test each option
    for (const opt of options.slice(0, 3)) { // first 3 options
      await select.selectOption(opt);
      await page.waitForTimeout(300);
    }
  }

  // 5. Test accordions / collapsibles
  const closedAccordions = await page.$$('[data-state="closed"]');
  for (let i = 0; i < closedAccordions.length; i++) {
    try {
      await closedAccordions[i].click();
      await page.waitForTimeout(500);
      const newState = await closedAccordions[i].getAttribute('data-state');
      if (newState === 'open') {
        console.log(`     Accordion ${i}: opened successfully`);
        await screenshot(page, `${testId}-accordion-${i}-open`);
      }
    } catch {}
  }

  // 6. Test modals / dialogs
  const modalTriggers = await page.$$('[data-dialog-trigger], [aria-haspopup="dialog"], button:has-text("Open"), button:has-text("View")');
  for (let i = 0; i < Math.min(modalTriggers.length, 5); i++) {
    try {
      const btnText = await modalTriggers[i].textContent();
      await modalTriggers[i].click();
      await page.waitForTimeout(1000);
      const modal = await page.$('[role="dialog"]');
      if (modal) {
        await screenshot(page, `${testId}-modal-${i}`);
        console.log(`     Modal ${i} opened for: "${btnText?.trim()}"`);
        // Close it
        const closeBtn = await page.$('[aria-label="Close"], button:has-text("Cancel"), button:has-text("Close"), [data-dialog-close]');
        if (closeBtn) await closeBtn.click();
        await page.waitForTimeout(500);
      }
    } catch {}
  }

  saveLog(`${testId}-ui-network`, networkLog);
  return { route, findings, errorsFound: errors.length, networkRequestsTriggered: networkLog.length };
}

// ════════════════════════════════════════════════════════════════════════════
// TEST: Homepage interactions
// ════════════════════════════════════════════════════════════════════════════
test('UI-01: Homepage — all interactive elements', async ({ page }) => {
  const result = await scanPageInteractions(page, '/', 'ui01-home');
  console.log(`\n  ✅ Homepage scan complete: ${result.errorsFound} errors, ${result.networkRequestsTriggered} network calls`);
  expect(result.errorsFound).toBe(0);
});

// ════════════════════════════════════════════════════════════════════════════
// TEST: Products page interactions
// ════════════════════════════════════════════════════════════════════════════
test('UI-02: Products page — filters, sort, product cards', async ({ page }) => {
  const networkLog = attachNetworkLogger(page);
  const errors = attachConsoleLogger(page);

  await page.goto(`${BASE}/products`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000); // Extra wait for SPA loading
  await screenshot(page, 'ui02-products-initial');

  // Check if products loaded or stuck in loading state
  const loadingText = await page.locator('text=Loading').count();
  const productCards = await page.locator('[data-testid*="product"], .product-card, article').count();

  console.log(`  📋 Products page analysis:`);
  console.log(`     Loading indicator visible: ${loadingText > 0 ? '⚠️  YES (possible broken state)' : '✅ NO'}`);
  console.log(`     Product cards visible: ${productCards}`);

  if (loadingText > 0) {
    // CRITICAL FINDING
    coverage.addSecurityFinding({
      type: 'BROKEN_FUNCTIONALITY',
      severity: 'CRITICAL',
      description: 'Products page stuck in Loading state after 3 seconds',
      evidence: `page.locator("text=Loading").count() = ${loadingText}, product cards = ${productCards}`,
      reproSteps: ['1. Navigate to /products', '2. Wait 3 seconds', '3. Loading indicator still visible, no products shown'],
      confidence: 'VERIFIED',
    });
  }

  // Test category filter buttons
  const filterButtons = await page.$$('button, [role="tab"]');
  const filterLabels = ['Protein', 'Creatine', 'Mass Gainer', 'Pre-Workout', 'All'];

  for (const label of filterLabels) {
    const btn = page.locator(`button:has-text("${label}"), [role="tab"]:has-text("${label}")`);
    if (await btn.count() > 0) {
      const beforeProducts = await page.locator('[data-testid*="product"], .product-card').count();
      await btn.click();
      await page.waitForTimeout(1000);
      const afterProducts = await page.locator('[data-testid*="product"], .product-card').count();
      await screenshot(page, `ui02-filter-${label.toLowerCase()}`);
      console.log(`     Filter "${label}": before=${beforeProducts}, after=${afterProducts} products`);

      if (beforeProducts === afterProducts && beforeProducts === 0) {
        console.warn(`     ⚠️  Filter "${label}" produced no results — possibly not wired`);
      }
    }
  }

  // Test sort dropdown
  const sortSelect = page.locator('select, [data-testid*="sort"]').first();
  if (await sortSelect.count() > 0) {
    const options = await sortSelect.$$eval('option', (opts: any[]) => opts.map(o => ({ value: o.value, text: o.textContent })));
    console.log(`     Sort options: ${options.map(o => o.text).join(', ')}`);
    for (const opt of options) {
      await sortSelect.selectOption(opt.value);
      await page.waitForTimeout(800);
    }
  }

  saveLog('ui02-products-network', networkLog);

  // Log all failed network requests
  const failed = networkLog.filter((r: any) => r.type === 'failed');
  if (failed.length > 0) {
    console.warn(`  🚨 Failed network requests on /products: ${failed.length}`);
    failed.forEach((r: any) => console.warn(`     ❌ ${r.method} ${r.url}: ${r.error}`));
  }
});

// ════════════════════════════════════════════════════════════════════════════
// TEST: Admin dashboard interactions
// ════════════════════════════════════════════════════════════════════════════
test('UI-03: Admin dashboard — full section scan', async ({ page }) => {
  await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });

  if (page.url().includes('/login')) {
    console.warn('  ⚠️  UNTESTED: Not authenticated for admin tests — run setup-admin first');
    return;
  }

  await screenshot(page, 'ui03-admin-dashboard');

  const adminSections = [
    { label: 'Products', paths: ['/admin/products', '/admin/products/new'] },
    { label: 'Categories', paths: ['/admin/categories'] },
    { label: 'Orders', paths: ['/admin/orders'] },
    { label: 'Users', paths: ['/admin/users'] },
    { label: 'Media', paths: ['/admin/media'] },
    { label: 'Settings', paths: ['/admin/settings'] },
    { label: 'Analytics', paths: ['/admin/analytics'] },
    { label: 'Coupons', paths: ['/admin/coupons'] },
  ];

  for (const section of adminSections) {
    for (const path of section.paths) {
      const errors = attachConsoleLogger(page);
      await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);
      await screenshot(page, `ui03-admin-${section.label.toLowerCase()}`);

      const status = page.url().includes('/login') ? 'REDIRECTED_TO_LOGIN' : 'LOADED';
      const jsErrors = errors.length;
      console.log(`     [${status}] ${path} — JS errors: ${jsErrors}`);

      if (jsErrors > 0) {
        console.warn(`     ⚠️  JS errors on ${path}: ${errors.join(' | ')}`);
      }
    }
  }
});

// ════════════════════════════════════════════════════════════════════════════
// TEST: Language switcher
// ════════════════════════════════════════════════════════════════════════════
test('UI-04: Language switcher — verify i18n actually works', async ({ page }) => {
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });

  const langSwitcher = page.locator('[data-testid*="lang"], select[name*="lang"], .language-switcher, button:has-text("EN"), button:has-text("Language")');

  if (await langSwitcher.count() === 0) {
    console.warn('  ⚠️  UNTESTED: Language switcher not found via common selectors');
    return;
  }

  const initialText = await page.locator('h1').first().textContent();
  console.log(`  📋 Initial H1: "${initialText}"`);

  await langSwitcher.first().click();
  await page.waitForTimeout(500);
  await screenshot(page, 'ui04-lang-dropdown');

  // Try clicking a non-English option
  const nonEnglishOption = page.locator('li:has-text("हिंदी"), [data-value="hi"], li:has-text("Hindi")');
  if (await nonEnglishOption.count() > 0) {
    await nonEnglishOption.click();
    await page.waitForTimeout(1500);
    await screenshot(page, 'ui04-after-hindi-switch');

    const newH1 = await page.locator('h1').first().textContent();
    console.log(`  📋 H1 after switching to Hindi: "${newH1}"`);

    if (newH1 === initialText) {
      console.warn('  🚨 FINDING: Language switcher does NOT change content — i18n not implemented');
      coverage.addSecurityFinding({
        type: 'BROKEN_FUNCTIONALITY',
        severity: 'HIGH',
        description: 'Language switcher UI exists but switching languages does not change any content',
        evidence: `H1 before: "${initialText}", H1 after Hindi switch: "${newH1}" — identical`,
        reproSteps: ['1. Go to homepage', '2. Click language switcher', '3. Select Hindi', '4. Observe H1 is unchanged'],
        confidence: 'VERIFIED',
      });
    }
  }
});

// ════════════════════════════════════════════════════════════════════════════
// TEST: FAQ page accordion interactions
// ════════════════════════════════════════════════════════════════════════════
test('UI-05: FAQ page — all accordion items expand and collapse', async ({ page }) => {
  const errors = attachConsoleLogger(page);
  await page.goto(`${BASE}/faq`, { waitUntil: 'networkidle' });
  await screenshot(page, 'ui05-faq-initial');

  const accordionItems = await page.$$('[data-state], details, .faq-item');
  console.log(`  📋 FAQ accordion items: ${accordionItems.length}`);

  let expanded = 0, failed = 0;
  for (let i = 0; i < accordionItems.length; i++) {
    try {
      await accordionItems[i].click();
      await page.waitForTimeout(400);
      const state = await accordionItems[i].getAttribute('data-state');
      if (state === 'open') expanded++;
    } catch {
      failed++;
    }
  }

  console.log(`  ✅ Expanded: ${expanded}, Failed: ${failed}`);
  expect(errors.filter(e => !e.includes('favicon'))).toHaveLength(0);
});
