import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), '..');
const excluded = new Set(['.git', 'node_modules', 'security-test', 'reports']);
const extensions = new Set(['.js', '.mjs', '.cjs', '.html', '.json', '.rules', '.yml', '.yaml']);
const checks = [
  { id: 'private-key', severity: 'FAIL', re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g, message: 'Possível chave privada versionada.' },
  { id: 'service-account-private-key', severity: 'FAIL', re: /"private_key"\s*:\s*"-----BEGIN PRIVATE KEY/g, message: 'Possível chave de service account versionada.' },
  { id: 'eval', severity: 'WARN', re: /\beval\s*\(/g, message: 'Uso de eval exige revisão.' },
  { id: 'document-write', severity: 'WARN', re: /document\.write\s*\(/g, message: 'document.write pode ampliar superfície de XSS.' },
  { id: 'inner-html', severity: 'WARN', re: /\.innerHTML\s*=/g, message: 'innerHTML exige sanitização quando recebe dados externos.' },
  { id: 'insecure-http', severity: 'WARN', re: /http:\/\/(?!localhost|127\.0\.0\.1)/g, message: 'URL HTTP não-local encontrada.' }
];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (excluded.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (extensions.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

const findings = [];
for (const file of walk(root)) {
  const text = fs.readFileSync(file, 'utf8');
  for (const check of checks) {
    for (const match of text.matchAll(check.re)) {
      const line = text.slice(0, match.index).split('\n').length;
      findings.push({ check: check.id, severity: check.severity, file: path.relative(root, file), line, message: check.message });
    }
  }
}

const result = {
  suite: 'static-audit',
  status: findings.some(x => x.severity === 'FAIL') ? 'FAIL' : findings.length ? 'WARN' : 'PASS',
  findings
};
console.log(JSON.stringify(result));
if (result.status === 'FAIL') process.exitCode = 1;
