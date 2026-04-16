/*
 scripts/scan_secrets.js
 Lightweight secret scanner for local pre-commit checks.
 Exits with code 1 if suspicious patterns are found.
*/
const fs = require('fs');
const path = require('path');

const repoRoot = process.cwd();
const ignoreDirs = ['.git', 'node_modules', 'artifacts', 'dist', 'build'];
const patterns = [
  /-----BEGIN PRIVATE KEY-----/i,
  /-----BEGIN RSA PRIVATE KEY-----/i,
  /AKIA[0-9A-Z]{16}/, // AWS access key id
  /AIza[0-9A-Za-z-_]{35}/, // Google API key
  /ssh-rsa AAAA[0-9A-Za-z+/]+/, // ssh public key pattern (catch accidental private)
  /-----BEGIN OPENSSH PRIVATE KEY-----/i,
  /password\s*[:=]\s*['"].{6,}['"]/i
];

function walk(dir, cb) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (ignoreDirs.includes(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, cb);
    else cb(full);
  }
}

let findings = [];
walk(repoRoot, (file) => {
  try {
    const ext = path.extname(file).toLowerCase();
    if (['.png', '.jpg', '.jpeg', '.gif', '.zip', '.jar', '.class', '.exe', '.dll'].includes(ext)) return;
    const content = fs.readFileSync(file, 'utf8');
    patterns.forEach((p) => {
      if (p.test(content)) {
        findings.push({ file, pattern: p.toString() });
      }
    });
  } catch (e) {
    // ignore binary or unreadable files
  }
});

if (findings.length > 0) {
  console.error('Potential secrets detected:');
  findings.slice(0, 50).forEach(f => console.error(` - ${f.file} matches ${f.pattern}`));
  console.error('Aborting commit. Review findings and remove secrets or add to .gitignore if false positive.');
  process.exit(1);
} else {
  console.log('No obvious secrets found by lightweight scanner.');
  process.exit(0);
}
