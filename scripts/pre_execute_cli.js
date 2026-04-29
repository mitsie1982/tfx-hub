#!/usr/bin/env node
// scripts/pre_execute_cli.js
// CLI wrapper for orchestrator-complete/src/preExecute.ts (compiled JS)
// Usage: node scripts/pre_execute_cli.js <action.json> <contract.json> [user]

const path = require('path');
const fs = require('fs');

// Adjust this path if your build output is elsewhere
const preExecute = require('../orchestrator-complete/src/preExecute');

async function main() {
  const [,, actionPath, contractPath, user] = process.argv;
  if (!actionPath || !contractPath) {
    console.error('Usage: node scripts/pre_execute_cli.js <action.json> <contract.json> [user]');
    process.exit(2);
  }
  const action = JSON.parse(fs.readFileSync(actionPath, 'utf-8'));
  const contract = JSON.parse(fs.readFileSync(contractPath, 'utf-8'));
  preExecute.preExecute(action, contract, user || 'cli-user')
    .then(result => {
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.allowed ? 0 : 5);
    })
    .catch(err => {
      console.error('Error:', err);
      process.exit(3);
    });
}

main();
