// This script rewrites a file with UTF-8 encoding and LF line endings, removing any BOM or CRLF issues.
const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, 'verify_full_pipeline.sh');
const raw = fs.readFileSync(file, 'utf8');
// Remove BOM if present and convert CRLF to LF
const cleaned = raw.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
fs.writeFileSync(file, cleaned, { encoding: 'utf8', flag: 'w' });
console.log('File rewritten with UTF-8 encoding and LF endings:', file);
