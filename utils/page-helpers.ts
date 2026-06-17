import { Page, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const BASE_URL = process.env.BASE_URL || 'https://oopsie-woopsie-code.lovable.app';
const SCREENSHOTS_DIR = process.env.SCREENSHOTS_DIR || 'reports/output/screenshots';

// ── Screenshot helper ────────────────────────────────────────────────────────
export async function screenshot(page: Page, name: string) {
  const safeName = name.replace(/[^a-z0-9-_]/gi, '_').toLowerCase();
  const filePath = path.join(SCREENSHOTS_DIR, `${Date.now()}-${safeName}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  return filePath;
}

// ── Network interceptor ──────────────────────────────────────────────────────
export function attachNetworkLogger(page: Page, log: any[] = []) {
  page.on('request', req => {
    const url = req.url();
    if (url.includes('supabase') || url.includes('/api/') || !url.startsWith('http')) {
      log.push({
        type: 'request',
        method: req.method(),
        url,
        headers: req.headers(),
        body: req.postData(),
        timestamp: Date.now(),
      });
    }
  });

  page.on('response', async res => {
    const url = res.url();
    if (url.includes('supabase') || url.includes('/api/')) {
      let body = '';
      try { body = await res.text(); } catch {}
      log.push({
        type: 'response',
        status: res.status(),
        url,
        body: body.slice(0, 2000), // cap at 2KB
        timestamp: Date.now(),
      });
    }
  });

  page.on('requestfailed', req => {
    log.push({
      type: 'failed',
      method: req.method(),
      url: req.url(),
      error: req.failure()?.errorText,
      timestamp: Date.now(),
    });
  });

  return log;
}

// ── Console error collector ──────────────────────────────────────────────────
export function attachConsoleLogger(page: Page, errors: string[] = []) {
  const NOISE = [
    'gpteng.co',
    'lovable',
    'Failed to load resource',
    'Content-Security-Policy',
    'net::ERR_',
    'Download the React DevTools',
    'sourcemap',
    'favicon',
    'preload',
  ];
  const isNoise = (s: string) => NOISE.some(n => s.toLowerCase().includes(n.toLowerCase()));
  page.on('console', msg => {
    const text = msg.text();
    if (isNoise(text)) return;
    if (msg.type() === 'error') errors.push(`[console.error] ${text}`);
  });
  page.on('pageerror', err => {
    if (isNoise(err.message)) return;
    errors.push(`[page.error] ${err.message}`);
  });
  return errors;
}

// ── Login helper ─────────────────────────────────────────────────────────────
export async function loginAs(page: Page, role: 'admin' | 'customer') {
  const email    = role === 'admin'
    ? (process.env.ADMIN_EMAIL    || '')
    : (process.env.CUSTOMER_EMAIL || '');
  const password = role === 'admin'
    ? (process.env.ADMIN_PASSWORD    || '')
    : (process.env.CUSTOMER_PASSWORD || '');

  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');

  // Try common selectors — Lovable generates different field IDs
  const emailSelectors = ['input[type="email"]', 'input[name="email"]', '#email', '[placeholder*="mail"]'];
  const passSelectors  = ['input[type="password"]', 'input[name="password"]', '#password'];

  for (const sel of emailSelectors) {
    if (await page.locator(sel).count() > 0) {
      await page.fill(sel, email);
      break;
    }
  }
  for (const sel of passSelectors) {
    if (await page.locator(sel).count() > 0) {
      await page.fill(sel, password);
      break;
    }
  }

  // Submit
  const submitSelectors = ['button[type="submit"]', 'button:has-text("Login")', 'button:has-text("Sign In")', 'button:has-text("Log in")'];
  for (const sel of submitSelectors) {
    if (await page.locator(sel).count() > 0) {
      await page.click(sel);
      break;
    }
  }

  await page.waitForLoadState('networkidle');
  return page;
}

// ── Wait for selector safely ─────────────────────────────────────────────────
export async function safeWaitFor(page: Page, selector: string, timeout = 5000): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch {
    return false;
  }
}

// ── Collect all links on page ────────────────────────────────────────────────
export async function collectLinks(page: Page): Promise<string[]> {
  const hrefs = await page.$$eval('a[href]', els =>
    els.map(el => (el as HTMLAnchorElement).href)
  );
  const base = new URL(BASE_URL);
  return [...new Set(
    hrefs
      .filter(h => {
        try { return new URL(h).hostname === base.hostname; }
        catch { return false; }
      })
      .map(h => {
        try { const u = new URL(h); return u.pathname + u.search; }
        catch { return ''; }
      })
      .filter(Boolean)
  )];
}

// ── Collect all forms on page ─────────────────────────────────────────────────
export async function collectForms(page: Page, pageRoute: string) {
  return await page.$$eval('form, [role="form"]', (forms, route) =>
    forms.map((form, i) => ({
      id: form.id || `form-${i}`,
      action: (form as HTMLFormElement).action || route,
      method: (form as HTMLFormElement).method || 'GET',
      fields: Array.from(form.querySelectorAll('input, select, textarea')).map(f => ({
        name: (f as HTMLInputElement).name,
        type: (f as HTMLInputElement).type,
        required: (f as HTMLInputElement).required,
        placeholder: (f as HTMLInputElement).placeholder,
      })),
    })), pageRoute
  );
}

// ── Save JSON log ─────────────────────────────────────────────────────────────
export function saveLog(name: string, data: any) {
  const dir = 'reports/output/network-logs';
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(`${dir}/${name}-${Date.now()}.json`, JSON.stringify(data, null, 2));
}
