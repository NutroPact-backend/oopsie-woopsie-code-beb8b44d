import * as fs from 'fs';
import * as path from 'path';

const STATE_FILE = 'reports/output/coverage/state.json';

function readState() {
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
}
function writeState(state: any) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

export const coverage = {
  addDiscoveredRoute(route: string, meta: Record<string, any> = {}) {
    const s = readState();
    if (!s.routes.discovered.find((r: any) => r.path === route)) {
      s.routes.discovered.push({ path: route, discoveredAt: new Date().toISOString(), ...meta });
      writeState(s);
    }
  },

  markRouteTested(route: string, result: 'pass' | 'fail' | 'error', notes = '') {
    const s = readState();
    s.routes.tested.push({ path: route, result, notes, testedAt: new Date().toISOString() });
    // Remove from untested if present
    s.routes.untested = s.routes.untested.filter((r: any) => r !== route);
    writeState(s);
  },

  addDiscoveredForm(formId: string, page: string, fields: string[]) {
    const s = readState();
    if (!s.forms.discovered.find((f: any) => f.id === formId)) {
      s.forms.discovered.push({ id: formId, page, fields, discoveredAt: new Date().toISOString() });
      writeState(s);
    }
  },

  markFormTested(formId: string, scenarios: string[], result: 'pass' | 'fail' | 'partial') {
    const s = readState();
    s.forms.tested.push({ id: formId, scenarios, result, testedAt: new Date().toISOString() });
    writeState(s);
  },

  addDiscoveredApi(endpoint: string, method: string, source: string) {
    const s = readState();
    const key = `${method}:${endpoint}`;
    if (!s.apis.discovered.find((a: any) => a.key === key)) {
      s.apis.discovered.push({ key, endpoint, method, source, discoveredAt: new Date().toISOString() });
      writeState(s);
    }
  },

  markApiTested(endpoint: string, method: string, statusCode: number, notes = '') {
    const s = readState();
    s.apis.tested.push({ endpoint, method, statusCode, notes, testedAt: new Date().toISOString() });
    writeState(s);
  },

  logNetworkRequest(req: {
    url: string; method: string; status: number;
    requestBody?: any; responseBody?: any; duration?: number; error?: string;
  }) {
    const s = readState();
    s.networkRequests.push({ ...req, loggedAt: new Date().toISOString() });
    writeState(s);
  },

  addSecurityFinding(finding: {
    type: string; severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
    description: string; evidence: string; reproSteps: string[];
    confidence: 'VERIFIED' | 'INFERRED' | 'UNTESTED';
  }) {
    const s = readState();
    s.securityFindings.push({ ...finding, foundAt: new Date().toISOString() });
    writeState(s);
  },

  addSeoFinding(finding: { page: string; check: string; result: string; severity: string }) {
    const s = readState();
    s.seoFindings.push({ ...finding, checkedAt: new Date().toISOString() });
    writeState(s);
  },

  addAnalyticsFinding(finding: { event: string; tool: string; fired: boolean; params?: any; notes?: string }) {
    const s = readState();
    s.analyticsFindings.push({ ...finding, checkedAt: new Date().toISOString() });
    writeState(s);
  },

  addPerformanceMetric(metric: { page: string; lcp?: number; cls?: number; fid?: number; ttfb?: number; totalBlockingTime?: number }) {
    const s = readState();
    s.performanceMetrics.push({ ...metric, measuredAt: new Date().toISOString() });
    writeState(s);
  },
};
