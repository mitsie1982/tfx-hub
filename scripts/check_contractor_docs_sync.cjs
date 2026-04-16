const fs = require('fs');
const path = require('path');
const { buildFeatureSheet, buildRoleInventory, buildUserManual, loadData } = require('./generate_contractor_docs.cjs');

const repoRoot = path.resolve(__dirname, '..');
const featureSheetPath = path.join(repoRoot, 'docs', 'generated', 'contractor_feature_sheet.md');
const manualPath = path.join(repoRoot, 'docs', 'generated', 'contractor_user_manual.md');
const roleInventoryPath = path.join(repoRoot, 'docs', 'generated', 'platform_role_capability_inventory.md');

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function main() {
  const data = loadData();
  const expectedFeatureSheet = `${buildFeatureSheet(data)}\n`;
  const expectedManual = `${buildUserManual(data)}\n`;
  const expectedRoleInventory = `${buildRoleInventory(data)}\n`;
  const actualFeatureSheet = readFile(featureSheetPath);
  const actualManual = readFile(manualPath);
  const actualRoleInventory = readFile(roleInventoryPath);

  const issues = [];
  if (actualFeatureSheet !== expectedFeatureSheet) {
    issues.push('docs/generated/contractor_feature_sheet.md is out of sync');
  }
  if (actualManual !== expectedManual) {
    issues.push('docs/generated/contractor_user_manual.md is out of sync');
  }
  if (actualRoleInventory !== expectedRoleInventory) {
    issues.push('docs/generated/platform_role_capability_inventory.md is out of sync');
  }

  if (issues.length) {
    issues.forEach((issue) => console.error(issue));
    console.error('Run pnpm.cmd run docs:contractor:generate to refresh generated contractor docs.');
    process.exit(1);
  }

  console.log('Generated contractor docs are in sync.');
}

if (require.main === module) {
  main();
}
