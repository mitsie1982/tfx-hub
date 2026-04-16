/*
 tests/shared-auth/integration/server.js
 Minimal express server to validate tenantMiddleware and roleMiddleware
*/
const express = require('express');
const auth = require('../../../packages/shared-auth/src');

const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));

app.get('/protected', auth.tenantMiddleware(), (req, res) => {
  res.json({ ok: true, association: req.association, auth: req.auth });
});

app.get('/admin', auth.tenantMiddleware(), auth.roleMiddleware(['admin']), (req, res) => {
  res.json({ ok: true, role: req.auth.role });
});

if (require.main === module) {
  const port = process.env.PORT || 5010;
  app.listen(port, () => console.log('Integration server listening on', port));
}
module.exports = app;
