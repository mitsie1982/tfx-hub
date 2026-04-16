#!/usr/bin/env node
/**
 * rename-entities.js (ts-morph version)
 * Usage: node scripts/codemods/rename-entities.js [--dry|--apply]
 * - Replaces string literals "Contractor" -> "Contractor Customer Management System (CCMS)"
 * - Replaces string literals "Association" -> "Association Member Management System (AMMS)"
 * - Replaces identifier keys where safe to CCMS/AMMS canonical keys
 * - Supports --dry and --apply flags
 */
const { Project, SyntaxKind } = require('ts-morph');
const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry');
const APPLY = process.argv.includes('--apply');
if (!DRY_RUN && !APPLY) {
  console.error('Specify --dry or --apply');
  process.exit(1);
}

const ROOTS = ['src', 'apps', 'packages'];
const LITERAL_MAP = {
  Contractor: 'Contractor Customer Management System (CCMS)',
  Association: 'Association Member Management System (AMMS)'
};
const IDENTIFIER_MAP = {
  Contractor: 'CCMS',
  Association: 'AMMS'
};

function getAllFiles(dir, exts, fileList = []) {
  fs.readdirSync(dir).forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, exts, fileList);
    } else if (exts.some(ext => file.endsWith(ext))) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

const project = new Project();
const files = ROOTS.flatMap(root =>
  fs.existsSync(root) ? getAllFiles(root, ['.js', '.ts', '.tsx', '.jsx']) : []
);
project.addSourceFilesAtPaths(files);

let changed = 0;
for (const sourceFile of project.getSourceFiles()) {
  let fileChanged = false;
  // Replace string literals
  sourceFile.forEachDescendant((node) => {
    if (node.getKind() === SyntaxKind.StringLiteral) {
      const text = node.getLiteralText();
      if (LITERAL_MAP[text]) {
        node.replaceWithText(`"${LITERAL_MAP[text]}"`);
        fileChanged = true;
      }
    }
    // Replace identifiers (safe: not property access, not import/export)
    if (node.getKind() === SyntaxKind.Identifier) {
      const name = node.getText();
      if (IDENTIFIER_MAP[name]) {
        const parent = node.getParent();
        if (
          parent &&
          !parent.getKindName().includes('Import') &&
          !parent.getKindName().includes('Export') &&
          !parent.getKindName().includes('PropertyAccess')
        ) {
          node.replaceWithText(IDENTIFIER_MAP[name]);
          fileChanged = true;
        }
      }
    }
  });
  if (fileChanged) {
    changed++;
    if (DRY_RUN) {
      console.log(`[DRY] Would update: ${sourceFile.getFilePath()}`);
    } else if (APPLY) {
      sourceFile.saveSync();
      console.log(`[APPLY] Updated: ${sourceFile.getFilePath()}`);
    }
  }
}
console.log(`\n${changed} file(s) would be updated.`);
if (changed === 0) process.exit(0);
if (DRY_RUN) process.exit(0);
if (APPLY) process.exit(0);
