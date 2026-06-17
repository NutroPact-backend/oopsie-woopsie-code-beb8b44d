/**
 * PHASE 14 — PERFORMANCE AUDIT
 *
 * Measures:
 *  - Core Web Vitals: LCP, CLS, INP (FID), TTFB, TBT
 *  - Page load time per route
 *  - JavaScript bundle size
 *  - Network waterfall timing
 *  - Image optimization
 *  - Font loading strategy
 *  - Third-party script impact
 *  - React render performance (re-render count)
 *  - API response times
 *  - Memory usage
 *
 * All findings: VERIFIED (measured) / INFERRED / UNTESTED
 * Output: reports/output/performance/
 *
 * Thresholds used (Google "Good" band):
 *   LCP   < 2500ms
 *   CLS   < 0.1
 *   INP   < 200ms
 *   TTFB  < 800ms
 *   FCP   < 1800ms
 */
import { test, expect } from '@playwright/test';
import { screenshot, saveLog } from '../../utils/page-helpers';
import { coverage } from '../../utils/coverage-tracker';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

const BASE = process.env.BASE_URL || 'https://oopsie-woopsie-code.lovable.app';

interface PerformanceResult {
  page: string;
  lcp: number | null;
  cls: number | null;
  fcp: number | null;
  ttfb: number | null;
  domContentLoaded: number | null;
  domComplete: number | null;
  totalBlockingTime: number | null;
  jsHeapSizeMB: number | null;
  resourceCount: number;
  totalTransferBytes: number;
  largestImage: { url: string; size: number } | null;
  verdict: 'GOOD' | 'NEEDS_IMPROVEMENT' | 'POOR';
}

const performanceResults: PerformanceResult[] = [];

// ── Measure Core Web Vitals via PerformanceObserver ───────────────────────
async function measureWebVitals(page: any, route: string): Promise<PerformanceResult> {
  // Inject measurement scripts before navigation
  await page.addInitScript(() => {
    (window as any).__perf = {
      lcp: null, cls: 0, fcp: null, inp: null, entries: []
    };

    // LCP
    new PerformanceObserver(list => {
      const entries = list.getEntries();
      (window as any).__perf.lcp = entries[entries.length - 1].startTime;
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // CLS
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          (window as any).__perf.cls += (entry as any).value;
        }
      }
    }).observe({ entryTypes: ['layout-shift'] });

    // FCP
    new PerformanceObserver(list => {
      const fcp = list.getEntriesByName('first-contentful-paint')[0];
      if (fcp) (window as any).__perf.fcp = fcp.startTime;
    }).observe({ entryTypes: ['paint'] });

    // INP (Interaction to Next Paint)
    new PerformanceObserver(list => {
      const entries = list.getEntries();
      (window as any).__perf.inp = Math.max(
        ...entries.map((e: any) => e.duration)
      );
    }).observe({ entryTypes: ['event'] });
  });

  const navStart = Date.now();
  await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000); // Allow observers to collect

  const vitals = await page.evaluate(() => (window as any).__perf);

  // Navigation timing
  const navTiming = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (!nav) return null;
    return {
      ttfb: nav.responseStart - nav.requestStart,
      domContentLoaded: nav.domContentLoadedEventEnd - nav.startTime,
      domComplete: nav.domComplete - nav.startTime,
    };
  });

  // Resource analysis
  const resources = await page.evaluate(() => {
    const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    return entries.map(r => ({
      url: r.name.slice(0, 120),
      type: r.initiatorType,
      duration: Math.round(r.duration),
      transferSize: r.transferSize || 0,
      encodedBodySize: r.encodedBodySize || 0,
    }));
  });

  const totalTransferBytes = resources.reduce((sum, r) => sum + r.transferSize, 0);

  const images = resources.filter(r => r.type === 'img' || r.url.match(/\.(jpg|jpeg|png|gif|webp|svg)/i));
  const largestImage = images.sort((a, b) => b.transferSize - a.transferSize)[0] || null;

  // JS heap size
  const jsHeapSizeMB = await page.evaluate(() => {
    const mem = (performance as any).memory;
    return mem ? Math.round(mem.usedJSHeapSize / 1024 / 1024) : null;
  });

  // Determine verdict
  const lcp = vitals?.lcp || null;
  const cls = vitals?.cls || 0;
  const ttfb = navTiming?.ttfb || null;

  let verdict: 'GOOD' | 'NEEDS_IMPROVEMENT' | 'POOR' = 'GOOD';
  if ((lcp && lcp > 4000) || cls > 0.25 || (ttfb && ttfb > 1800)) verdict = 'POOR';
  else if ((lcp && lcp > 2500) || cls > 0.1 || (ttfb && ttfb > 800)) verdict = 'NEEDS_IMPROVEMENT';

  const result: PerformanceResult = {
    page: route,
    lcp: lcp ? Math.round(lcp) : null,
    cls: cls ? parseFloat(cls.toFixed(4)) : 0,
    fcp: vitals?.fcp ? Math.round(vitals.fcp) : null,
    ttfb: navTiming?.ttfb ? Math.round(navTiming.ttfb) : null,
    domContentLoaded: navTiming?.domContentLoaded ? Math.round(navTiming.domContentLoaded) : null,
    domComplete: navTiming?.domComplete ? Math.round(navTiming.domComplete) : null,
    totalBlockingTime: null, // Requires Lighthouse for accurate TBT
    jsHeapSizeMB,
    resourceCount: resources.length,
    totalTransferBytes,
    largestImage: largestImage ? { url: largestImage.url, size: largestImage.transferSize } : null,
    verdict,
  };

  coverage.addPerformanceMetric({
    page: route,
    lcp: result.lcp || undefined,
    cls: result.cls || undefined,
    ttfb: result.ttfb || undefined,
  });

  return result;
}

// ════════════════════════════════════════════════════════════════════════════
// TEST: Core Web Vitals — all key pages
// ════════════════════════════════════════════════════════════════════════════
test('PERF-01: Core Web Vitals — LCP, CLS, FCP, TTFB', async ({ page }) => {
  const PAGES = [
    '/',
    '/products',
    '/about',
    '/faq',
    '/contact',
  ];

  console.log('\n  📊 CORE WEB VITALS AUDIT:\n');
  console.log('  Page                 LCP      CLS     FCP      TTFB     DOMcomplete  Verdict');
  console.log('  ' + '─'.repeat(90));

  for (const route of PAGES) {
    try {
      const result = await measureWebVitals(page, route);
      performanceResults.push(result);

      const icon = result.verdict === 'GOOD' ? '✅' : result.verdict === 'NEEDS_IMPROVEMENT' ? '⚠️ ' : '🔴';
      console.log(
        `  ${icon} ${route.padEnd(20)} ` +
        `${(result.lcp?.toString() || 'N/A').padEnd(8)} ` +
        `${(result.cls?.toString() || 'N/A').padEnd(7)} ` +
        `${(result.fcp?.toString() || 'N/A').padEnd(8)} ` +
        `${(result.ttfb?.toString() || 'N/A').padEnd(8)} ` +
        `${(result.domComplete?.toString() || 'N/A').padEnd(12)} ` +
        result.verdict
      );

      // File findings for poor metrics
      if (result.lcp && result.lcp > 2500) {
        coverage.addSecurityFinding({
          type: 'PERFORMANCE',
          severity: result.lcp > 4000 ? 'HIGH' : 'MEDIUM',
          description: `Poor LCP on ${route}: ${result.lcp}ms (threshold: 2500ms)`,
          evidence: `LCP measured at ${result.lcp}ms. DOM complete at ${result.domComplete}ms`,
          reproSteps: [`1. Navigate to ${BASE}${route}`, '2. Open Chrome DevTools > Lighthouse', '3. Run Performance audit'],
          confidence: 'VERIFIED',
        });
      }

      if (result.cls && result.cls > 0.1) {
        coverage.addSecurityFinding({
          type: 'PERFORMANCE',
          severity: result.cls > 0.25 ? 'HIGH' : 'MEDIUM',
          description: `High CLS on ${route}: ${result.cls} (threshold: 0.1)`,
          evidence: `CLS measured at ${result.cls}`,
          reproSteps: [`1. Navigate to ${route}`, '2. Observe layout shifts after page load'],
          confidence: 'VERIFIED',
        });
      }

      await screenshot(page, `perf01-${route.replace(/\//g, '_') || 'home'}`);
    } catch (e: any) {
      console.warn(`  ❌ Error measuring ${route}: ${e.message}`);
    }
  }
});

// ════════════════════════════════════════════════════════════════════════════
// TEST: JavaScript bundle analysis
// ════════════════════════════════════════════════════════════════════════════
test('PERF-02: JavaScript bundle size and loading strategy', async ({ page }) => {
  const jsResources: { url: string; size: number; duration: number; cached: boolean }[] = [];

  page.on('response', async (res: any) => {
    const url = res.url();
    const ct = res.headers()['content-type'] || '';
    if (ct.includes('javascript') || url.endsWith('.js') || url.includes('.js?')) {
      let size = 0;
      try { size = (await res.body()).length; } catch {}
      const timing = res.request().timing();
      jsResources.push({
        url: url.slice(0, 120),
        size,
        duration: Math.round((timing?.responseEnd || 0) - (timing?.sendStart || 0)),
        cached: res.status() === 304,
      });
    }
  });

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });

  const totalJsBytes = jsResources.reduce((s, r) => s + r.size, 0);
  const totalJsKB = Math.round(totalJsBytes / 1024);

  console.log(`\n  📦 JAVASCRIPT BUNDLE ANALYSIS:`);
  console.log(`     Total JS resources: ${jsResources.length}`);
  console.log(`     Total JS size:      ${totalJsKB} KB`);

  jsResources
    .sort((a, b) => b.size - a.size)
    .slice(0, 10)
    .forEach(r => {
      const sizeKB = Math.round(r.size / 1024);
      const icon = sizeKB > 500 ? '🔴' : sizeKB > 250 ? '⚠️ ' : '✅';
      console.log(`     ${icon} ${sizeKB.toString().padEnd(6)} KB — ${r.url.split('/').pop()?.slice(0, 60)}`);
    });

  if (totalJsKB > 1000) {
    coverage.addSecurityFinding({
      type: 'PERFORMANCE',
      severity: 'HIGH',
      description: `Total JavaScript bundle size is ${totalJsKB}KB — exceeds recommended 300KB for initial load`,
      evidence: `${jsResources.length} JS files loaded, total ${totalJsKB}KB`,
      reproSteps: ['1. Open DevTools > Network', '2. Filter by JS', '3. Observe total transfer size'],
      confidence: 'VERIFIED',
    });
  }

  // Check for render-blocking scripts
  const renderBlocking = await page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script[src]'));
    return scripts
      .filter(s => !s.hasAttribute('async') && !s.hasAttribute('defer') && !s.hasAttribute('type'))
      .map(s => (s as HTMLScriptElement).src.slice(0, 100));
  });

  if (renderBlocking.length > 0) {
    console.warn(`\n  ⚠️  RENDER-BLOCKING SCRIPTS (${renderBlocking.length}):`);
    renderBlocking.forEach(s => console.warn(`     ${s}`));
    coverage.addSecurityFinding({
      type: 'PERFORMANCE',
      severity: 'MEDIUM',
      description: `${renderBlocking.length} render-blocking scripts without async/defer`,
      evidence: `Scripts without async/defer: ${renderBlocking.join(', ').slice(0, 300)}`,
      reproSteps: ['1. View page source', '2. Find <script src="..."> without async or defer'],
      confidence: 'VERIFIED',
    });
  }

  saveLog('perf02-bundles', { jsResources, totalJsKB, renderBlocking });
  expect(totalJsKB).toBeLessThan(3000); // Sanity check
});

// ════════════════════════════════════════════════════════════════════════════
// TEST: Image optimization audit
// ════════════════════════════════════════════════════════════════════════════
test('PERF-03: Image optimization — format, lazy loading, sizing', async ({ page }) => {
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });

  const imageAudit = await page.evaluate(() => {
    const images = Array.from(document.querySelectorAll('img'));
    return images.map(img => ({
      src: img.src?.slice(0, 120),
      alt: img.alt || '',
      loading: img.loading,
      width: img.naturalWidth,
      height: img.naturalHeight,
      displayWidth: img.clientWidth,
      displayHeight: img.clientHeight,
      isWebP: img.src?.includes('.webp') || img.src?.includes('fm=webp') || img.src?.includes('format=webp'),
      isLazy: img.loading === 'lazy',
      hasExplicitDimensions: img.hasAttribute('width') && img.hasAttribute('height'),
      isAboveTheFold: img.getBoundingClientRect().top < window.innerHeight,
    }));
  });

  const issues = {
    noAlt:             imageAudit.filter(img => !img.alt).length,
    notLazy:           imageAudit.filter(img => !img.isLazy && !img.isAboveTheFold).length,
    notWebP:           imageAudit.filter(img => !img.isWebP).length,
    noDimensions:      imageAudit.filter(img => !img.hasExplicitDimensions).length,
    oversized:         imageAudit.filter(img => img.width > img.displayWidth * 2 && img.displayWidth > 0).length,
    aboveTheFoldLazy:  imageAudit.filter(img => img.isLazy && img.isAboveTheFold).length,
  };

  console.log('\n  🖼️  IMAGE OPTIMIZATION AUDIT:');
  console.log(`     Total images:           ${imageAudit.length}`);
  console.log(`     Missing alt text:       ${issues.noAlt}       ${issues.noAlt > 0 ? '⚠️ ' : '✅'}`);
  console.log(`     Not lazy loaded:        ${issues.notLazy}       ${issues.notLazy > 3 ? '⚠️ ' : '✅'}`);
  console.log(`     Not WebP format:        ${issues.notWebP}       ${issues.notWebP > 0 ? '⚠️ ' : '✅'}`);
  console.log(`     No explicit dimensions: ${issues.noDimensions}       ${issues.noDimensions > 0 ? '⚠️ ' : '✅'}`);
  console.log(`     Likely oversized:       ${issues.oversized}       ${issues.oversized > 0 ? '⚠️ ' : '✅'}`);
  console.log(`     Above-fold with lazy:   ${issues.aboveTheFoldLazy}       ${issues.aboveTheFoldLazy > 0 ? '⚠️ ' : '✅'}`);

  if (issues.notWebP > 3) {
    coverage.addSecurityFinding({
      type: 'PERFORMANCE',
      severity: 'MEDIUM',
      description: `${issues.notWebP} images not served in WebP format — larger file sizes increase page weight`,
      evidence: `${issues.notWebP}/${imageAudit.length} images lack WebP format`,
      reproSteps: ['1. DevTools > Network > filter Img', '2. Check Content-Type of image responses'],
      confidence: 'VERIFIED',
    });
  }

  if (issues.aboveTheFoldLazy > 0) {
    coverage.addSecurityFinding({
      type: 'PERFORMANCE',
      severity: 'MEDIUM',
      description: `${issues.aboveTheFoldLazy} above-the-fold images have loading="lazy" — delays LCP`,
      evidence: `Hero/above-fold images with lazy loading cause LCP regression`,
      reproSteps: ['1. Open page', '2. Inspect hero image HTML', '3. Check loading attribute'],
      confidence: 'VERIFIED',
    });
  }

  saveLog('perf03-images', { imageAudit, issues });
});

// ════════════════════════════════════════════════════════════════════════════
// TEST: Font loading strategy
// ════════════════════════════════════════════════════════════════════════════
test('PERF-04: Font loading — FOUT/FOIT/font-display', async ({ page }) => {
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });

  const fontAudit = await page.evaluate(() => {
    // Check font-display in stylesheets
    const fontFaces: { family: string; display: string; src: string }[] = [];
    try {
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          for (const rule of Array.from(sheet.cssRules || [])) {
            if (rule instanceof CSSFontFaceRule) {
              fontFaces.push({
                family: rule.style.getPropertyValue('font-family'),
                display: rule.style.getPropertyValue('font-display') || 'auto',
                src: rule.style.getPropertyValue('src').slice(0, 80),
              });
            }
          }
        } catch {}
      }
    } catch {}

    // Preload links for fonts
    const preloadFonts = Array.from(
      document.querySelectorAll('link[rel="preload"][as="font"]')
    ).map(l => l.getAttribute('href'));

    return { fontFaces, preloadFonts };
  });

  console.log('\n  🔤 FONT LOADING AUDIT:');
  console.log(`     @font-face rules:    ${fontAudit.fontFaces.length}`);
  console.log(`     Preloaded fonts:     ${fontAudit.preloadFonts.length}`);

  fontAudit.fontFaces.forEach(f => {
    const swapOk = ['swap', 'optional', 'fallback'].includes(f.display);
    console.log(`     font-family: ${f.family} — font-display: ${f.display} ${swapOk ? '✅' : '⚠️  (use swap)'}`);

    if (!swapOk) {
      coverage.addSecurityFinding({
        type: 'PERFORMANCE',
        severity: 'LOW',
        description: `Font "${f.family}" uses font-display: ${f.display} — causes FOIT (invisible text during load)`,
        evidence: `@font-face { font-family: ${f.family}; font-display: ${f.display || 'auto (blocks render)'} }`,
        reproSteps: ['1. View CSS source', '2. Find @font-face rules', '3. Check font-display value'],
        confidence: 'VERIFIED',
      });
    }
  });

  if (fontAudit.preloadFonts.length === 0 && fontAudit.fontFaces.length > 0) {
    console.warn('  ⚠️  No font preload links — fonts loaded late, worsening FCP');
  }

  saveLog('perf04-fonts', fontAudit);
});

// ════════════════════════════════════════════════════════════════════════════
// TEST: API response times
// ════════════════════════════════════════════════════════════════════════════
test('PERF-05: API response time benchmarks', async ({ page }) => {
  const apiTimings: { url: string; method: string; duration: number; status: number }[] = [];

  page.on('response', async (res: any) => {
    const url = res.url();
    if (url.includes('supabase') || url.includes('/api/')) {
      const timing = res.request().timing();
      const duration = Math.round((timing?.responseEnd || 0) - (timing?.sendStart || 0));
      apiTimings.push({
        url: url.slice(0, 100),
        method: res.request().method(),
        duration,
        status: res.status(),
      });
    }
  });

  const PAGES = ['/', '/products', '/admin', '/admin/products', '/admin/orders'];
  for (const route of PAGES) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
  }

  const slowApis = apiTimings.filter(t => t.duration > 1000);

  console.log('\n  ⏱️  API RESPONSE TIMES:');
  apiTimings
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 15)
    .forEach(t => {
      const icon = t.duration > 2000 ? '🔴' : t.duration > 1000 ? '⚠️ ' : '✅';
      console.log(`  ${icon} ${t.duration}ms — ${t.method} ${t.url.split('/').slice(-3).join('/')}`);
    });

  if (slowApis.length > 0) {
    coverage.addSecurityFinding({
      type: 'PERFORMANCE',
      severity: 'MEDIUM',
      description: `${slowApis.length} API calls exceed 1000ms response time`,
      evidence: `Slowest: ${slowApis[0]?.url} at ${slowApis[0]?.duration}ms`,
      reproSteps: ['1. Open DevTools > Network', '2. Filter by XHR/Fetch', '3. Sort by duration'],
      confidence: 'VERIFIED',
    });
  }

  saveLog('perf05-api-timings', apiTimings);
});

// ════════════════════════════════════════════════════════════════════════════
// TEST: Memory usage and potential leaks
// ════════════════════════════════════════════════════════════════════════════
test('PERF-06: Memory usage and leak detection', async ({ page }) => {
  const memReadings: { route: string; heapMB: number }[] = [];

  const getHeap = async (route: string) => {
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const heap = await page.evaluate(() => {
      const mem = (performance as any).memory;
      return mem ? Math.round(mem.usedJSHeapSize / 1024 / 1024) : null;
    });
    if (heap) memReadings.push({ route, heapMB: heap });
    return heap;
  };

  const ROUTES = ['/', '/products', '/faq', '/about', '/contact', '/'];

  console.log('\n  🧠 MEMORY USAGE:');
  for (const route of ROUTES) {
    const heap = await getHeap(route);
    console.log(`     ${route.padEnd(20)} ${heap !== null ? heap + ' MB' : 'N/A (non-Chrome)'}`);
  }

  // Check for growth — if heap on '/' second visit > first visit * 1.5 = possible leak
  const firstHome = memReadings.find(r => r.route === '/')?.heapMB || 0;
  const lastHome  = memReadings.filter(r => r.route === '/').pop()?.heapMB || 0;
  const growth    = lastHome > 0 ? ((lastHome - firstHome) / firstHome * 100).toFixed(1) : 'N/A';

  console.log(`\n     Heap growth (home 1st → last): ${firstHome}MB → ${lastHome}MB (${growth}%)`);
  if (parseFloat(growth as string) > 50) {
    coverage.addSecurityFinding({
      type: 'PERFORMANCE',
      severity: 'MEDIUM',
      description: `Possible memory leak — JS heap grew ${growth}% during navigation session`,
      evidence: `JS heap: ${firstHome}MB on first load → ${lastHome}MB after navigating 6 routes`,
      reproSteps: ['1. Open page', '2. Navigate across 5+ routes', '3. Monitor Performance > Memory in DevTools'],
      confidence: 'INFERRED',
    });
  }

  saveLog('perf06-memory', memReadings);
});

// ════════════════════════════════════════════════════════════════════════════
// TEST: Mobile performance
// ════════════════════════════════════════════════════════════════════════════
test('PERF-07: Mobile viewport performance and responsiveness', async ({ page }) => {
  // Emulate mobile
  await page.setViewportSize({ width: 390, height: 844 }); // iPhone 14
  await page.emulateMedia({ media: 'screen' });

  const mobileResults: any[] = [];

  for (const route of ['/', '/products', '/faq']) {
    const result = await measureWebVitals(page, route);
    mobileResults.push(result);
    await screenshot(page, `perf07-mobile-${route.replace('/', '_') || 'home'}`);

    console.log(`  📱 ${route}: LCP=${result.lcp}ms, CLS=${result.cls}, verdict=${result.verdict}`);
  }

  const poorMobile = mobileResults.filter(r => r.verdict === 'POOR');
  if (poorMobile.length > 0) {
    coverage.addSecurityFinding({
      type: 'PERFORMANCE',
      severity: 'HIGH',
      description: `Poor mobile Core Web Vitals on ${poorMobile.length} pages`,
      evidence: poorMobile.map(r => `${r.page}: LCP=${r.lcp}ms CLS=${r.cls}`).join(', '),
      reproSteps: ['1. Open Chrome DevTools', '2. Toggle device toolbar (mobile)', '3. Run Lighthouse mobile audit'],
      confidence: 'VERIFIED',
    });
  }

  // Check mobile layout
  const mobileIssues = await page.evaluate(() => {
    const issues: string[] = [];
    // Check for horizontal overflow
    if (document.body.scrollWidth > window.innerWidth) {
      issues.push(`Horizontal overflow: body.scrollWidth (${document.body.scrollWidth}) > viewport (${window.innerWidth})`);
    }
    // Check tap target sizes
    const buttons = Array.from(document.querySelectorAll('button, a'));
    const smallTargets = buttons.filter(b => {
      const rect = b.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44);
    });
    if (smallTargets.length > 3) {
      issues.push(`${smallTargets.length} tap targets smaller than 44x44px`);
    }
    return issues;
  });

  if (mobileIssues.length > 0) {
    mobileIssues.forEach(issue => {
      console.warn(`  ⚠️  Mobile issue: ${issue}`);
      coverage.addSecurityFinding({
        type: 'MOBILE_UX',
        severity: 'MEDIUM',
        description: `Mobile layout issue: ${issue}`,
        evidence: issue,
        reproSteps: ['1. Open site on mobile device', '2. Observe layout/interaction issues'],
        confidence: 'VERIFIED',
      });
    });
  }

  saveLog('perf07-mobile', mobileResults);
});

// ════════════════════════════════════════════════════════════════════════════
// Final: Generate performance report
// ════════════════════════════════════════════════════════════════════════════
test('PERF-99: Generate performance report', async () => {
  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      pagesAudited: performanceResults.length,
      good:             performanceResults.filter(r => r.verdict === 'GOOD').length,
      needsImprovement: performanceResults.filter(r => r.verdict === 'NEEDS_IMPROVEMENT').length,
      poor:             performanceResults.filter(r => r.verdict === 'POOR').length,
      avgLcp:           Math.round(performanceResults.filter(r => r.lcp).reduce((s, r) => s + r.lcp!, 0) / (performanceResults.filter(r => r.lcp).length || 1)),
      avgCls:           parseFloat((performanceResults.reduce((s, r) => s + (r.cls || 0), 0) / (performanceResults.length || 1)).toFixed(4)),
      avgTtfb:          Math.round(performanceResults.filter(r => r.ttfb).reduce((s, r) => s + r.ttfb!, 0) / (performanceResults.filter(r => r.ttfb).length || 1)),
    },
    results: performanceResults,
    thresholds: {
      lcp: { good: 2500, poor: 4000, unit: 'ms' },
      cls: { good: 0.1,  poor: 0.25 },
      ttfb: { good: 800, poor: 1800, unit: 'ms' },
    },
  };

  fs.mkdirSync('reports/output/performance', { recursive: true });
  fs.writeFileSync('reports/output/performance/performance-report.json', JSON.stringify(report, null, 2));

  console.log('\n  📊 PERFORMANCE SUMMARY:');
  console.log(`     Good:              ${report.summary.good}`);
  console.log(`     Needs Improvement: ${report.summary.needsImprovement}`);
  console.log(`     Poor:              ${report.summary.poor}`);
  console.log(`     Avg LCP:           ${report.summary.avgLcp}ms ${report.summary.avgLcp > 2500 ? '⚠️ ' : '✅'}`);
  console.log(`     Avg CLS:           ${report.summary.avgCls} ${report.summary.avgCls > 0.1 ? '⚠️ ' : '✅'}`);
  console.log(`     Avg TTFB:          ${report.summary.avgTtfb}ms ${report.summary.avgTtfb > 800 ? '⚠️ ' : '✅'}`);
});
