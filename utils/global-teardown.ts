import * as fs from 'fs';
import * as path from 'path';

export default async function globalTeardown() {
  const stateFile = path.resolve('reports/output/coverage/state.json');
  if (!fs.existsSync(stateFile)) return;
  try {
    const s = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
    s.finishedAt = new Date().toISOString();
    fs.writeFileSync(stateFile, JSON.stringify(s, null, 2));
  } catch {}
}