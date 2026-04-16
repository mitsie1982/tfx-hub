// TFX Hub - F5: Dispute Resolution Center
// Single-file backend + minimal frontend (Node.js + Express)
// ------------------------------------------------------------
// FEATURES:
// - Create dispute (client/contractor)
// - Attach chat history
// - Admin review & resolution
// - Status tracking (OPEN, IN_REVIEW, RESOLVED)
// - Simple browser UI for mediation
// ------------------------------------------------------------

const express = require('express');
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ------------------------------------------------------------
// IN-MEMORY DATABASE (Replace with MongoDB later)
// ------------------------------------------------------------
let disputesDB = []; // {id, jobId, parties, chatHistory, status, resolution}
let idCounter = 1;

// ------------------------------------------------------------
// 1. CREATE DISPUTE
// POST /api/disputes
// ------------------------------------------------------------
app.post('/api/disputes', (req, res) => {
  const { jobId, parties, chatHistory } = req.body;

  const dispute = {
    id: idCounter++,
    jobId,
    parties,
    chatHistory,
    status: 'OPEN',
    resolution: null
  };

  disputesDB.push(dispute);

  res.json({ message: 'Dispute created', dispute });
});

// ------------------------------------------------------------
// 2. GET ALL DISPUTES
// GET /api/disputes
// ------------------------------------------------------------
app.get('/api/disputes', (req, res) => {
  res.json(disputesDB);
});

// ------------------------------------------------------------
// 3. GET SINGLE DISPUTE
// GET /api/disputes/:id
// ------------------------------------------------------------
app.get('/api/disputes/:id', (req, res) => {
  const dispute = disputesDB.find(d => d.id == req.params.id);

  if (!dispute) {
    return res.status(404).json({ error: 'Dispute not found' });
  }

  res.json(dispute);
});

// ------------------------------------------------------------
// 4. UPDATE STATUS (Admin)
// POST /api/disputes/:id/status
// ------------------------------------------------------------
app.post('/api/disputes/:id/status', (req, res) => {
  const dispute = disputesDB.find(d => d.id == req.params.id);

  if (!dispute) {
    return res.status(404).json({ error: 'Dispute not found' });
  }

  const { status } = req.body;
  dispute.status = status;

  res.json({ message: 'Status updated', dispute });
});

// ------------------------------------------------------------
// 5. RESOLVE DISPUTE (Admin)
// POST /api/disputes/:id/resolve
// ------------------------------------------------------------
app.post('/api/disputes/:id/resolve', (req, res) => {
  const dispute = disputesDB.find(d => d.id == req.params.id);

  if (!dispute) {
    return res.status(404).json({ error: 'Dispute not found' });
  }

  const { resolution } = req.body;

  dispute.status = 'RESOLVED';
  dispute.resolution = resolution;

  res.json({ message: 'Dispute resolved', dispute });
});

// ------------------------------------------------------------
// 6. SIMPLE BROWSER UI (Admin Panel)
// ------------------------------------------------------------
app.get('/admin', (req, res) => {
  const html = `
  <html>
  <head>
    <title>TFX Dispute Center</title>
    <style>
      body { font-family: sans-serif; margin: 32px; }
      .dispute { border: 1px solid #ccc; padding: 16px; margin-bottom: 16px; border-radius: 8px; }
      .status { font-weight: bold; }
      .chat { background: #f9f9f9; padding: 8px; border-radius: 4px; margin: 8px 0; }
      .actions { margin-top: 8px; }
      .hidden { display: none; }
    </style>
  </head>
  <body>
    <h1>Dispute Resolution Center</h1>
    <div id="list"></div>
    <div id="detail"></div>
    <script>
      async function loadDisputes() {
        const res = await fetch('/api/disputes');
        const data = await res.json();
        const container = document.getElementById('list');
        container.innerHTML = '';
        data.forEach(d => {
          const div = document.createElement('div');
          div.className = 'dispute';
          div.innerHTML = `
            <div><b>ID:</b> "+d.id+" | <b>Job:</b> "+d.jobId+" | <span class='status'>Status: "+d.status+"</span></div>
            <div><b>Parties:</b> "+(d.parties ? d.parties.join(', ') : '-')+"</div>
            <button onclick='showDetail("+d.id+")'>View Details</button>
          `;
          container.appendChild(div);
        });
      }
      async function showDetail(id) {
        const res = await fetch('/api/disputes/' + id);
        const d = await res.json();
        const detail = document.getElementById('detail');
        detail.innerHTML = `
          <div class='dispute'>
            <h2>Dispute #
              ${d.id} (Job: ${d.jobId})
            </h2>
            <div><b>Status:</b> <span class='status'>${d.status}</span></div>
            <div><b>Parties:</b> ${(d.parties || []).join(', ')}</div>
            <div><b>Chat History:</b></div>
            <div class='chat'>${(d.chatHistory || []).map(msg => `<div><b>${msg.sender}:</b> ${msg.text}</div>`).join('')}</div>
            <div><b>Resolution:</b> ${d.resolution || '-'}</div>
            <div class='actions'>
              <label>Update Status:
                <select id='statusSel'>
                  <option value='OPEN' ${d.status==='OPEN'?'selected':''}>OPEN</option>
                  <option value='IN_REVIEW' ${d.status==='IN_REVIEW'?'selected':''}>IN_REVIEW</option>
                  <option value='RESOLVED' ${d.status==='RESOLVED'?'selected':''}>RESOLVED</option>
                </select>
              </label>
              <button onclick='updateStatus(${d.id})'>Update</button>
              <br><br>
              <label>Resolution:<br>
                <textarea id='resolutionTxt' rows='3' cols='40'>${d.resolution||''}</textarea>
              </label>
              <button onclick='resolveDispute(${d.id})'>Resolve</button>
              <button onclick='closeDetail()'>Close</button>
            </div>
          </div>
        `;
      }
      async function updateStatus(id) {
        const status = document.getElementById('statusSel').value;
        await fetch('/api/disputes/' + id + '/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status })
        });
        await loadDisputes();
        await showDetail(id);
      }
      async function resolveDispute(id) {
        const resolution = document.getElementById('resolutionTxt').value;
        await fetch('/api/disputes/' + id + '/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resolution })
        });
        await loadDisputes();
        await showDetail(id);
      }
      function closeDetail() {
        document.getElementById('detail').innerHTML = '';
      }
      loadDisputes();
    </script>
  </body>
  </html>
  `;
  res.send(html);
});

// ------------------------------------------------------------
// START SERVER
// ------------------------------------------------------------
const PORT = process.env.PORT || 4005;
app.listen(PORT, () => {
  console.log('TFX Dispute Center running on port', PORT);
});
