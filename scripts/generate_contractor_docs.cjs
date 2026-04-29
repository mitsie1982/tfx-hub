const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const dataPath = path.join(repoRoot, 'docs', 'data', 'contractor_capabilities.json');
const featureSheetPath = path.join(repoRoot, 'docs', 'generated', 'contractor_feature_sheet.md');
const manualPath = path.join(repoRoot, 'docs', 'generated', 'contractor_user_manual.md');
const roleInventoryPath = path.join(repoRoot, 'docs', 'generated', 'platform_role_capability_inventory.md');

function loadData() {
  return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
}

function renderList(items) {
  return items.map((item) => `1. ${item}`).join('\n');
}

function renderTable(rows) {
  const header = '| Capability | Browser | WhatsApp | Status |';
  const divider = '| --- | --- | --- | --- |';
  const body = rows.map((row) => `| ${row.capability} | ${row.browser} | ${row.whatsapp} | ${row.status} |`).join('\n');
  return [header, divider, body].join('\n');
}

function renderRoleTable(rows) {
  const header = '| Role | Implementation | Surface | App Or Service | What They Can Do | What They Can View |';
  const divider = '| --- | --- | --- | --- | --- | --- |';
  const body = rows.map((row) => `| ${row.role} | ${row.implementation} | ${row.surface} | ${row.appOrService} | ${row.whatTheyCanDo} | ${row.whatTheyCanView} |`).join('\n');
  return [header, divider, body].join('\n');
}

function renderExamples(items) {
  return items.map((example) => [
    `#### ${example.title}`,
    '',
    '```text',
    ...example.lines,
    '```'
  ].join('\n')).join('\n\n');
}

function buildFeatureSheet(data) {
  return [
    '# Contractor Feature Sheet',
    '',
    '> Generated file. Update docs/data/contractor_capabilities.json and run pnpm.cmd run docs:contractor:generate.',
    '',
    'This sheet is intended for client-facing or stakeholder-facing communication.',
    '',
    '## Browser',
    '',
    '### Browser Actions',
    '',
    renderList(data.browser.canDo),
    '',
    '### Browser Visibility',
    '',
    renderList(data.browser.canView),
    '',
    '## WhatsApp',
    '',
    '### WhatsApp Actions',
    '',
    renderList(data.whatsapp.canDo),
    '',
    '### WhatsApp Visibility',
    '',
    renderList(data.whatsapp.canView),
    '',
    '## Capability Matrix',
    '',
    renderTable(data.matrix)
  ].join('\n');
}

function buildUserManual(data) {
  return [
    '# Contractor User Manual',
    '',
    '> Generated file. Update docs/data/contractor_capabilities.json and run pnpm.cmd run docs:contractor:generate.',
    '',
    'This manual is intended for contractors and support staff.',
    '',
    '## Browser Manual',
    '',
    'Use the browser workspace when you need the fullest view of leads, search, filtering, and history.',
    '',
    '### Browser Actions',
    '',
    renderList(data.browser.canDo),
    '',
    '### Browser Visibility',
    '',
    renderList(data.browser.canView),
    '',
    '### Browser Examples',
    '',
    renderExamples(data.examples.browser),
    '',
    '## WhatsApp Manual',
    '',
    'Use WhatsApp for the contractor high-intent flow: identify yourself, review leads, respond quickly, and check recent activity.',
    '',
    '### WhatsApp Actions',
    '',
    renderList(data.whatsapp.canDo),
    '',
    '### WhatsApp Visibility',
    '',
    renderList(data.whatsapp.canView),
    '',
    '### WhatsApp Examples',
    '',
    renderExamples(data.examples.whatsapp),
    '',
    '## Operational Guidance',
    '',
    '1. Use Browser when you need search, filtering, or broad scanning of many leads.',
    '2. Use WhatsApp when you need fast response on a phone-linked account.',
    '3. Use Browser for password reset flows.',
    '4. Use WhatsApp for in-chat account linking and in-chat registration.'
  ].join('\n');
}

function buildRoleInventory(data) {
  return [
    '# Platform Role Capability Inventory',
    '',
    '> Generated file. Update docs/data/contractor_capabilities.json and run pnpm.cmd run docs:contractor:generate.',
    '',
    'This inventory provides a current implementation snapshot for the main product roles in the repository.',
    '',
    renderRoleTable(data.roles)
  ].join('\n');
}

function writeOutputs() {
  const data = loadData();
  fs.writeFileSync(featureSheetPath, `${buildFeatureSheet(data)}\n`);
  fs.writeFileSync(manualPath, `${buildUserManual(data)}\n`);
  fs.writeFileSync(roleInventoryPath, `${buildRoleInventory(data)}\n`);
  console.log('Generated contractor docs:');
  console.log(`- ${path.relative(repoRoot, featureSheetPath)}`);
  console.log(`- ${path.relative(repoRoot, manualPath)}`);
  console.log(`- ${path.relative(repoRoot, roleInventoryPath)}`);
}

if (require.main === module) {
  writeOutputs();
}

module.exports = {
  buildFeatureSheet,
  buildRoleInventory,
  buildUserManual,
  loadData,
  writeOutputs
};
