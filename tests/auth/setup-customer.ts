import { test as setup } from '@playwright/test';
import { screenshot } from '../../utils/page-helpers';
import * as dotenv from 'dotenv';
dotenv.config({ path: 'audit.env' });

const BASE = process.env.BASE_URL || 'https://oopsie-woopsie-code.lovable.app';

setup('Authenticate as customer and save state', async ({ page }) => {
  const loginPaths = ['/login', '/sign-in', '/auth'];
  for (const path of loginPaths) {
    const res = await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
    if (res?.status() !== 404) break;
  }

  await page.fill('input[type="email"]', process.env.CUSTOMER_EMAIL || '');
  await page.fill('input[type="password"]', process.env.CUSTOMER_PASSWORD || '');
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  await screenshot(page, 'customer-login-result');
  await page.context().storageState({ path: '.auth/customer.json' });
  console.log('  ✅ Customer auth state saved');
});
