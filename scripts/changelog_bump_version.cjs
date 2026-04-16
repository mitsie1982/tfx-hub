// scripts/changelog_bump_version.js
// Automates changelog generation and API version bumping
const fs = require("fs");
const pkg = require("../package.json");
const semver = require("semver");
const newVersion = semver.inc(pkg.version, "minor");
pkg.version = newVersion;
fs.writeFileSync("package.json", JSON.stringify(pkg, null, 2));
console.log("API version bumped to", newVersion);
// TODO: Integrate with changelog generator
