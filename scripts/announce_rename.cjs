// scripts/announce_rename.js
// Prepares release notes and stakeholder notifications for CCMS/AMMS rename
const fs = require("fs");
const notes = `Release Notes: CCMS/AMMS Naming Migration\n- All references to 'Contractor' and 'Association' replaced with 'CCMS' and 'AMMS'\n- Legacy values normalized server-side for 30–90 day deprecation\n- Stakeholders notified via this announcement\n`;
fs.writeFileSync("artifacts/announce_rename.txt", notes);
console.log("Announcement prepared at artifacts/announce_rename.txt");
