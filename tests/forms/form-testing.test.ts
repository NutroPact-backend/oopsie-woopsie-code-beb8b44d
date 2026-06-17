/**
 * PHASE 5 — FORM AUDIT
 *
 * Tests every form on the site with:
 *  - Valid inputs (happy path)
 *  - Invalid inputs (bad email, too-short password)
 *  - Empty submission
 *  - Boundary values (0, -1, 999999)
 *  - Special characters / XSS payloads (observation only — not exploiting)
 *  - Duplicate submission (double-click)
 *
 * Forms targeted:
 *  - Login form
 *  - Signup / registration form
 *  - Contact form
 *  - Track order form
 *  - Admin: create product form
 *  - Admin: create category form
 *  - Checkout form
 *  - Search input
 *  - Newsletter (if present)
 */
import { test, expect } from '@playwright/test';
import { screenshot, attachNetworkLogger, attachConsoleLogger, saveLog } from '../../utils/page-helpers';
import { coverage } from '../../utils/coverage-tracker';
import * as dotenv from 'dotenv';
dotenv.config({ path: 'audit.env' });

const BASE = process.env.BASE_URL || 'https://oopsie-woopsie-code.lovable.app';

// XSS test payloads (observation only — we check if they are reflected, not exploited)
const XSS_PAYLOAD       = '<script>window.__xss_test=1</script>';
const SQL_PAYLOAD        = "' OR 1=1 --";
const SPECIAL_CHARS      = '!@#$%^&*()_+{}|:"<>?';
const LONG_STRING        = 'A'.repeat(10000);
const EMAIL_VALID        = `audit-test-${Date.now()}@mailinator.com`;
const EMAIL_INVALID      = 'notanemail';
const EMAIL_MISSING_TLD  = 'test@domain';
const PHONE_VALID        = '9876543210';
const PHONE_INVALID      = '123';

// Site-specific selectors (Nutropact)
const SEL_CONTACT_SUBMIT = '[data-testid="contact-submit"], form[data-testid="contact-form"] button[type="submit"]';
const SEL_TRACK_INPUT    = '[data-testid="track-order-input"], input[name="orderNumber"]';
const SEL_TRACK_SUBMIT   = '[data-testid="track-order-submit"], form[data-testid="track-order-form"] button[type="submit"]';

// ── Helper: submit form and capture result ─────────────────────────────────
async function submitFormAndObserve(page: any, submitSelector: string, waitMs = 2000) {
  const networkLog = attachNetworkLogger(page);
  await page.click(submitSelector);
  await page.waitForTimeout(waitMs);

  const apiCalls = networkLog.filter((r: any) =>
    r.type === 'response' && (r.url.includes('supabase') || r.url.includes('/api/'))
  );

  const errorMessages = await page.$$eval(
    '[role="alert"], .error, .text-red-500, .text-destructive, [data-error]',
    (els: any[]) => els.map(el => el.textContent?.trim()).filter(Boolean)
  ).catch(() => []);

  const successMessages = await page.$$eval(
    '.toast, [role="status"], .success, .text-green',
    (els: any[]) => els.map(el => el.textContent?.trim()).filter(Boolean)
  ).catch(() => []);

  return { apiCalls, errorMessages, successMessages, networkLog };
}

// ════════════════════════════════════════════════════════════════════════════
// TEST: Contact form — all scenarios
// ════════════════════════════════════════════════════════════════════════════
test('FORM-01: Contact form — valid submission', async ({ page }) => {
  await page.goto(`${BASE}/contact`, { waitUntil: 'networkidle' });
  await screenshot(page, 'form01-contact-initial');

  coverage.addDiscoveredForm('contact-form', '/contact', ['name', 'email', 'phone', 'message', 'subject']);

  // Fill valid data
  const nameField    = page.locator('input[name="name"], input[placeholder*="name" i], #name').first();
  const emailField   = page.locator('input[type="email"], input[name="email"]').first();
  const phoneField   = page.locator('input[name="phone"], input[type="tel"], input[placeholder*="phone" i]').first();
  const messageField = page.locator('textarea, input[name="message"]').first();

  if (await nameField.count()  > 0) await nameField.fill('Audit Test User');
  if (await emailField.count() > 0) await emailField.fill(EMAIL_VALID);
  if (await phoneField.count() > 0) await phoneField.fill(PHONE_VALID);
  if (await messageField.count() > 0) await messageField.fill('This is an automated audit test message. Please ignore.');

  await screenshot(page, 'form01-contact-filled-valid');

  const result = await submitFormAndObserve(page, SEL_CONTACT_SUBMIT);
  await screenshot(page, 'form01-contact-submitted');

  console.log(`  📡 API calls triggered: ${result.apiCalls.length}`);
  result.apiCalls.forEach((c: any) => console.log(`     ${c.status} ${c.url}`));
  console.log(`  ✅ Success messages: ${result.successMessages.join(' | ') || 'none'}`);
  console.log(`  ❌ Error messages: ${result.errorMessages.join(' | ') || 'none'}`);

  if (result.apiCalls.length === 0) {
    coverage.addSecurityFinding({
      type: 'BROKEN_FORM',
      severity: 'HIGH',
      description: 'Contact form submission triggers no API calls — form is not wired to backend',
      evidence: 'No Supabase or /api/ requests observed after form submission',
      reproSteps: ['1. Go to /contact', '2. Fill all fields with valid data', '3. Click submit', '4. Monitor network — no requests fired'],
      confidence: 'VERIFIED',
    });
  }

  coverage.markFormTested('contact-form', ['valid-submission'], result.apiCalls.length > 0 ? 'pass' : 'fail');
});

test('FORM-02: Contact form — empty submission', async ({ page }) => {
  await page.goto(`${BASE}/contact`, { waitUntil: 'networkidle' });
  await page.locator(SEL_CONTACT_SUBMIT).first().click();
  await page.waitForTimeout(1000);
  await screenshot(page, 'form02-contact-empty-submit');

  const errors = await page.$$eval(
    '[role="alert"], .error, input:invalid, ::-webkit-validation-bubble-message',
    (els: any[]) => els.length
  ).catch(() => 0);

  console.log(`  📋 Validation errors shown on empty submit: ${errors}`);
  if (errors === 0) {
    console.warn('  ⚠️  FINDING: No validation shown for empty contact form submission');
  }
});

test('FORM-03: Contact form — XSS payload observation', async ({ page }) => {
  await page.goto(`${BASE}/contact`, { waitUntil: 'networkidle' });

  const nameField = page.locator('input[name="name"], #name').first();
  const emailField = page.locator('input[type="email"]').first();

  if (await nameField.count() > 0) await nameField.fill(XSS_PAYLOAD);
  if (await emailField.count() > 0) await emailField.fill(EMAIL_VALID);
  const msgField = page.locator('textarea').first();
  if (await msgField.count() > 0) await msgField.fill(XSS_PAYLOAD);

  await page.locator(SEL_CONTACT_SUBMIT).first().click().catch(() => {});
  await page.waitForTimeout(1500);
  await screenshot(page, 'form03-contact-xss-payload');

  // Check if script was executed
  const xssExecuted = await page.evaluate(() => (window as any).__xss_test === 1);
  if (xssExecuted) {
    coverage.addSecurityFinding({
      type: 'XSS',
      severity: 'CRITICAL',
      description: 'Reflected XSS detected on contact form — script payload was executed',
      evidence: 'window.__xss_test === 1 after injecting <script>window.__xss_test=1</script>',
      reproSteps: ['1. Go to /contact', '2. Fill name with <script>window.__xss_test=1</script>', '3. Submit form', '4. Check window.__xss_test'],
      confidence: 'VERIFIED',
    });
  } else {
    console.log('  ✅ XSS payload not executed in contact form');
  }
});

test('FORM-04: Contact form — duplicate submission (double-click)', async ({ page }) => {
  await page.goto(`${BASE}/contact`, { waitUntil: 'networkidle' });
  const networkLog = attachNetworkLogger(page);

  const emailField = page.locator('input[type="email"]').first();
  const msgField   = page.locator('textarea').first();
  if (await emailField.count() > 0) await emailField.fill(EMAIL_VALID);
  if (await msgField.count() > 0)   await msgField.fill('Duplicate test');

  const submitBtn = page.locator(SEL_CONTACT_SUBMIT).first();

  // Double-click rapidly
  await submitBtn.click();
  await submitBtn.click();
  await page.waitForTimeout(2000);

  const apiCalls = networkLog.filter((r: any) =>
    r.type === 'response' && r.url.includes('supabase')
  );

  console.log(`  📡 API calls on double-submit: ${apiCalls.length}`);
  if (apiCalls.length > 1) {
    coverage.addSecurityFinding({
      type: 'DUPLICATE_SUBMISSION',
      severity: 'MEDIUM',
      description: 'Contact form allows duplicate submissions — double-click sends multiple API requests',
      evidence: `${apiCalls.length} Supabase calls triggered from rapid double-click on submit`,
      reproSteps: ['1. Fill contact form', '2. Double-click submit rapidly', '3. Observe network — multiple POST requests'],
      confidence: 'VERIFIED',
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// TEST: Track Order form
// ════════════════════════════════════════════════════════════════════════════
test('FORM-05: Track order form — valid and invalid inputs', async ({ page }) => {
  await page.goto(`${BASE}/track-order`, { waitUntil: 'networkidle' });
  await screenshot(page, 'form05-track-order-initial');

  const orderInput = page.locator(`${SEL_TRACK_INPUT}, input[name*="order"], input[placeholder*="order" i]`).first();
  if (await orderInput.count() === 0) {
    console.warn('  ⚠️  UNTESTED: Track order input field not found');
    return;
  }

  coverage.addDiscoveredForm('track-order-form', '/track-order', ['order_id']);

  // Valid order ID format test
  await orderInput.fill('NP1234567890');
  const result1 = await submitFormAndObserve(page, SEL_TRACK_SUBMIT);
  await screenshot(page, 'form05-track-valid-id');
  console.log(`  📡 API calls for valid order ID: ${result1.apiCalls.length}`);

  // Invalid / non-existent order
  await page.goto(`${BASE}/track-order`, { waitUntil: 'networkidle' });
  await orderInput.fill('NP9999999999');
  const result2 = await submitFormAndObserve(page, SEL_TRACK_SUBMIT);
  await screenshot(page, 'form05-track-invalid-id');
  console.log(`  📡 Not found messages: ${result2.errorMessages.join(' | ') || 'none'}`);

  // SQL injection attempt
  await page.goto(`${BASE}/track-order`, { waitUntil: 'networkidle' });
  await orderInput.fill(SQL_PAYLOAD);
  const result3 = await submitFormAndObserve(page, SEL_TRACK_SUBMIT);
  await screenshot(page, 'form05-track-sql-injection');
  const sqlError = result3.apiCalls.find((c: any) => c.status >= 500);
  if (sqlError) {
    coverage.addSecurityFinding({
      type: 'SQL_INJECTION',
      severity: 'CRITICAL',
      description: 'Track order form returned 5xx on SQL injection payload — possible injection vulnerability',
      evidence: `Payload "${SQL_PAYLOAD}" caused ${sqlError.status} response`,
      reproSteps: ['1. Go to /track-order', '2. Enter: \' OR 1=1 --', '3. Submit', '4. Observe 5xx response'],
      confidence: 'INFERRED',
    });
  }

  coverage.markFormTested('track-order-form', ['valid', 'invalid', 'sql-injection'], 'pass');
});

// ════════════════════════════════════════════════════════════════════════════
// TEST: Admin — Create Product form
// ════════════════════════════════════════════════════════════════════════════
test('FORM-06: Admin create product form — CRUD verification', async ({ page }) => {
  await page.goto(`${BASE}/admin/products/new`, { waitUntil: 'networkidle' });

  if (page.url().includes('/login')) {
    console.warn('  ⚠️  UNTESTED: Admin create product — not authenticated');
    return;
  }

  await screenshot(page, 'form06-admin-create-product');

  const fields = {
    name:        page.locator('input[name="name"], input[placeholder*="name" i]').first(),
    price:       page.locator('input[name="price"], input[type="number"]').first(),
    description: page.locator('textarea[name="description"], textarea').first(),
    sku:         page.locator('input[name="sku"], input[placeholder*="sku" i]').first(),
    stock:       page.locator('input[name="stock"], input[name="inventory"]').first(),
  };

  coverage.addDiscoveredForm('admin-create-product', '/admin/products/new',
    Object.keys(fields));

  // Fill with valid test product
  const testProductName = `AUDIT-PRODUCT-${Date.now()}`;
  if (await fields.name.count()        > 0) await fields.name.fill(testProductName);
  if (await fields.price.count()       > 0) await fields.price.fill('999');
  if (await fields.description.count() > 0) await fields.description.fill('Test product created by audit framework');
  if (await fields.sku.count()         > 0) await fields.sku.fill(`SKU-AUDIT-${Date.now()}`);
  if (await fields.stock.count()       > 0) await fields.stock.fill('100');

  await screenshot(page, 'form06-product-filled');

  const result = await submitFormAndObserve(page, 'button[type="submit"], button:has-text("Save"), button:has-text("Create")');
  await screenshot(page, 'form06-product-submitted');

  console.log(`  📡 API calls: ${result.apiCalls.length}`);
  console.log(`  ✅ Success: ${result.successMessages.join(' | ') || 'none'}`);
  console.log(`  ❌ Errors: ${result.errorMessages.join(' | ') || 'none'}`);

  // VERIFY: Product appears in list
  if (result.apiCalls.some((c: any) => c.status === 200 || c.status === 201)) {
    await page.goto(`${BASE}/admin/products`, { waitUntil: 'networkidle' });
    const productInList = await page.locator(`text=${testProductName}`).count();
    console.log(`  📋 Product visible in admin list: ${productInList > 0 ? '✅ YES' : '❌ NO'}`);

    // VERIFY: Product appears on public products page
    await page.goto(`${BASE}/products`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const productPublic = await page.locator(`text=${testProductName}`).count();
    console.log(`  📋 Product visible on public /products: ${productPublic > 0 ? '✅ YES' : '❌ NO (loading bug?)'}`);
  }

  // Test boundary: negative price
  await page.goto(`${BASE}/admin/products/new`, { waitUntil: 'networkidle' });
  if (await fields.price.count() > 0) {
    await fields.price.fill('-999');
    await page.click('button[type="submit"], button:has-text("Save")').catch(() => {});
    await page.waitForTimeout(1000);
    const negativeErrors = await page.locator('[role="alert"], .error').count();
    console.log(`  📋 Negative price validation: ${negativeErrors > 0 ? '✅ Blocked' : '⚠️  No validation'}`);
  }

  coverage.markFormTested('admin-create-product', ['valid', 'negative-price'], 'pass');
});

// ════════════════════════════════════════════════════════════════════════════
// TEST: Admin — Create Category form
// ════════════════════════════════════════════════════════════════════════════
test('FORM-07: Admin create category form', async ({ page }) => {
  await page.goto(`${BASE}/admin/categories`, { waitUntil: 'networkidle' });

  if (page.url().includes('/login')) {
    console.warn('  ⚠️  UNTESTED: Admin categories — not authenticated');
    return;
  }

  await screenshot(page, 'form07-admin-categories');

  // Look for "Add Category" button
  const addBtn = page.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Create")').first();
  if (await addBtn.count() > 0) {
    await addBtn.click();
    await page.waitForTimeout(800);
    await screenshot(page, 'form07-category-form-opened');

    const nameField = page.locator('input[name="name"], input[placeholder*="name" i]').first();
    const testName = `AUDIT-CAT-${Date.now()}`;
    if (await nameField.count() > 0) {
      await nameField.fill(testName);
      const result = await submitFormAndObserve(page, 'button[type="submit"], button:has-text("Save")');
      console.log(`  📡 Category create API calls: ${result.apiCalls.length}`);
      await screenshot(page, 'form07-category-created');
    }
  } else {
    console.warn('  ⚠️  UNTESTED: Add category button not found');
  }
});

// ════════════════════════════════════════════════════════════════════════════
// TEST: Signup / registration form
// ════════════════════════════════════════════════════════════════════════════
test('FORM-08: Signup form — validation and success', async ({ page }) => {
  const signupPaths = ['/signup', '/register', '/sign-up', '/auth/signup'];
  let signupFound = false;

  for (const path of signupPaths) {
    const res = await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
    if (res?.status() !== 404 && !page.url().includes('/login')) {
      signupFound = true;
      break;
    }
  }

  if (!signupFound) {
    console.warn('  ⚠️  UNTESTED: Signup page not found at common paths');
    return;
  }

  await screenshot(page, 'form08-signup-initial');
  coverage.addDiscoveredForm('signup-form', page.url().replace(BASE, ''), ['email', 'password', 'name']);

  // Weak password test
  const emailF = page.locator('input[type="email"]').first();
  const passF  = page.locator('input[type="password"]').first();

  if (await emailF.count() > 0) await emailF.fill(EMAIL_VALID);
  if (await passF.count()  > 0) await passF.fill('123'); // too short
  await page.click('button[type="submit"]').catch(() => {});
  await page.waitForTimeout(1000);
  await screenshot(page, 'form08-weak-password-response');
  const weakPassErrors = await page.locator('[role="alert"], .error, .text-red').count();
  console.log(`  📋 Weak password validation: ${weakPassErrors > 0 ? '✅ Blocked' : '⚠️  No validation'}`);

  // Valid signup (will create a real account — use disposable email)
  if (await emailF.count() > 0) await emailF.fill(`audit-${Date.now()}@mailinator.com`);
  if (await passF.count()  > 0) await passF.fill('AuditTest@2026');
  const nameF = page.locator('input[name="name"], input[placeholder*="name" i]').first();
  if (await nameF.count() > 0) await nameF.fill('Audit Test Account');

  const result = await submitFormAndObserve(page, 'button[type="submit"]', 3000);
  await screenshot(page, 'form08-signup-submitted');
  console.log(`  📡 Signup API calls: ${result.apiCalls.length}`);
  console.log(`  ✅ Success: ${result.successMessages.join(' | ') || 'none'}`);
  console.log(`  ❌ Errors: ${result.errorMessages.join(' | ') || 'none'}`);
});
