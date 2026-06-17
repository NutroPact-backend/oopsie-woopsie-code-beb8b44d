/**
 * PHASE 6 — AUTH SETUP: Admin
 * Creates .auth/admin.json so other test suites can skip the login flow.
 */
import { test as setup, expect } from '@playwright/test';
import { loginAs, screenshot } from '../../utils/page-helpers';
import * as dotenv from 'dotenv';
dotenv.config({ path: 'audit.env' });

const BASE_URL = process.env.BASE_URL || 'https://oopsie-woopsie-code.lovable.app';

setup('Authenticate as admin and save state', async ({ page }) => {
  console.log('🔑 Authenticating as admin...');

  const networkLog: any[] = [];
  page.on('response', async res => {
    if (res.url().includes('supabase') || res.url().includes('auth')) {
      networkLog.push({ url: res.url(), status: res.status() });
    }
  });

  // Navigate to login page (try multiple patterns Lovable uses)
  const loginPaths = ['/login', '/sign-in', '/auth/login', '/admin/login', '/auth'];
  let loginFound = false;

  for (const loginPath of loginPaths) {
    const response = await page.goto(`${BASE_URL}${loginPath}`, { waitUntil: 'networkidle' });
    if (response?.status() !== 404) {
      loginFound = true;
      console.log(`  ✅ Login page found at ${loginPath}`);
      break;
    }
  }

  if (!loginFound) {
    // Admin panel may have its own login
    await page.goto(`${process.env.ADMIN_URL}/login` || `${BASE_URL}/admin`, { waitUntil: 'networkidle' });
  }

  await screenshot(page, 'admin-login-page');

  // Fill credentials
  await page.fill('input[type="email"], input[name="email"], #email', process.env.ADMIN_EMAIL || '');
  await page.fill('input[type="password"], input[name="password"], #password', process.env.ADMIN_PASSWORD || '');

  await screenshot(page, 'admin-login-filled');

  // Submit
  await page.locator('form:has(input[type="password"]) button[type="submit"]').first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  await screenshot(page, 'admin-post-login');

  // Verify we are logged in — look for dashboard indicators
  const loggedInIndicators = [
    '[data-testid="dashboard"]',
    'text=Dashboard',
    'text=Admin',
    'text=Overview',
    'nav:has-text("Logout")',
    'button:has-text("Logout")',
    'text=Welcome',
    '.sidebar',
    '#sidebar',
    '[data-testid="admin-nav"]',
  ];

  let loginSuccess = false;
  for (const indicator of loggedInIndicators) {
    if (await page.locator(indicator).count() > 0) {
      loginSuccess = true;
      console.log(`  ✅ Login confirmed via: ${indicator}`);
      break;
    }
  }

  if (!loginSuccess) {
    const currentUrl = page.url();
    console.warn(`  ⚠️  Could not confirm login. Current URL: ${currentUrl}`);
    // Save anyway — session may still be active
  }

  // Save auth state
  await page.context().storageState({ path: '.auth/admin.json' });
  console.log('  ✅ Admin auth state saved to .auth/admin.json');

  // Log Supabase auth calls for evidence
  console.log(`  📡 Auth network calls: ${networkLog.length}`);
  networkLog.forEach(n => console.log(`     ${n.status} ${n.url}`));
});
