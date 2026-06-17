import { Reporter, TestCase, TestResult, FullResult } from '@playwright/test/reporter';
import * as fs from 'fs';

interface Finding {
  test: string;
  file: string;
  status: string;
  duration: number;
  errors: string[];
  screenshots: string[];
  timestamp: string;
}

class AuditReporter implements Reporter {
  private findings: Finding[] = [];

  onTestEnd(test: TestCase, result: TestResult) {
    this.findings.push({
      test: test.title,
      file: test.location.file,
      status: result.status,
      duration: result.duration,
      errors: result.errors.map(e => e.message || '').filter(Boolean),
      screenshots: result.attachments
        .filter(a => a.contentType === 'image/png')
        .map(a => a.path || ''),
      timestamp: new Date().toISOString(),
    });
  }

  async onEnd(result: FullResult) {
    const passed  = this.findings.filter(f => f.status === 'passed').length;
    const failed  = this.findings.filter(f => f.status === 'failed').length;
    const skipped = this.findings.filter(f => f.status === 'skipped').length;

    const report = {
      summary: { passed, failed, skipped, total: this.findings.length, status: result.status },
      findings: this.findings,
      generatedAt: new Date().toISOString(),
    };

    fs.mkdirSync('reports/output', { recursive: true });
    fs.writeFileSync('reports/output/audit-findings.json', JSON.stringify(report, null, 2));

    console.log(`\n📋 Audit Reporter: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  }
}

export default AuditReporter;
