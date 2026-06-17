#!/usr/bin/env node
/**
 * PHASE 16 — COVERAGE DASHBOARD
 *
 * Reads all output files from previous test runs and generates
 * a comprehensive HTML coverage dashboard.
 *
 * Run: node scripts/generate-coverage.js
 *
 * Output: reports/output/coverage/dashboard.html
 */

const fs   = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '../reports/output');

// ── Read all output files ─────────────────────────────────────────────────
function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(path.join(OUT, file), 'utf-8')); }
  catch { return null; }
}

const state          = readJSON('coverage/state.json')           || {};
const routeInventory = readJSON('coverage/route-inventory.json') || {};
const wiringMatrix   = readJSON('wiring-matrix.json')            || {};
const crudReport     = readJSON('crud/crud-report.json')         || {};
const seoReport      = readJSON('seo-report/seo-audit.json')     || {};
const analyticsRpt   = readJSON('analytics-report/analytics-audit.json') || {};
const perfReport     = readJSON('performance/performance-report.json')  || {};
const auditFindings  = readJSON('audit-findings.json')           || {};
const networkAudit   = readJSON('network-audit.json')            || {};

// ── Compute coverage numbers ──────────────────────────────────────────────
const routesDiscovered = routeInventory.totalDiscovered || state.routes?.discovered?.length || 0;
const routesTested     = routeInventory.live            || state.routes?.tested?.length     || 0;
const routesUntested   = routesDiscovered - routesTested;

const formsDiscovered = state.forms?.discovered?.length || 0;
const formsTested     = state.forms?.tested?.length     || 0;

const apisDiscovered  = state.apis?.discovered?.length  || 0;
const apisTested      = state.apis?.tested?.length      || 0;

const securityFindings = (state.securityFindings || []);
const criticalFindings = securityFindings.filter(f => f.severity === 'CRITICAL');
const highFindings     = securityFindings.filter(f => f.severity === 'HIGH');
const mediumFindings   = securityFindings.filter(f => f.severity === 'MEDIUM');
const lowFindings      = securityFindings.filter(f => f.severity === 'LOW');

const wiringBroken  = wiringMatrix.broken  || 0;
const wiringTotal   = wiringMatrix.total   || 0;

const seoPass = seoReport.pass  || 0;
const seoFail = seoReport.fail  || 0;
const seoWarn = seoReport.warn  || 0;

const analyticsTotal   = analyticsRpt.summary?.totalEventsChecked || 0;
const analyticsMissing = analyticsRpt.summary?.missing || 0;

const perfGood  = perfReport.summary?.good  || 0;
const perfNeeds = perfReport.summary?.needsImprovement || 0;
const perfPoor  = perfReport.summary?.poor  || 0;

const crudSuccess  = crudReport.success  || 0;
const crudFailed   = crudReport.failed   || 0;
const crudUntested = crudReport.untested || 0;

const testsPassed = auditFindings.summary?.passed  || 0;
const testsFailed = auditFindings.summary?.failed  || 0;

// ── Build HTML dashboard ──────────────────────────────────────────────────
const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NutroPact Audit Dashboard</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; }
    header { background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); padding: 2rem; border-bottom: 1px solid #1e40af; }
    header h1 { font-size: 2rem; font-weight: 800; color: #60a5fa; }
    header p  { color: #94a3b8; margin-top: 0.25rem; }
    .meta     { display: flex; gap: 1.5rem; margin-top: 0.75rem; font-size: 0.85rem; color: #64748b; }
    main      { padding: 2rem; max-width: 1400px; margin: 0 auto; }
    h2 { font-size: 1.25rem; font-weight: 700; color: #93c5fd; margin: 2rem 0 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid #1e3a5f; }

    /* Cards grid */
    .grid     { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
    .card     { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 1.25rem; }
    .card-label { font-size: 0.78rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
    .card-value { font-size: 2rem; font-weight: 800; margin: 0.25rem 0; }
    .card-sub   { font-size: 0.82rem; color: #94a3b8; }
    .red    { color: #f87171; }
    .orange { color: #fb923c; }
    .yellow { color: #facc15; }
    .green  { color: #4ade80; }
    .blue   { color: #60a5fa; }

    /* Severity badge */
    .badge  { display: inline-block; padding: 0.15rem 0.55rem; border-radius: 9999px; font-size: 0.72rem; font-weight: 700; margin-right: 0.25rem; }
    .crit   { background: #7f1d1d; color: #fca5a5; }
    .high   { background: #7c2d12; color: #fdba74; }
    .med    { background: #713f12; color: #fde047; }
    .low    { background: #14532d; color: #86efac; }
    .info   { background: #1e3a5f; color: #93c5fd; }

    /* Coverage bar */
    .bar-wrap { background: #334155; border-radius: 9999px; height: 10px; overflow: hidden; margin: 0.4rem 0; }
    .bar-fill { height: 100%; border-radius: 9999px; transition: width 0.5s; }
    .bar-good   { background: #4ade80; }
    .bar-warn   { background: #facc15; }
    .bar-bad    { background: #f87171; }

    /* Table */
    table { width: 100%; border-collapse: collapse; font-size: 0.83rem; }
    th { background: #1e3a5f; padding: 0.6rem 0.8rem; text-align: left; font-weight: 600; color: #93c5fd; }
    td { padding: 0.55rem 0.8rem; border-bottom: 1px solid #1e293b; vertical-align: top; }
    tr:hover td { background: #1e293b; }
    .evidence { color: #94a3b8; font-size: 0.78rem; }

    /* Section box */
    .box { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 1.25rem; margin-bottom: 1.5rem; overflow-x: auto; }

    /* Status icons */
    .pass  { color: #4ade80; font-weight: 700; }
    .fail  { color: #f87171; font-weight: 700; }
    .warn  { color: #facc15; font-weight: 700; }
    .unk   { color: #64748b; }

    footer { text-align: center; padding: 2rem; color: #475569; font-size: 0.82rem; }
  </style>
</head>
<body>
<header>
  <h1>🔍 NutroPact — Full-Stack Audit Dashboard</h1>
  <p>Automated audit using Playwright — ${routesTested} routes tested across ${Object.keys({}).length || 14} test phases</p>
  <div class="meta">
    <span>📅 Generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</span>
    <span>🌐 Target: ${process.env.BASE_URL || 'https://oopsie-woopsie-code.lovable.app'}</span>
    <span>✅ Tests Passed: ${testsPassed}</span>
    <span>❌ Tests Failed: ${testsFailed}</span>
  </div>
</header>

<main>

  <!-- ═══ EXECUTIVE SUMMARY ═══ -->
  <h2>📊 Executive Summary</h2>
  <div class="grid">
    <div class="card">
      <div class="card-label">Critical Findings</div>
      <div class="card-value red">${criticalFindings.length}</div>
      <div class="card-sub">Require immediate action</div>
    </div>
    <div class="card">
      <div class="card-label">High Findings</div>
      <div class="card-value orange">${highFindings.length}</div>
      <div class="card-sub">Fix within 1–2 weeks</div>
    </div>
    <div class="card">
      <div class="card-label">Medium Findings</div>
      <div class="card-value yellow">${mediumFindings.length}</div>
      <div class="card-sub">Fix within 1 month</div>
    </div>
    <div class="card">
      <div class="card-label">Low Findings</div>
      <div class="card-value green">${lowFindings.length}</div>
      <div class="card-sub">Improvement items</div>
    </div>
    <div class="card">
      <div class="card-label">Routes Discovered</div>
      <div class="card-value blue">${routesDiscovered}</div>
      <div class="card-sub">${routesTested} tested, ${routesUntested} untested</div>
    </div>
    <div class="card">
      <div class="card-label">Test Suite</div>
      <div class="card-value ${testsFailed > 0 ? 'red' : 'green'}">${testsPassed}/${testsPassed + testsFailed}</div>
      <div class="card-sub">Playwright tests passed</div>
    </div>
  </div>

  <!-- ═══ COVERAGE REPORT ═══ -->
  <h2>📐 Phase 16 — Coverage Report</h2>
  <div class="box">
    <table>
      <thead><tr><th>Category</th><th>Discovered</th><th>Tested</th><th>Untested</th><th>Coverage</th></tr></thead>
      <tbody>
        ${[
          ['Routes', routesDiscovered, routesTested, routesUntested],
          ['Forms',  formsDiscovered,  formsTested,  formsDiscovered - formsTested],
          ['APIs',   apisDiscovered,   apisTested,   apisDiscovered - apisTested],
          ['Wiring Actions', wiringTotal, wiringTotal - wiringBroken, wiringBroken],
          ['CRUD Operations', crudReport.total || 0, crudSuccess, crudFailed + crudUntested],
          ['SEO Checks', seoPass + seoFail + seoWarn, seoPass, seoFail + seoWarn],
          ['Analytics Events', analyticsTotal, analyticsTotal - analyticsMissing, analyticsMissing],
        ].map(([cat, disc, tested, untested]) => {
          const pct = disc > 0 ? Math.round(Number(tested) / Number(disc) * 100) : 0;
          const barClass = pct >= 80 ? 'bar-good' : pct >= 50 ? 'bar-warn' : 'bar-bad';
          return `<tr>
            <td><strong>${cat}</strong></td>
            <td>${disc}</td>
            <td class="pass">${tested}</td>
            <td class="${Number(untested) > 0 ? 'warn' : 'pass'}">${untested}</td>
            <td style="min-width:150px">
              <div class="bar-wrap"><div class="bar-fill ${barClass}" style="width:${pct}%"></div></div>
              <span style="font-size:0.75rem;color:#94a3b8">${pct}%</span>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>

  <!-- ═══ SECURITY FINDINGS ═══ -->
  <h2>🔐 Security Findings (${securityFindings.length} total)</h2>
  ${securityFindings.length > 0 ? `
  <div class="box">
    <table>
      <thead><tr><th>Severity</th><th>Type</th><th>Description</th><th>Evidence</th><th>Confidence</th></tr></thead>
      <tbody>
        ${securityFindings.map((f) => `
        <tr>
          <td><span class="badge ${f.severity === 'CRITICAL' ? 'crit' : f.severity === 'HIGH' ? 'high' : f.severity === 'MEDIUM' ? 'med' : 'low'}">${f.severity}</span></td>
          <td><code style="font-size:0.78rem;color:#a5b4fc">${f.type}</code></td>
          <td>${f.description}</td>
          <td class="evidence">${(f.evidence || '').slice(0, 120)}</td>
          <td><span class="badge ${f.confidence === 'VERIFIED' ? 'low' : f.confidence === 'INFERRED' ? 'med' : 'info'}">${f.confidence}</span></td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>` : '<div class="box"><p class="pass">✅ No security findings recorded yet — run full audit suite</p></div>'}

  <!-- ═══ WIRING MATRIX ═══ -->
  <h2>🔌 Frontend ↔ Backend Wiring Matrix (${wiringTotal} actions)</h2>
  <div class="box">
    ${wiringMatrix.matrix && wiringMatrix.matrix.length > 0 ? `
    <table>
      <thead><tr><th>Action</th><th>Endpoint</th><th>Method</th><th>Status</th><th>UI Update</th><th>Broken?</th></tr></thead>
      <tbody>
        ${wiringMatrix.matrix.map((e) => `
        <tr>
          <td><strong>${e.action}</strong></td>
          <td class="evidence">${(e.endpoint || 'N/A').split('/rest/v1/').pop()?.slice(0, 60) || 'N/A'}</td>
          <td><code style="color:#a5b4fc">${e.method || 'N/A'}</code></td>
          <td>${e.responseStatus || 'N/A'}</td>
          <td class="evidence">${(e.uiUpdate || '').slice(0, 80)}</td>
          <td class="${e.broken ? 'fail' : 'pass'}">${e.broken ? '❌ BROKEN' : '✅ OK'}</td>
        </tr>`).join('')}
      </tbody>
    </table>` : '<p class="unk">Run wiring tests first: npm run audit:wiring</p>'}
  </div>

  <!-- ═══ CRUD RESULTS ═══ -->
  <h2>🗄️  CRUD Verification (${crudReport.total || 0} operations)</h2>
  <div class="box">
    ${crudReport.results && crudReport.results.length > 0 ? `
    <table>
      <thead><tr><th>Entity</th><th>Operation</th><th>API Success</th><th>UI Reflected</th><th>DB Verified</th><th>Evidence</th></tr></thead>
      <tbody>
        ${crudReport.results.map((r) => `
        <tr>
          <td><strong>${r.entity}</strong></td>
          <td><span class="badge info">${r.operation}</span></td>
          <td class="${r.success ? 'pass' : r.confidence === 'UNTESTED' ? 'unk' : 'fail'}">${r.success ? '✅' : r.confidence === 'UNTESTED' ? '⬜' : '❌'}</td>
          <td class="${r.uiReflected ? 'pass' : 'warn'}">${r.uiReflected ? '✅' : '⚠️'}</td>
          <td class="${r.dbVerified ? 'pass' : 'warn'}">${r.dbVerified ? '✅' : r.dbVerified === false && r.confidence !== 'UNTESTED' ? '⚠️ INFERRED' : '⬜'}</td>
          <td class="evidence">${(r.evidence || '').slice(0, 100)}</td>
        </tr>`).join('')}
      </tbody>
    </table>` : '<p class="unk">Run CRUD tests first: npm run audit:crud</p>'}
  </div>

  <!-- ═══ SEO REPORT ═══ -->
  <h2>🔍 SEO / GEO / AEO / LLMO (${seoPass + seoFail + seoWarn} checks)</h2>
  <div class="grid" style="grid-template-columns:repeat(4,1fr)">
    ${[['SEO', seoReport.byCategory?.SEO], ['GEO', seoReport.byCategory?.GEO],
       ['AEO', seoReport.byCategory?.AEO], ['LLMO', seoReport.byCategory?.LLMO]].map(([cat, d]) => `
    <div class="card">
      <div class="card-label">${cat}</div>
      <div style="display:flex;gap:0.5rem;margin-top:0.5rem">
        <span class="pass">✅ ${d?.pass || 0}</span>
        <span class="fail">❌ ${d?.fail || 0}</span>
        <span class="warn">⚠️ ${d?.warn || 0}</span>
      </div>
    </div>`).join('')}
  </div>
  ${seoReport.checks && seoReport.checks.length > 0 ? `
  <div class="box">
    <table>
      <thead><tr><th>Category</th><th>Page</th><th>Check</th><th>Result</th><th>Evidence</th></tr></thead>
      <tbody>
        ${seoReport.checks.filter((c) => c.result !== 'PASS').map((c) => `
        <tr>
          <td><span class="badge info">${c.category}</span></td>
          <td><code style="color:#a5b4fc;font-size:0.78rem">${c.page}</code></td>
          <td>${c.check}</td>
          <td class="${c.result === 'FAIL' ? 'fail' : c.result === 'WARN' ? 'warn' : 'pass'}">${c.result === 'FAIL' ? '❌' : '⚠️'} <span class="badge ${c.severity === 'CRITICAL' ? 'crit' : c.severity === 'HIGH' ? 'high' : c.severity === 'MEDIUM' ? 'med' : 'low'}">${c.severity}</span></td>
          <td class="evidence">${(c.evidence || '').slice(0, 120)}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>` : ''}

  <!-- ═══ ANALYTICS ═══ -->
  <h2>📈 Analytics Audit (${analyticsTotal} events checked)</h2>
  <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))">
    ${[['GA4', analyticsRpt.summary?.byTool?.GA4],
       ['GTM', analyticsRpt.summary?.byTool?.GTM],
       ['Meta Pixel', analyticsRpt.summary?.byTool?.['Meta Pixel']],
       ['Google Ads', analyticsRpt.summary?.byTool?.['Google Ads']],
       ['Consent Gate', analyticsRpt.summary?.byTool?.['Consent Gate']]
    ].map(([tool, d]) => `
    <div class="card">
      <div class="card-label">${tool}</div>
      <div class="card-value ${d?.missing > 0 || !d ? 'red' : 'green'}">${d?.fired || 0}</div>
      <div class="card-sub">${d?.fired || 0} fired · ${d?.missing || 0} missing</div>
    </div>`).join('')}
  </div>

  <!-- ═══ PERFORMANCE ═══ -->
  <h2>⚡ Performance Audit</h2>
  <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))">
    <div class="card"><div class="card-label">Good Pages</div><div class="card-value green">${perfGood}</div></div>
    <div class="card"><div class="card-label">Needs Improvement</div><div class="card-value yellow">${perfNeeds}</div></div>
    <div class="card"><div class="card-label">Poor Pages</div><div class="card-value red">${perfPoor}</div></div>
    <div class="card"><div class="card-label">Avg LCP</div><div class="card-value ${(perfReport.summary?.avgLcp || 0) > 2500 ? 'red' : 'green'}">${perfReport.summary?.avgLcp || 'N/A'}ms</div></div>
    <div class="card"><div class="card-label">Avg CLS</div><div class="card-value ${(perfReport.summary?.avgCls || 0) > 0.1 ? 'red' : 'green'}">${perfReport.summary?.avgCls || 'N/A'}</div></div>
    <div class="card"><div class="card-label">Avg TTFB</div><div class="card-value ${(perfReport.summary?.avgTtfb || 0) > 800 ? 'red' : 'green'}">${perfReport.summary?.avgTtfb || 'N/A'}ms</div></div>
  </div>
  ${perfReport.results && perfReport.results.length > 0 ? `
  <div class="box">
    <table>
      <thead><tr><th>Page</th><th>LCP</th><th>CLS</th><th>FCP</th><th>TTFB</th><th>DOM Complete</th><th>Verdict</th></tr></thead>
      <tbody>
        ${perfReport.results.map((r) => `
        <tr>
          <td><code style="color:#a5b4fc">${r.page}</code></td>
          <td class="${(r.lcp||0)>2500?'fail':(r.lcp||0)>0?'pass':'unk'}">${r.lcp ? r.lcp+'ms' : 'N/A'}</td>
          <td class="${(r.cls||0)>0.1?'fail':'pass'}">${r.cls ?? 'N/A'}</td>
          <td>${r.fcp ? r.fcp+'ms' : 'N/A'}</td>
          <td class="${(r.ttfb||0)>800?'warn':'pass'}">${r.ttfb ? r.ttfb+'ms' : 'N/A'}</td>
          <td>${r.domComplete ? r.domComplete+'ms' : 'N/A'}</td>
          <td class="${r.verdict==='GOOD'?'pass':r.verdict==='POOR'?'fail':'warn'}">${r.verdict==='GOOD'?'✅ GOOD':r.verdict==='POOR'?'🔴 POOR':'⚠️ NEEDS IMPROVEMENT'}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>` : ''}

  <!-- ═══ NETWORK SUMMARY ═══ -->
  <h2>🌐 Network Audit</h2>
  <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))">
    <div class="card"><div class="card-label">Total Requests</div><div class="card-value blue">${networkAudit.totalRequests || 0}</div></div>
    <div class="card"><div class="card-label">Failed Requests</div><div class="card-value ${(networkAudit.failed||0)>0?'red':'green'}">${networkAudit.failed || 0}</div></div>
    <div class="card"><div class="card-label">WebSockets</div><div class="card-value blue">${networkAudit.websockets || 0}</div></div>
    <div class="card"><div class="card-label">Slow (>2s)</div><div class="card-value ${(networkAudit.slowRequests||0)>0?'yellow':'green'}">${networkAudit.slowRequests || 0}</div></div>
  </div>

  <!-- ═══ ROUTES TABLE ═══ -->
  <h2>🗺️  Route Inventory (${routesDiscovered} routes)</h2>
  ${routeInventory.routes && routeInventory.routes.length > 0 ? `
  <div class="box">
    <table>
      <thead><tr><th>Route</th><th>Status</th><th>Title</th><th>H1</th><th>Forms</th><th>Load (ms)</th><th>JS Errors</th></tr></thead>
      <tbody>
        ${routeInventory.routes.map((r) => `
        <tr>
          <td><code style="color:#a5b4fc;font-size:0.8rem">${r.path}</code></td>
          <td class="${r.status===200?'pass':r.status===404?'fail':'warn'}">${r.status || 'ERR'}</td>
          <td class="evidence">${(r.title||'').slice(0,50)}</td>
          <td class="evidence">${(r.h1||'').slice(0,40)}</td>
          <td>${r.formsFound || 0}</td>
          <td class="${(r.loadTimeMs||0)>3000?'warn':'pass'}">${r.loadTimeMs || 'N/A'}</td>
          <td class="${r.hasErrors?'fail':'pass'}">${r.hasErrors ? '❌ '+r.consoleErrors?.length : '✅'}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>` : '<div class="box"><p class="unk">Run discovery first: npm run audit:discovery</p></div>'}

  <!-- ═══ PRIORITY ACTIONS ═══ -->
  <h2>🚨 Priority Action Items</h2>
  <div class="box">
    <table>
      <thead><tr><th>#</th><th>Priority</th><th>Action</th></tr></thead>
      <tbody>
        ${[
          ['CRITICAL', 'Rotate admin credentials — never share in plaintext; enable MFA'],
          ['CRITICAL', 'Fix products page — /products stuck in loading state, revenue page non-functional'],
          ['CRITICAL', 'Publish Privacy Policy and Terms of Service immediately (DPDP Act 2023)'],
          ['CRITICAL', 'Add cookie consent banner before ANY tracking pixel fires'],
          ['HIGH', 'Install GA4 + GTM — zero analytics tracking currently'],
          ['HIGH', 'Install Meta Pixel and Google Ads conversion tags via GTM'],
          ['HIGH', 'Add HTTP security headers: CSP, X-Frame-Options, HSTS, Referrer-Policy'],
          ['HIGH', 'Add FAQPage JSON-LD schema to /faq for Google rich results'],
          ['HIGH', 'Fix all canonical tags to use absolute URLs'],
          ['HIGH', 'Create and submit sitemap.xml to Google Search Console'],
          ['HIGH', 'Replace all placeholder contact data (phone, WhatsApp, email)'],
          ['HIGH', 'Replace stock founder photo with real brand asset'],
          ['HIGH', 'Add rate limiting to login endpoint (brute force protection)'],
          ['MEDIUM', 'Implement i18n properly or remove non-functional language switcher'],
          ['MEDIUM', 'Add Product JSON-LD schema to all product detail pages'],
          ['MEDIUM', 'Create /llms.txt for AI search engine guidance'],
          ['MEDIUM', 'Add CAPTCHA to contact form'],
          ['MEDIUM', 'Fix social media links in footer (Instagram, YouTube, WhatsApp)'],
          ['LOW', 'Remove "Edit with Lovable" badge from production'],
          ['LOW', 'Add unique OG images per page category'],
        ].map(([sev, action], i) => `
        <tr>
          <td style="color:#64748b;font-size:0.85rem">${i+1}</td>
          <td><span class="badge ${sev==='CRITICAL'?'crit':sev==='HIGH'?'high':sev==='MEDIUM'?'med':'low'}">${sev}</span></td>
          <td>${action}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>

</main>
<footer>
  <p>NutroPact Audit Framework — Playwright ${routesTested} routes · ${securityFindings.length} findings · Generated ${new Date().toISOString()}</p>
  <p style="margin-top:0.5rem">Full JSON reports in <code>reports/output/</code></p>
</footer>
</body>
</html>`;

// ── Write dashboard ───────────────────────────────────────────────────────
fs.mkdirSync(path.join(OUT, 'coverage'), { recursive: true });
const dashPath = path.join(OUT, 'coverage', 'dashboard.html');
fs.writeFileSync(dashPath, html);
console.log(`\n✅ Coverage dashboard written to: ${dashPath}`);
console.log(`   Open in browser: file://${dashPath}\n`);

// ── Print text summary ────────────────────────────────────────────────────
console.log('═══════════════════════════════════════════════════════════════');
console.log('  NUTROPACT AUDIT — COVERAGE SUMMARY');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  Routes:        ${routesTested}/${routesDiscovered} tested`);
console.log(`  Forms:         ${formsTested}/${formsDiscovered} tested`);
console.log(`  APIs:          ${apisTested}/${apisDiscovered} tested`);
console.log(`  CRITICAL:      ${criticalFindings.length} findings`);
console.log(`  HIGH:          ${highFindings.length} findings`);
console.log(`  MEDIUM:        ${mediumFindings.length} findings`);
console.log(`  LOW:           ${lowFindings.length} findings`);
console.log(`  Playwright:    ${testsPassed} passed / ${testsFailed} failed`);
console.log('═══════════════════════════════════════════════════════════════\n');
