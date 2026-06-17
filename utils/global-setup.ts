import * as fs from 'fs';
import * as path from 'path';

/**
 * Seeds the coverage state file that coverage-tracker.ts reads/writes from.
 * Runs once before the entire Playwright suite.
 */
export default async function globalSetup() {
  const dir = path.resolve('reports/output/coverage');
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(path.resolve('reports/output/screenshots'), { recursive: true });
  fs.mkdirSync(path.resolve('reports/output/network-logs'), { recursive: true });
  fs.mkdirSync(path.resolve('.auth'), { recursive: true });

  const stateFile = path.join(dir, 'state.json');
  if (!fs.existsSync(stateFile)) {
    fs.writeFileSync(stateFile, JSON.stringify({
      routes:           { discovered: [], tested: [], untested: [] },
      forms:            { discovered: [], tested: [] },
      apis:             { discovered: [], tested: [] },
      networkRequests:  [],
      securityFindings: [],
      seoFindings:      [],
      analyticsFindings:[],
      performanceMetrics:[],
      startedAt: new Date().toISOString(),
    }, null, 2));
  }
}