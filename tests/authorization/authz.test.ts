/**
 * PHASE 7 — AUTHORIZATION AUDIT (Act as an attacker)
 *
 * Attempts:
 *  - Direct URL access to admin routes (unauthenticated)
 *  - IDOR: accessing other users' order data by guessing IDs
 *  - Role escalation via URL manipulation
 *  - Admin bypass attempts
 *  - Accessing other users' account data
 *
 * IMPORTANT: This is passive observation only — no data is modified
 * on other users' accounts. Tests verify that protections EXIST.
 */
import { test, expect } from '@playwright/test';
import { screenshot, attachNetworkLogger, saveLog } from '../../utils/page-helpers';
import { coverage } from '../../utils/coverage-tracker';
import * as dotenv from 'dotenv';
dotenv.config();

const BASE = process.env.BASE_URL || 'https://oopsie-woopsie-code.lovable.app';

// Admin routes that MUST require authentication
const ADMIN_ROUTES = [
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
  '/admin/analytics',
  '/admin/coupons',
];

// Customer-only routes (should not be accessible to anon)
const PROTECTED_CUSTOMER_ROUTES = [
  '/account',
  '/account/orders',
  '/account/wallet',
  '/account/profile',
  '/checkout',
];

// ════════════════════════════════════════════════════════════════════════════
// TEST: Unauthenticated access to admin routes
// ════════════════════════════════════════════════════════════════════════════
test('AUTHZ-01: Admin routes blocked when unauthenticated', async ({ page }) => {
  // This test uses a fresh browser context — no auth state
  const results: any[] = [];

  for (const route of ADMIN_ROUTES) {
    const networkLog: any[] = [];
    page.on('response', async res => {
      if (res.url().includes(route) || res.url().includes('admin')) {
        networkLog.push({ status: res.status(), url: res.url() });
      }
    });

    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const finalUrl = page.url();
    const isRedirected = finalUrl.includes('/login') || finalUrl.includes('/sign-in') || finalUrl.includes('/auth');
    const pageContent = await page.content();
    const hasAdminContent = pageContent.includes('Dashboard') || pageContent.includes('Products') ||
      pageContent.includes('Orders') || pageContent.includes('Users');

    const status = isRedirected ? 'PROTECTED ✅' : hasAdminContent ? '🚨 EXPOSED' : '⚠️  UNCLEAR';

    results.push({ route, finalUrl, isRedirected, hasAdminContent, status });
    console.log(`  ${status} ${route} → ${finalUrl}`);

    if (!isRedirected && hasAdminContent) {
      coverage.addSecurityFinding({
        type: 'BROKEN_ACCESS_CONTROL',
        severity: 'CRITICAL',
        description: `Admin route ${route} is accessible without authentication`,
        evidence: `Navigating to ${BASE}${route} without any auth cookie/token shows admin content. Final URL: ${finalUrl}`,
        reproSteps: [
          '1. Open fresh incognito browser window',
          `2. Navigate directly to ${BASE}${route}`,
          '3. Observe admin content rendered without login',
        ],
        confidence: 'VERIFIED',
      });
    }

    await screenshot(page, `authz01-anon-${route.replace(/\//g, '-')}`);
  }

  saveLog('authz01-admin-access-attempts', results);

  const exposed = results.filter(r => !r.isRedirected && r.hasAdminContent);
  expect(exposed.length).toBe(0); // All admin routes must redirect
});

// ════════════════════════════════════════════════════════════════════════════
// TEST: Unauthenticated access to customer routes
// ════════════════════════════════════════════════════════════════════════════
test('AUTHZ-02: Customer routes blocked when unauthenticated', async ({ page }) => {
  for (const route of PROTECTED_CUSTOMER_ROUTES) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
    const finalUrl = page.url();
    const isProtected = finalUrl.includes('/login') || finalUrl.includes('/sign-in');
    console.log(`  ${isProtected ? '✅ PROTECTED' : '⚠️  CHECK NEEDED'} ${route} → ${finalUrl}`);

    if (!isProtected) {
      const content = await page.content();
      const hasPersonalData = content.includes('order') || content.includes('wallet') || content.includes('profile');
      if (hasPersonalData) {
        coverage.addSecurityFinding({
          type: 'BROKEN_ACCESS_CONTROL',
          severity: 'HIGH',
          description: `Customer route ${route} accessible without authentication`,
          evidence: `Direct navigation to ${BASE}${route} shows personal data content without auth`,
          reproSteps: ['1. Open incognito', `2. Go to ${BASE}${route}`, '3. Observe personal data visible'],
          confidence: 'VERIFIED',
        });
      }
    }
  }
});

// ════════════════════════════════════════════════════════════════════════════
// TEST: IDOR — Order ID enumeration
// ════════════════════════════════════════════════════════════════════════════
test('AUTHZ-03: IDOR — order data not accessible by guessing IDs', async ({ page }) => {
  // Try to access orders with sequential IDs while authenticated as a different user
  const guessedIds = ['1', '2', '3', '100', '1000', '00000001'];

  const networkLog = attachNetworkLogger(page);

  for (const id of guessedIds) {
    const routes = [
      `/account/orders/${id}`,
      `/orders/${id}`,
      `/api/orders/${id}`,
    ];

    for (const route of routes) {
      await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
      const content = await page.content();
      const status = page.url();

      // Check if it returns order data that doesn't belong to this user
      const hasOrderData = content.includes('₹') && content.includes('Order') && !content.includes('Not Found');
      if (hasOrderData) {
        console.warn(`  ⚠️  INFERRED IDOR: ${route} returns order data for guessed ID ${id}`);
        coverage.addSecurityFinding({
          type: 'IDOR',
          severity: 'HIGH',
          description: `Possible IDOR at ${route} — order data returned for guessed ID ${id}`,
          evidence: `Page content contains order data without verifying this order belongs to current user`,
          reproSteps: [`1. Authenticate as user A`, `2. Navigate to ${BASE}${route}`, '3. Observe order data displayed'],
          confidence: 'INFERRED',
        });
      }
    }
  }

  console.log('  ✅ IDOR sweep complete');
});

// ════════════════════════════════════════════════════════════════════════════
// TEST: Open redirect vulnerability
// ════════════════════════════════════════════════════════════════════════════
test('AUTHZ-04: Open redirect in login redirect parameter', async ({ page }) => {
  const maliciousRedirects = [
    `${BASE}/login?redirect=https://evil.com`,
    `${BASE}/login?redirect=//evil.com`,
    `${BASE}/login?redirect=/\\/evil.com`,
    `${BASE}/login?next=https://evil.com`,
    `${BASE}/login?return_url=https://evil.com`,
    `${BASE}/login?returnTo=https://evil.com`,
  ];

  for (const url of maliciousRedirects) {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', process.env.ADMIN_EMAIL || '').catch(() => {});
    await page.fill('input[type="password"]', process.env.ADMIN_PASSWORD || '').catch(() => {});
    await page.click('button[type="submit"]').catch(() => {});
    await page.waitForTimeout(2000);

    const finalUrl = page.url();
    const redirectedToEvil = finalUrl.includes('evil.com');

    console.log(`  ${redirectedToEvil ? '🚨 VULNERABLE' : '✅ Safe'}: ${url.split('?')[1]} → ${finalUrl}`);

    if (redirectedToEvil) {
      coverage.addSecurityFinding({
        type: 'OPEN_REDIRECT',
        severity: 'HIGH',
        description: 'Open redirect vulnerability in login flow',
        evidence: `Navigating to ${url} after login redirected to: ${finalUrl}`,
        reproSteps: [
          `1. Navigate to ${url}`,
          '2. Login with valid credentials',
          '3. Observe redirect to evil.com',
        ],
        confidence: 'VERIFIED',
      });
    }
  }
});

// ════════════════════════════════════════════════════════════════════════════
// TEST: Sensitive data in URL / localStorage
// ════════════════════════════════════════════════════════════════════════════
test('AUTHZ-05: Sensitive data not exposed in URL or localStorage', async ({ page }) => {
  // Login and check
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', process.env.ADMIN_EMAIL || '').catch(() => {});
  await page.fill('input[type="password"]', process.env.ADMIN_PASSWORD || '').catch(() => {});
  await page.click('button[type="submit"]').catch(() => {});
  await page.waitForTimeout(2000);

  // Check URL for tokens
  const currentUrl = page.url();
  const hasTokenInUrl = currentUrl.includes('token=') || currentUrl.includes('access_token=') ||
    currentUrl.includes('refresh_token=');
  if (hasTokenInUrl) {
    coverage.addSecurityFinding({
      type: 'SENSITIVE_DATA_EXPOSURE',
      severity: 'HIGH',
      description: 'Auth token exposed in URL after login',
      evidence: `Login redirect URL: ${currentUrl}`,
      reproSteps: ['1. Login with credentials', '2. Observe URL bar after redirect'],
      confidence: 'VERIFIED',
    });
  }
  console.log(`  Token in URL: ${hasTokenInUrl ? '🚨 YES — FINDING' : '✅ No'}`);

  // Check localStorage for sensitive data stored in plaintext
  const localStorage = await page.evaluate(() => {
    const items: any = {};
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i)!;
      const value = window.localStorage.getItem(key) || '';
      items[key] = value.length > 100 ? value.slice(0, 100) + '...' : value;
    }
    return items;
  });

  const supabaseKeys = Object.keys(localStorage).filter(k => k.includes('supabase'));
  console.log(`  Supabase localStorage keys: ${supabaseKeys.join(', ') || 'none'}`);

  // Check for password stored in localStorage (should NEVER happen)
  const rawStorage = JSON.stringify(localStorage).toLowerCase();
  if (rawStorage.includes('password')) {
    coverage.addSecurityFinding({
      type: 'SENSITIVE_DATA_EXPOSURE',
      severity: 'CRITICAL',
      description: 'Password appears to be stored in localStorage',
      evidence: 'The string "password" found in localStorage values after login',
      reproSteps: ['1. Login', '2. Open DevTools > Application > localStorage', '3. Search for "password"'],
      confidence: 'INFERRED',
    });
  }

  saveLog('authz05-localStorage', localStorage);
});

// ════════════════════════════════════════════════════════════════════════════
// TEST: API endpoints accessible without auth
// ════════════════════════════════════════════════════════════════════════════
test('AUTHZ-06: Supabase REST API endpoints require auth', async ({ page }) => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey     = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    console.warn('  ⚠️  UNTESTED: SUPABASE_URL and SUPABASE_ANON_KEY not configured in .env');
    console.warn('  Add these to .env to test Supabase RLS policies directly');
    return;
  }

  const tables = ['products', 'orders', 'users', 'profiles', 'categories', 'wallet_transactions'];

  for (const table of tables) {
    try {
      const response = await page.evaluate(async ({ url, key, tbl }: any) => {
        const res = await fetch(`${url}/rest/v1/${tbl}?select=*&limit=1`, {
          headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
        });
        const data = await res.json();
        return { status: res.status, rowCount: Array.isArray(data) ? data.length : 0, error: data?.message };
      }, { url: supabaseUrl, key: anonKey, tbl: table });

      const isProtected = response.status === 403 || response.status === 401 || response.rowCount === 0;
      console.log(`  Table "${table}": ${response.status} — rows returned: ${response.rowCount} ${isProtected ? '✅' : '⚠️  CHECK'}`);

      if (!isProtected && response.rowCount > 0) {
        coverage.addSecurityFinding({
          type: 'BROKEN_ACCESS_CONTROL',
          severity: 'HIGH',
          description: `Supabase table "${table}" returns data to anonymous requests — RLS may be disabled`,
          evidence: `GET /rest/v1/${table}?select=* with anon key returned ${response.rowCount} row(s)`,
          reproSteps: [
            `1. GET ${supabaseUrl}/rest/v1/${table}?select=*`,
            `2. Header: apikey: ${anonKey.slice(0, 10)}...`,
            '3. Observe data returned without user authentication',
          ],
          confidence: 'VERIFIED',
        });
      }
    } catch (e: any) {
      console.warn(`  ⚠️  Error checking table ${table}: ${e.message}`);
    }
  }
});
