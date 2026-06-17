#!/usr/bin/env node
/**
 * FULL AUDIT RUNNER
 * Executes all audit phases in the correct order and collects output.
 *
 * Usage:
 *   node scripts/run-full-audit.js
 *   node scripts/run-full-audit.js --phase discovery
 *   node scripts/run-full-audit.js --phase security
 *   node scripts/run-full-audit.js --headless false
 *
 * Phases run in order:
 *  1. Auth setup (admin + customer)
 *  2. Discovery (routes + admin map)
 *  3. UI interactions
 *  4. Forms
 *  5. Auth tests
 *  6. Authorization / access control
 *  7. Wiring + Business logic
 *  8. CRUD
 *  9. Network
 * 10. Security
 * 11. Analytics
 * 12. SEO/GEO/AEO/LLMO
 * 13. Performance
 * 14. Coverage report
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs   = require('fs');

const ROOT = path.resolve(__dirname, '..');

// Parse CLI args
const args = process.argv.slice(2);
const phaseArg  = args.find((a, i) => args[i-1] === '--phase');
const headless  = !args.includes('--headless false');

// ── Phases definition ─────────────────────────────────────────────────────
const PHASES = [
  { id: 'setup',       label: 'Auth Setup',         pattern: 'tests/auth/setup-*.ts',       project: 'chromium-anon' },
  { id: 'discovery',   label: 'Route Discovery',     pattern: 'tests/discovery/',             project: 'chromium-anon' },
  { id: 'auth',        label: 'Authentication',      pattern: 'tests/auth/auth.test.ts',      project: 'chromium-anon' },
  { id: 'authz',       label: 'Authorization',       pattern: 'tests/authorization/',         project: 'chromium-anon' },
  { id: 'ui',          label: 'UI Interactions',     pattern: 'tests/ui/',                    project: 'chromium-desktop' },
  { id: 'forms',       label: 'Form Testing',        pattern: 'tests/forms/',                 project: 'chromium-desktop' },
  { id: 'wiring',      label: 'Wiring + Biz Logic',  pattern: 'tests/wiring/',                project: 'chromium-desktop' },
  { id: 'crud',        label: 'CRUD Verification',   pattern: 'tests/crud/',                  project: 'chromium-desktop' },
  { id: 'network',     label: 'Network Audit',       pattern: 'tests/network/',               project: 'chromium-anon'   },
  { id: 'security',    label: 'Security Red Team',   pattern: 'tests/security/',              project: 'chromium-anon'   },
  { id: 'analytics',   label: 'Analytics Audit',     pattern: 'tests/analytics/',             project: 'chromium-anon'   },
  { id: 'seo',         label: 'SEO/GEO/AEO/LLMO',   pattern: 'tests/seo/',                   project: 'chromium-anon'   },
  { id: 'performance', label: 'Performance Audit',   pattern: 'tests/performance/',           project: 'chromium-anon'   },
];

// ── Helpers ───────────────────────────────────────────────────────────────
const log = (msg, color = '') => {
  const COLORS = { green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', blue: '\x1b[34m', reset: '\x1b[0m', bold: '\x1b[1m' };
  console.log(`${COLORS[color] || ''}${msg}${COLORS.reset}`);
};

function runPhase(phase) {
  log(`\n${'═'.repeat(70)}`, 'blue');
  log(`  🚀 ${phase.label.toUpperCase()}`, 'bold');
  log(`${'═'.repeat(70)}\n`, 'blue');

  const env = {
    ...process.env,
    HEADLESS: headless ? 'true' : 'false',
  };

  try {
    execSync(
      `npx playwright test ${phase.pattern} --project=${phase.project} --reporter=list,json`,
      { cwd: ROOT, stdio: 'inherit', env, timeout: 300_000 }
    );
    log(`  ✅ ${phase.label} COMPLETED`, 'green');
    return { phase: phase.id, status: 'passed' };
  } catch (e) {
    log(`  ⚠️  ${phase.label} had failures (continuing...)`, 'yellow');
    return { phase: phase.id, status: 'failed', error: e.message?.slice(0, 200) };
  }
}

// ── Pre-flight checks ─────────────────────────────────────────────────────
function preflight() {
  log('\n🔧 PRE-FLIGHT CHECKS\n', 'bold');

  // Check audit.env (kept separate from app .env)
  const envFile = path.join(ROOT, 'audit.env');
  if (!fs.existsSync(envFile)) {
    log('  ❌ audit.env missing!', 'red');
    log('  → Copy audit.env.example to audit.env and fill in credentials', 'yellow');
    process.exit(1);
  }

  // node_modules assumed (bun-managed). Skip install.

  // Check Playwright browsers
  try {
    execSync('npx playwright --version', { cwd: ROOT, stdio: 'pipe' });
    log('  ✅ Playwright available', 'green');
  } catch {
    log('  📦 Installing Playwright browsers...', 'yellow');
    execSync('npx playwright install chromium firefox webkit', { cwd: ROOT, stdio: 'inherit' });
  }

  // Create .auth dir
  fs.mkdirSync(path.join(ROOT, '.auth'), { recursive: true });

  // Load .env
  require('dotenv').config({ path: envFile });

  log(`  ✅ Target URL: ${process.env.BASE_URL}`, 'green');
  log(`  ✅ Admin email: ${process.env.ADMIN_EMAIL}`, 'green');
  log('');
}

// ── Main ──────────────────────────────────────────────────────────────────
async function main() {
  const startTime = Date.now();

  log('\n' + '═'.repeat(70), 'blue');
  log('  🔍 NUTROPACT FULL-STACK AUDIT FRAMEWORK', 'bold');
  log('  Enterprise-grade Playwright Audit System', '');
  log('═'.repeat(70) + '\n', 'blue');

  preflight();

  // Filter phases if --phase arg provided
  const phasesToRun = phaseArg
    ? PHASES.filter(p => p.id === phaseArg)
    : PHASES;

  if (phasesToRun.length === 0) {
    log(`  ❌ Unknown phase: ${phaseArg}`, 'red');
    log(`  Available: ${PHASES.map(p => p.id).join(', ')}`, 'yellow');
    process.exit(1);
  }

  const results = [];
  for (const phase of phasesToRun) {
    results.push(runPhase(phase));
  }

  // Generate coverage dashboard
  log('\n📊 GENERATING COVERAGE DASHBOARD...\n', 'bold');
  try {
    execSync('node scripts/generate-coverage.js', { cwd: ROOT, stdio: 'inherit' });
  } catch (e) {
    log('  ⚠️  Dashboard generation had issues', 'yellow');
  }

  // Final summary
  const elapsed = Math.round((Date.now() - startTime) / 1000);
  const passed  = results.filter(r => r.status === 'passed').length;
  const failed  = results.filter(r => r.status === 'failed').length;

  log('\n' + '═'.repeat(70), 'blue');
  log('  📊 AUDIT COMPLETE', 'bold');
  log('═'.repeat(70), 'blue');
  log(`  Phases:    ${results.length} total`, '');
  log(`  Passed:    ${passed}`, 'green');
  log(`  Failed:    ${failed}`, failed > 0 ? 'red' : 'green');
  log(`  Duration:  ${elapsed}s`, '');
  log('', '');
  log('  📁 Reports:', 'bold');
  log(`     HTML:      ${path.join(ROOT, 'reports/output/html/index.html')}`, '');
  log(`     Dashboard: ${path.join(ROOT, 'reports/output/coverage/dashboard.html')}`, '');
  log(`     JSON:      ${path.join(ROOT, 'reports/output/results.json')}`, '');
  log('═'.repeat(70) + '\n', 'blue');

  // Save run summary
  fs.writeFileSync(
    path.join(ROOT, 'reports/output/run-summary.json'),
    JSON.stringify({ startedAt: new Date(startTime).toISOString(), elapsed, phases: results }, null, 2)
  );
}

main().catch(e => {
  log(`\n❌ Fatal error: ${e.message}`, 'red');
  process.exit(1);
});
