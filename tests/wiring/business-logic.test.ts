/**
 * PHASE 9 — BUSINESS LOGIC AUDIT
 *
 * Tests:
 *  - Double payment / double submission
 *  - NutroPay wallet: top-up, balance, negative balance abuse
 *  - Coupon: stacking, reuse, expired coupons
 *  - Race conditions on checkout
 *  - Cart manipulation (negative quantity, zero price)
 *  - Order state manipulation
 *  - Cashback / reward duplication
 *
 * Risk classification: Financial risk highlighted separately
 */
import { test, expect } from '@playwright/test';
import { screenshot, attachNetworkLogger, saveLog } from '../../utils/page-helpers';
import { coverage } from '../../utils/coverage-tracker';
import * as dotenv from 'dotenv';
dotenv.config({ path: 'audit.env' });

const BASE = process.env.BASE_URL || 'https://oopsie-woopsie-code.lovable.app';

// ════════════════════════════════════════════════════════════════════════════
// TEST: Cart manipulation — negative quantity
// ════════════════════════════════════════════════════════════════════════════
test('BIZ-01: Cart — negative quantity and zero price manipulation', async ({ page }) => {
  await page.goto(`${BASE}/products`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Try to add a product
  const addToCartBtn = page.locator('button:has-text("Add to Cart"), button:has-text("Add"), [data-testid*="add-cart"]').first();
  if (await addToCartBtn.count() === 0) {
    console.warn('  ⚠️  UNTESTED: No "Add to Cart" button found — products page may not be loading');
    return;
  }

  await addToCartBtn.click();
  await page.waitForTimeout(1000);
  await page.goto(`${BASE}/cart`, { waitUntil: 'networkidle' });
  await screenshot(page, 'biz01-cart-initial');

  // Try to set quantity to negative via UI
  const quantityInput = page.locator('input[type="number"][name*="qty"], input[type="number"][name*="quantity"]').first();
  if (await quantityInput.count() > 0) {
    await quantityInput.fill('-1');
    await quantityInput.press('Enter');
    await page.waitForTimeout(1000);
    await screenshot(page, 'biz01-negative-quantity');

    const cartTotal = await page.locator('[data-testid*="total"], .cart-total, text=₹').first().textContent().catch(() => '');
    console.log(`  📋 Cart total with -1 quantity: ${cartTotal}`);

    if (cartTotal && cartTotal.includes('-')) {
      coverage.addSecurityFinding({
        type: 'BUSINESS_LOGIC',
        severity: 'CRITICAL',
        description: 'Cart accepts negative quantity — negative total could result in a refund/credit on checkout',
        evidence: `Setting quantity to -1 resulted in cart total: ${cartTotal}`,
        reproSteps: ['1. Add product to cart', '2. Go to /cart', '3. Set quantity to -1', '4. Observe negative total'],
        confidence: 'VERIFIED',
      });
    }

    // Try quantity 0
    await quantityInput.fill('0');
    await quantityInput.press('Enter');
    await page.waitForTimeout(1000);
    const zeroTotal = await page.locator('[data-testid*="total"], .cart-total').first().textContent().catch(() => '');
    console.log(`  📋 Cart total with 0 quantity: ${zeroTotal}`);
  }

  // Try direct API manipulation of cart quantity
  const networkLog = attachNetworkLogger(page);
  const cartApiCalls = networkLog.filter((r: any) => r.url?.includes('cart') || r.url?.includes('basket'));
  console.log(`  📡 Cart API calls captured: ${cartApiCalls.length}`);
});

// ════════════════════════════════════════════════════════════════════════════
// TEST: Checkout — race condition (double payment)
// ════════════════════════════════════════════════════════════════════════════
test('BIZ-02: Checkout race condition — simultaneous submit', async ({ browser }) => {
  // Simulate two simultaneous checkout submissions from same user
  const context = await browser.newContext({ storageState: '.auth/customer.json' });
  const page1 = await context.newPage();
  const page2 = await context.newPage();

  await page1.goto(`${BASE}/checkout`, { waitUntil: 'networkidle' });
  await page2.goto(`${BASE}/checkout`, { waitUntil: 'networkidle' });

  if (page1.url().includes('/login')) {
    console.warn('  ⚠️  UNTESTED: Checkout race condition — not authenticated');
    await context.close();
    return;
  }

  await screenshot(page1, 'biz02-checkout-tab1');
  await screenshot(page2, 'biz02-checkout-tab2');

  const networkLog1 = attachNetworkLogger(page1);
  const networkLog2 = attachNetworkLogger(page2);

  // Submit from both tabs simultaneously
  const submitBtn1 = page1.locator('button:has-text("Place Order"), button:has-text("Pay"), button[type="submit"]').first();
  const submitBtn2 = page2.locator('button:has-text("Place Order"), button:has-text("Pay"), button[type="submit"]').first();

  if (await submitBtn1.count() === 0) {
    console.warn('  ⚠️  UNTESTED: No checkout submit button found — form may require cart items');
    await context.close();
    return;
  }

  // Fire both simultaneously
  await Promise.all([
    submitBtn1.click().catch(() => {}),
    submitBtn2.click().catch(() => {}),
  ]);

  await page1.waitForTimeout(3000);
  await page2.waitForTimeout(3000);
  await screenshot(page1, 'biz02-race-tab1-result');
  await screenshot(page2, 'biz02-race-tab2-result');

  const orderCalls1 = networkLog1.filter((r: any) => r.url?.includes('orders') && r.type === 'response');
  const orderCalls2 = networkLog2.filter((r: any) => r.url?.includes('orders') && r.type === 'response');

  console.log(`  📡 Tab 1 order API calls: ${orderCalls1.length}`);
  console.log(`  📡 Tab 2 order API calls: ${orderCalls2.length}`);

  if (orderCalls1.length > 0 && orderCalls2.length > 0) {
    console.warn('  🚨 INFERRED: Both tabs triggered order API calls — possible duplicate order risk');
    coverage.addSecurityFinding({
      type: 'RACE_CONDITION',
      severity: 'HIGH',
      description: 'Checkout may allow duplicate orders via simultaneous tab submission',
      evidence: `Both browser tabs triggered order API calls simultaneously`,
      reproSteps: ['1. Open checkout in two tabs', '2. Click Place Order simultaneously in both', '3. Observe both trigger order API'],
      confidence: 'INFERRED',
    });
  }

  await context.close();
});

// ════════════════════════════════════════════════════════════════════════════
// TEST: NutroPay wallet — balance manipulation
// ════════════════════════════════════════════════════════════════════════════
test('BIZ-03: NutroPay wallet — balance and top-up security', async ({ page }) => {
  await page.goto(`${BASE}/account/wallet`, { waitUntil: 'networkidle' });

  if (page.url().includes('/login')) {
    console.warn('  ⚠️  UNTESTED: Wallet tests — not authenticated');
    return;
  }

  await screenshot(page, 'biz03-wallet-initial');

  const walletBalance = await page.locator('[data-testid*="balance"], .wallet-balance, text=₹').first()
    .textContent().catch(() => null);
  console.log(`  📋 Wallet balance displayed: ${walletBalance || 'not found'}`);

  // Check top-up form
  const topUpBtn = page.locator('button:has-text("Top Up"), button:has-text("Add Money"), button:has-text("Recharge")').first();
  if (await topUpBtn.count() > 0) {
    await topUpBtn.click();
    await page.waitForTimeout(800);
    await screenshot(page, 'biz03-wallet-topup-form');

    const amountInput = page.locator('input[type="number"], input[name*="amount"]').first();
    if (await amountInput.count() > 0) {
      // Test: negative amount top-up
      await amountInput.fill('-500');
      await page.click('button[type="submit"]').catch(() => {});
      await page.waitForTimeout(1000);
      const errors = await page.locator('[role="alert"], .error').count();
      console.log(`  📋 Negative top-up rejected: ${errors > 0 ? '✅ Yes' : '⚠️  No validation'}`);

      // Test: zero amount
      await amountInput.fill('0');
      await page.click('button[type="submit"]').catch(() => {});
      await page.waitForTimeout(1000);
      await screenshot(page, 'biz03-wallet-zero-topup');

      // Test: extremely large amount
      await amountInput.fill('999999999');
      await page.click('button[type="submit"]').catch(() => {});
      await page.waitForTimeout(1000);
      const largeErrors = await page.locator('[role="alert"], .error').count();
      console.log(`  📋 Large amount (999999999) rejected: ${largeErrors > 0 ? '✅ Yes' : '⚠️  No max validation'}`);
    }
  }

  // Check: wallet balance used at checkout — can it go negative?
  await page.goto(`${BASE}/checkout`, { waitUntil: 'networkidle' });
  const walletPayOption = page.locator('label:has-text("NutroPay"), input[value*="wallet"], [data-testid*="wallet-pay"]').first();
  if (await walletPayOption.count() > 0) {
    await walletPayOption.click();
    await screenshot(page, 'biz03-checkout-wallet-selected');
    const walletAtCheckout = await page.locator('[data-testid*="balance"], .wallet-balance').first()
      .textContent().catch(() => 'not displayed');
    console.log(`  📋 Wallet balance shown at checkout: ${walletAtCheckout}`);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// TEST: Coupon code abuse
// ════════════════════════════════════════════════════════════════════════════
test('BIZ-04: Coupon code — stacking, reuse, and expired codes', async ({ page }) => {
  await page.goto(`${BASE}/cart`, { waitUntil: 'networkidle' });

  if (page.url().includes('/login')) {
    console.warn('  ⚠️  UNTESTED: Coupon tests — not authenticated');
    return;
  }

  await screenshot(page, 'biz04-cart-coupon');

  const couponInput = page.locator('input[name*="coupon"], input[placeholder*="coupon" i], input[placeholder*="promo" i]').first();
  if (await couponInput.count() === 0) {
    console.warn('  ⚠️  UNTESTED: No coupon input found on cart page');
    return;
  }

  const networkLog = attachNetworkLogger(page);

  // Test: invalid coupon
  await couponInput.fill('INVALID-COUPON-XYZ');
  await page.click('button:has-text("Apply"), button[type="submit"]').catch(() => {});
  await page.waitForTimeout(1000);
  const invalidError = await page.locator('[role="alert"], .error, .text-red').first().textContent().catch(() => '');
  console.log(`  📋 Invalid coupon error: "${invalidError}"`);

  // Test: empty coupon
  await couponInput.fill('');
  await page.click('button:has-text("Apply")').catch(() => {});
  await page.waitForTimeout(500);

  // Test: common test coupons (observe — don't abuse)
  const testCoupons = ['SAVE10', 'WELCOME', 'FIRST10', 'NEW10', 'TEST', 'ADMIN', '100OFF', 'FREESHIP'];
  let validCouponFound: string | null = null;

  for (const code of testCoupons) {
    await couponInput.fill(code);
    const [couponRes] = await Promise.all([
      page.waitForResponse(
        res => res.url().includes('coupon') || res.url().includes('promo') || res.url().includes('discount'),
        { timeout: 3000 }
      ).catch(() => null),
      page.click('button:has-text("Apply")').catch(() => {}),
    ]);

    if (couponRes?.status() === 200) {
      const body = await couponRes.text().catch(() => '');
      if (body.includes('discount') || body.includes('valid')) {
        validCouponFound = code;
        console.log(`  ⚠️  Valid coupon found: "${code}"`);
        await screenshot(page, `biz04-valid-coupon-${code}`);
        break;
      }
    }
    await page.waitForTimeout(300);
  }

  // If valid coupon found, test stacking
  if (validCouponFound) {
    // Apply same coupon twice
    await couponInput.fill(validCouponFound);
    await page.click('button:has-text("Apply")').catch(() => {});
    await page.waitForTimeout(1000);
    await couponInput.fill(validCouponFound); // Apply again
    await page.click('button:has-text("Apply")').catch(() => {});
    await page.waitForTimeout(1000);

    const discountElements = await page.locator('[data-testid*="discount"], .discount, text=-₹').count();
    console.log(`  📋 Discount elements after double-apply: ${discountElements}`);
  }

  saveLog('biz04-coupon-network', networkLog);
});

// ════════════════════════════════════════════════════════════════════════════
// TEST: Order status manipulation via direct URL
// ════════════════════════════════════════════════════════════════════════════
test('BIZ-05: Order status — direct state manipulation attempt', async ({ page }) => {
  // Attempt to access orders directly and manipulate status via URL
  const manipulationAttempts = [
    `/admin/orders/1?status=delivered`,
    `/api/orders/1`,
    `/orders/1/cancel`,
    `/orders/1/refund`,
  ];

  for (const path of manipulationAttempts) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
    const status = page.url();
    const content = await page.content();
    const hasOrderData = content.toLowerCase().includes('order') && !content.includes('Not Found') && !content.includes('404');

    console.log(`  📍 ${path} → ${page.url()} (has order data: ${hasOrderData})`);

    if (hasOrderData && !status.includes('/login')) {
      coverage.addSecurityFinding({
        type: 'BUSINESS_LOGIC',
        severity: 'HIGH',
        description: `Order endpoint ${path} accessible — potential state manipulation`,
        evidence: `Direct URL access to ${path} returned order data without proper context check`,
        reproSteps: [`1. Navigate directly to ${BASE}${path}`, '2. Observe order data accessible'],
        confidence: 'INFERRED',
      });
    }
  }
});

// ════════════════════════════════════════════════════════════════════════════
// TEST: Price manipulation in checkout
// ════════════════════════════════════════════════════════════════════════════
test('BIZ-06: Price manipulation — client-side price tampering', async ({ page }) => {
  await page.goto(`${BASE}/cart`, { waitUntil: 'networkidle' });

  // Attempt to modify price via localStorage or page state
  const manipulationResult = await page.evaluate(() => {
    // Try to find and modify any price-related state in localStorage
    const keys = Object.keys(localStorage);
    const cartKey = keys.find(k => k.toLowerCase().includes('cart'));
    if (!cartKey) return { found: false };

    const cartData = localStorage.getItem(cartKey);
    if (!cartData) return { found: false };

    try {
      const cart = JSON.parse(cartData);
      // Try to set price to 1
      if (Array.isArray(cart)) {
        cart.forEach((item: any) => { if (item.price) item.price = 1; });
        localStorage.setItem(cartKey, JSON.stringify(cart));
        return { found: true, modified: true, key: cartKey };
      }
      return { found: true, modified: false };
    } catch {
      return { found: true, parseError: true };
    }
  });

  console.log(`  📋 Cart in localStorage: ${manipulationResult.found ? 'YES' : 'NO'}`);

  if (manipulationResult.modified) {
    // Reload and check if price was accepted
    await page.reload({ waitUntil: 'networkidle' });
    await screenshot(page, 'biz06-price-manipulated');

    const total = await page.locator('[data-testid*="total"], .cart-total').first().textContent().catch(() => '');
    console.log(`  📋 Cart total after localStorage price manipulation: ${total}`);

    if (total && (total.includes('₹1') || total.includes('₹0'))) {
      coverage.addSecurityFinding({
        type: 'BUSINESS_LOGIC',
        severity: 'CRITICAL',
        description: 'Cart price is stored client-side and can be manipulated via localStorage',
        evidence: `Modified cart localStorage to set price=1, page reloaded showing total: ${total}`,
        reproSteps: [
          '1. Add product to cart',
          '2. Open DevTools > Application > localStorage',
          '3. Find cart key, parse JSON, set item.price=1',
          '4. Reload page — observe manipulated price in UI',
          '5. Server must validate prices on order creation, not trust client',
        ],
        confidence: 'VERIFIED',
      });
    } else {
      console.log('  ✅ Price manipulation via localStorage did not affect displayed total');
    }
  }
});
