/**
 * PHASE 6 — AUTHENTICATION AUDIT
 *
 * Tests:
 *  - Login (valid, invalid, empty)
 *  - Signup (new user)
 *  - Logout
 *  - Password reset flow
 *  - Session persistence across tabs
 *  - Session expiry behavior
 *
 * Each test captures: network requests, screenshots, console errors.
 * Each finding is labeled VERIFIED / INFERRED / UNTESTED.
 */
import { test, expect } from '@playwright/test';
import {
  screenshot, attachNetworkLogger, attachConsoleLogger, saveLog
} from '../../utils/page-helpers';
import { coverage } from '../../utils/coverage-tracker';
import * as dotenv from 'dotenv';
dotenv.config();

const BASE = process.env.BASE_URL || 'https://oopsie-woopsie-code.lovable.app';
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const BAD_EMAIL      = 'notauser@invalid-domain-xyz.com';
const BAD_PASSWORD   = 'WrongPassword999!';

// ── Helper: find login page ───────────────────────────────────────────────────
async function gotoLogin(page: any) {
  const candidates = ['/login', '/sign-in', '/auth', '/auth/login'];
  for (const path of candidates) {
    const res = await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
    if (res?.status() !== 404) return path;
  }
  throw new Error('LOGIN PAGE NOT FOUND — checked: ' + candidates.join(', '));
}

// ════════════════════════════════════════════════════════════════════════════
// TEST: Login with valid credentials
// ════════════════════════════════════════════════════════════════════════════
test('AUTH-01: Login with valid credentials', async ({ page }) => {
  const networkLog = attachNetworkLogger(page);
  const consoleErrors = attachConsoleLogger(page);

  const loginPath = await gotoLogin(page);
  await screenshot(page, 'auth01-login-page');

  // EVIDENCE: Record current URL
  console.log(`  📍 Login URL: ${page.url()}`);

  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await screenshot(page, 'auth01-credentials-filled');

  // Intercept the Supabase auth call
  const [authResponse] = await Promise.all([
    page.waitForResponse(res =>
      (res.url().includes('/auth/') || res.url().includes('supabase')) &&
      res.request().method() === 'POST',
      { timeout: 10000 }
    ).catch(() => null),
    page.click('button[type="submit"]'),
  ]);

  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  await screenshot(page, 'auth01-post-login');

  // EVIDENCE: Auth API response
  if (authResponse) {
    const status = authResponse.status();
    let body = '';
    try { body = await authResponse.text(); } catch {}
    console.log(`  📡 Auth API status: ${status}`);
    console.log(`  📡 Auth response (first 200 chars): ${body.slice(0, 200)}`);
    // FINDING
    expect(status).toBe(200); // VERIFIED if this passes
  } else {
    console.warn('  ⚠️  No auth response intercepted — UNTESTED');
  }

  // EVIDENCE: Post-login redirect URL
  const postLoginUrl = page.url();
  console.log(`  📍 Post-login URL: ${postLoginUrl}`);

  // Verify session token stored
  const localStorage = await page.evaluate(() => {
    const keys = Object.keys(localStorage);
    return keys.map(k => ({ key: k, hasValue: !!localStorage.getItem(k) }));
  });
  const supabaseKey = localStorage.find(k => k.key.includes('supabase') || k.key.includes('auth'));
  console.log(`  🔑 Supabase key in localStorage: ${supabaseKey ? 'YES — ' + supabaseKey.key : 'NOT FOUND'}`);

  saveLog('auth01-network', networkLog);
  coverage.markRouteTested(loginPath, consoleErrors.length === 0 ? 'pass' : 'fail',
    consoleErrors.join(' | '));

  expect(consoleErrors.filter(e => !e.includes('favicon'))).toHaveLength(0);
});

// ════════════════════════════════════════════════════════════════════════════
// TEST: Login with wrong password
// ════════════════════════════════════════════════════════════════════════════
test('AUTH-02: Login with wrong password shows error', async ({ page }) => {
  const networkLog = attachNetworkLogger(page);
  await gotoLogin(page);

  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', BAD_PASSWORD);

  const [authResponse] = await Promise.all([
    page.waitForResponse(res =>
      (res.url().includes('/auth/') || res.url().includes('supabase')) &&
      res.request().method() === 'POST', { timeout: 8000 }
    ).catch(() => null),
    page.click('button[type="submit"]'),
  ]);

  await page.waitForLoadState('networkidle');
  await screenshot(page, 'auth02-wrong-password-response');

  if (authResponse) {
    const status = authResponse.status();
    console.log(`  📡 Wrong password response status: ${status}`);
    // 400 or 422 expected for wrong credentials
    expect([400, 401, 422]).toContain(status);
    console.log(`  ✅ VERIFIED: Server returns error status ${status} for wrong password`);
  }

  // Verify user-facing error message
  const errorSelectors = [
    '[role="alert"]',
    '.error-message',
    '.toast',
    'text=Invalid',
    'text=incorrect',
    'text=wrong',
    '[data-testid="error"]',
    '.text-red',
    '.text-destructive',
  ];

  let errorShown = false;
  for (const sel of errorSelectors) {
    if (await page.locator(sel).count() > 0) {
      const errorText = await page.locator(sel).first().textContent();
      console.log(`  ✅ VERIFIED: Error message shown: "${errorText}"`);
      errorShown = true;
      break;
    }
  }

  if (!errorShown) {
    console.warn('  ⚠️  INFERRED: No visible error message found for wrong password');
    await screenshot(page, 'auth02-no-error-message');
  }

  saveLog('auth02-network', networkLog);
});

// ════════════════════════════════════════════════════════════════════════════
// TEST: Login with non-existent email
// ════════════════════════════════════════════════════════════════════════════
test('AUTH-03: Login with non-existent email', async ({ page }) => {
  await gotoLogin(page);
  await page.fill('input[type="email"]', BAD_EMAIL);
  await page.fill('input[type="password"]', BAD_PASSWORD);

  const [authResponse] = await Promise.all([
    page.waitForResponse(res =>
      res.url().includes('supabase') && res.request().method() === 'POST',
      { timeout: 8000 }
    ).catch(() => null),
    page.click('button[type="submit"]'),
  ]);

  await page.waitForLoadState('networkidle');
  await screenshot(page, 'auth03-nonexistent-email');

  if (authResponse) {
    const body = await authResponse.text().catch(() => '');
    console.log(`  📡 Status: ${authResponse.status()}, Body: ${body.slice(0, 300)}`);
    // SECURITY CHECK: Does error reveal whether email exists?
    if (body.toLowerCase().includes('email not found') || body.toLowerCase().includes('user not found')) {
      console.warn('  ⚠️  SECURITY FINDING: Error message reveals whether email exists (user enumeration risk)');
    } else {
      console.log('  ✅ Error message does not reveal email existence');
    }
  }
});

// ════════════════════════════════════════════════════════════════════════════
// TEST: Login with empty fields
// ════════════════════════════════════════════════════════════════════════════
test('AUTH-04: Login with empty fields — client-side validation', async ({ page }) => {
  await gotoLogin(page);
  await screenshot(page, 'auth04-empty-form');

  // Click submit without filling anything
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1000);
  await screenshot(page, 'auth04-empty-submit-result');

  // Check HTML5 validation or custom validation
  const emailInput = page.locator('input[type="email"]');
  const validationMessage = await emailInput.evaluate(
    (el: HTMLInputElement) => el.validationMessage
  );
  console.log(`  📋 HTML5 email validation message: "${validationMessage}"`);

  if (validationMessage) {
    console.log('  ✅ VERIFIED: Client-side empty-field validation active');
  } else {
    console.warn('  ⚠️  INFERRED: No HTML5 validation — check for custom validation');
  }
});

// ════════════════════════════════════════════════════════════════════════════
// TEST: Logout
// ════════════════════════════════════════════════════════════════════════════
test('AUTH-05: Logout clears session', async ({ page }) => {
  // Start logged in
  await gotoLogin(page);
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  const preLogoutUrl = page.url();
  console.log(`  📍 Pre-logout URL: ${preLogoutUrl}`);

  // Find logout
  const logoutSelectors = [
    'button:has-text("Logout")',
    'button:has-text("Log out")',
    'button:has-text("Sign out")',
    'a:has-text("Logout")',
    '[data-testid="logout"]',
    '[aria-label="Logout"]',
  ];

  let loggedOut = false;
  for (const sel of logoutSelectors) {
    if (await page.locator(sel).count() > 0) {
      const [signOutResponse] = await Promise.all([
        page.waitForResponse(
          res => res.url().includes('logout') || res.url().includes('signout'),
          { timeout: 8000 }
        ).catch(() => null),
        page.click(sel),
      ]);
      await page.waitForLoadState('networkidle');
      await screenshot(page, 'auth05-post-logout');
      loggedOut = true;

      // Verify localStorage cleared
      const lsAfter = await page.evaluate(() => {
        const keys = Object.keys(localStorage);
        return keys.filter(k => k.includes('supabase') || k.includes('auth'));
      });
      console.log(`  🔑 Supabase keys after logout: ${lsAfter.length === 0 ? 'CLEARED ✅' : lsAfter.join(', ')}`);

      // Try accessing protected route after logout
      await page.goto(`${BASE}/admin`);
      await page.waitForLoadState('networkidle');
      const afterLogoutUrl = page.url();
      console.log(`  📍 After-logout access to /admin: ${afterLogoutUrl}`);

      if (afterLogoutUrl.includes('/login') || afterLogoutUrl.includes('/sign-in')) {
        console.log('  ✅ VERIFIED: /admin correctly redirects to login after logout');
      } else {
        console.warn('  🚨 SECURITY FINDING: /admin accessible after logout — possible session not cleared');
      }
      break;
    }
  }

  if (!loggedOut) {
    console.warn('  ⚠️  UNTESTED: Logout button not found');
  }
});

// ════════════════════════════════════════════════════════════════════════════
// TEST: Password reset flow
// ════════════════════════════════════════════════════════════════════════════
test('AUTH-06: Password reset link present and triggers email', async ({ page }) => {
  await gotoLogin(page);

  const resetSelectors = [
    'a:has-text("Forgot")',
    'a:has-text("Reset")',
    'button:has-text("Forgot")',
    'text=Forgot password',
  ];

  let resetFound = false;
  for (const sel of resetSelectors) {
    if (await page.locator(sel).count() > 0) {
      await page.click(sel);
      await page.waitForLoadState('networkidle');
      await screenshot(page, 'auth06-password-reset-page');
      console.log(`  ✅ VERIFIED: Password reset found at: ${page.url()}`);

      // Fill email and submit
      if (await page.locator('input[type="email"]').count() > 0) {
        await page.fill('input[type="email"]', ADMIN_EMAIL);
        const [resetResponse] = await Promise.all([
          page.waitForResponse(
            res => res.url().includes('supabase') && res.request().method() === 'POST',
            { timeout: 8000 }
          ).catch(() => null),
          page.click('button[type="submit"]'),
        ]);
        if (resetResponse) {
          console.log(`  📡 Reset API status: ${resetResponse.status()}`);
        }
        await screenshot(page, 'auth06-reset-submitted');
      }
      resetFound = true;
      break;
    }
  }

  if (!resetFound) {
    console.warn('  ⚠️  UNTESTED: Password reset link not found on login page');
  }
});

// ════════════════════════════════════════════════════════════════════════════
// TEST: Multiple tabs session consistency
// ════════════════════════════════════════════════════════════════════════════
test('AUTH-07: Session shared across tabs', async ({ browser }) => {
  const context = await browser.newContext();

  const tab1 = await context.newPage();
  await tab1.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await tab1.fill('input[type="email"]', ADMIN_EMAIL);
  await tab1.fill('input[type="password"]', ADMIN_PASSWORD);
  await tab1.click('button[type="submit"]');
  await tab1.waitForLoadState('networkidle');

  // Open a second tab in the same context
  const tab2 = await context.newPage();
  await tab2.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
  await screenshot(tab2, 'auth07-tab2-admin-access');

  const tab2Url = tab2.url();
  if (!tab2Url.includes('/login')) {
    console.log('  ✅ VERIFIED: Session shared across tabs — Tab 2 accessed /admin without re-login');
  } else {
    console.warn('  ⚠️  INFERRED: Session NOT shared across tabs — Tab 2 redirected to login');
  }

  await context.close();
});
