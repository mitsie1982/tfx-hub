/* dashboard/server.js */
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

const LOG_DIR = path.join(__dirname, '..', 'out');

app.get('/status', (req, res) => {
  // read orchestrator log tail
  const logFile = path.join(LOG_DIR, 'orchestrator.log');
  let tail = '';
  if (fs.existsSync(logFile)) {
    const data = fs.readFileSync(logFile, 'utf8').split('\n').slice(-200).join('\n');
    tail = data;
  }
  res.json({ uptime: process.uptime(), logTail: tail });
});

app.get('/logs/:name', (req, res) => {
  const name = req.params.name;
  const file = path.join(LOG_DIR, name);
  if (fs.existsSync(file)) {
    res.sendFile(file);
  } else {
    res.status(404).send('Not found');
  }
});

app.get('/', (req, res) => {
  res.send(`<html><body><h2>Orchestrator Dashboard</h2><p>Endpoints: /status, /logs/{name}</p></body></html>`);
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('Dashboard listening on', port));
