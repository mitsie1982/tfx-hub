// Simple audit logger (file-based)
const fs = require('fs');
const path = require('path');
const logPath = path.join(__dirname, 'audit.log');

function logAudit(event, details) {
  const entry = { ts: new Date().toISOString(), event, details };
  fs.appendFileSync(logPath, JSON.stringify(entry) + '\n');
}

module.exports = { logAudit };
