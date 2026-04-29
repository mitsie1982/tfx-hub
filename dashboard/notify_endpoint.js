/* dashboard/notify_endpoint.js - accepts POST /notify for quick status updates */
const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
app.use(express.json());
app.post('/notify', (req, res) => {
  const out = path.join(__dirname, '..', 'out', 'dashboard_notifications.log');
  const entry = { ts: new Date().toISOString(), body: req.body };
  fs.appendFileSync(out, JSON.stringify(entry) + '\n', 'utf8');
  res.json({ ok: true });
});
const port = process.env.PORT || 3001;
app.listen(port, () => console.log('Notify endpoint listening on', port));
