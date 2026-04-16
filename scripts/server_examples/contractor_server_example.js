'use strict';
/**
 * TFX Hub – Contractor App Demo Server
 * Richer presentation server showcasing contractor features.
 * Uses only Express (already in package.json) + Node built-ins.
 */
const express = require('express');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// ── Sample in-memory data ─────────────────────────────────────────────────────

const PROFESSIONALS = [
  {
    id: 'pro-001', name: 'John Smit', trade: 'Plumber',
    tier: 'PREMIUM',    jobs: 247, rating: 4.8,
    credential: 'NHBRC', phone: '+27 82 111 2233',
    location: 'Cape Town', lastActive: '2026-03-28',
    avatar: '🔧'
  },
  {
    id: 'pro-002', name: 'Sarah Khubone', trade: 'Electrician',
    tier: 'VERIFIED',   jobs: 156, rating: 4.7,
    credential: 'MBSA',  phone: '+27 71 444 5566',
    location: 'Johannesburg', lastActive: '2026-03-30',
    avatar: '⚡'
  },
  {
    id: 'pro-003', name: 'Thabo Mthembu', trade: 'Builder',
    tier: 'TRUSTED',    jobs: 67,  rating: 4.6,
    credential: 'CIDB',  phone: '+27 63 777 8899',
    location: 'Durban',  lastActive: '2026-03-31',
    avatar: '🏗️'
  },
  {
    id: 'pro-004', name: 'Theuns Fraser', trade: 'Painter',
    tier: 'ONBOARDED',  jobs: 4,   rating: 3.8,
    credential: 'None',  phone: '+27 60 222 3344',
    location: 'Pretoria', lastActive: '2026-04-01',
    avatar: '🎨'
  }
];

const JOBS = [
  { id: 'job-101', title: 'Fix burst pipe – Sea Point',       contractor: 'John Smit',     status: 'COMPLETED', fee: 'R 850',  date: '2026-03-29' },
  { id: 'job-102', title: 'Install DB board – Sandton',       contractor: 'Sarah Khubone', status: 'IN_PROGRESS',fee: 'R 2 400',date: '2026-04-01' },
  { id: 'job-103', title: 'Patio extension – Umhlanga',       contractor: 'Thabo Mthembu', status: 'PENDING',   fee: 'R 15 000',date: '2026-04-02' },
  { id: 'job-104', title: 'Interior repaint – Hatfield',      contractor: 'Theuns Fraser',status: 'PENDING',   fee: 'R 3 200', date: '2026-04-03' },
  { id: 'job-105', title: 'Geyser replacement – Bellville',   contractor: 'John Smit',     status: 'COMPLETED', fee: 'R 4 500', date: '2026-03-27' }
];

// ── API Routes ────────────────────────────────────────────────────────────────

app.get('/api/professionals', (_req, res) => res.json(PROFESSIONALS));

app.get('/api/professionals/:id', (req, res) => {
  const pro = PROFESSIONALS.find(p => p.id === req.params.id);
  if (!pro) return res.status(404).json({ error: 'Not found' });
  res.json(pro);
});

app.get('/api/jobs', (_req, res) => res.json(JOBS));

app.get('/api/stats', (_req, res) => res.json({
  totalProfessionals: PROFESSIONALS.length,
  totalJobs:          JOBS.length,
  completedJobs:      JOBS.filter(j => j.status === 'COMPLETED').length,
  pendingJobs:        JOBS.filter(j => j.status === 'PENDING').length,
  avgRating:          (PROFESSIONALS.reduce((s, p) => s + p.rating, 0) / PROFESSIONALS.length).toFixed(2)
}));

// ── Dashboard HTML ────────────────────────────────────────────────────────────

app.get('/', (_req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>TFX Hub – Contractor Demo</title>
  <style>
    :root {
      --brand:   #0057b8;
      --accent:  #00c170;
      --bg:      #f4f6fa;
      --card:    #ffffff;
      --text:    #1a1a2e;
      --muted:   #6b7280;
      --radius:  12px;
      --shadow:  0 2px 12px rgba(0,0,0,.08);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: var(--bg); color: var(--text); }

    /* ── Header ── */
    header {
      background: var(--brand);
      color: #fff;
      padding: 18px 32px;
      display: flex; align-items: center; justify-content: space-between;
      box-shadow: 0 2px 8px rgba(0,0,87,.18);
    }
    header h1 { font-size: 1.5rem; font-weight: 700; letter-spacing: .5px; }
    header span { font-size: .85rem; opacity: .8; }

    /* ── Layout ── */
    main { max-width: 1100px; margin: 32px auto; padding: 0 20px; }

    /* ── KPI cards ── */
    .kpi-row { display: grid; grid-template-columns: repeat(auto-fit,minmax(180px,1fr)); gap: 16px; margin-bottom: 32px; }
    .kpi { background: var(--card); border-radius: var(--radius); padding: 22px 18px; box-shadow: var(--shadow); text-align: center; }
    .kpi .value { font-size: 2rem; font-weight: 800; color: var(--brand); }
    .kpi .label { font-size: .8rem; color: var(--muted); margin-top: 4px; text-transform: uppercase; letter-spacing: .6px; }

    /* ── Section title ── */
    h2 { font-size: 1.1rem; font-weight: 700; margin-bottom: 14px; color: var(--text); }

    /* ── Professionals grid ── */
    .pro-grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(230px,1fr)); gap: 16px; margin-bottom: 32px; }
    .pro-card {
      background: var(--card); border-radius: var(--radius); padding: 20px;
      box-shadow: var(--shadow); transition: transform .15s;
      cursor: default;
    }
    .pro-card:hover { transform: translateY(-3px); }
    .pro-card .avatar { font-size: 2.2rem; text-align: center; margin-bottom: 10px; }
    .pro-card .name  { font-weight: 700; font-size: 1rem; text-align: center; }
    .pro-card .trade { font-size: .82rem; color: var(--muted); text-align: center; margin-bottom: 10px; }
    .pro-card .meta  { font-size: .78rem; color: var(--muted); line-height: 1.7; }
    .tier-badge {
      display: inline-block; padding: 2px 10px; border-radius: 20px;
      font-size: .7rem; font-weight: 700; letter-spacing: .5px;
      text-transform: uppercase; margin-bottom: 8px;
    }
    .tier-PREMIUM   { background: #ffd700; color: #5a4000; }
    .tier-VERIFIED  { background: #0057b8; color: #fff; }
    .tier-TRUSTED   { background: #00c170; color: #003a22; }
    .tier-ONBOARDED { background: #e5e7eb; color: #374151; }
    .stars { color: #f59e0b; font-size: .9rem; }

    /* ── Jobs table ── */
    .table-wrap { background: var(--card); border-radius: var(--radius); box-shadow: var(--shadow); overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
    thead th { background: var(--brand); color: #fff; padding: 12px 16px; text-align: left; font-size: .8rem; text-transform: uppercase; letter-spacing: .5px; }
    tbody tr:nth-child(even) { background: #f9fafb; }
    tbody td { padding: 11px 16px; font-size: .88rem; border-bottom: 1px solid #e5e7eb; }
    .status { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: .72rem; font-weight: 700; text-transform: uppercase; }
    .status-COMPLETED   { background: #d1fae5; color: #065f46; }
    .status-IN_PROGRESS { background: #dbeafe; color: #1e40af; }
    .status-PENDING     { background: #fef3c7; color: #92400e; }

    /* ── Footer ── */
    footer { text-align: center; color: var(--muted); font-size: .78rem; padding: 28px; }

    /* ── Live badge ── */
    .live { display: inline-flex; align-items: center; gap: 6px; background: var(--accent); color: #003a22; border-radius: 20px; padding: 3px 12px; font-size: .75rem; font-weight: 700; }
    .live::before { content: ''; width: 8px; height: 8px; background: #003a22; border-radius: 50%; animation: pulse 1.2s infinite; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
  </style>
</head>
<body>

<header>
  <h1>🔨 TFX Hub — Contractor Portal</h1>
  <div style="display:flex;align-items:center;gap:16px;">
    <span class="live">LIVE DEMO · port ${PORT}</span>
    <span id="clock"></span>
  </div>
</header>

<main>

  <!-- KPI row populated via fetch -->
  <div class="kpi-row" id="kpi-row">
    <div class="kpi"><div class="value">…</div><div class="label">Professionals</div></div>
    <div class="kpi"><div class="value">…</div><div class="label">Total Jobs</div></div>
    <div class="kpi"><div class="value">…</div><div class="label">Completed</div></div>
    <div class="kpi"><div class="value">…</div><div class="label">Avg Rating</div></div>
  </div>

  <!-- Professionals -->
  <h2>Registered Professionals</h2>
  <div class="pro-grid" id="pro-grid">Loading…</div>

  <!-- Jobs -->
  <h2>Recent Jobs</h2>
  <div class="table-wrap">
    <table>
      <thead><tr><th>#</th><th>Job</th><th>Contractor</th><th>Status</th><th>Fee</th><th>Date</th></tr></thead>
      <tbody id="jobs-body"><tr><td colspan="6">Loading…</td></tr></tbody>
    </table>
  </div>

</main>

<footer>TFX Hub Contractor Demo · South Africa · ${new Date().toLocaleDateString('en-ZA', { timeZone: 'Africa/Johannesburg' })}</footer>

<script>
  // ── Clock ────────────────────────────────────────────────────────────────────
  const clockEl = document.getElementById('clock');
  function tick() {
    clockEl.textContent = new Date().toLocaleTimeString('en-ZA', { timeZone: 'Africa/Johannesburg' });
  }
  tick(); setInterval(tick, 1000);

  // ── Stars ────────────────────────────────────────────────────────────────────
  function stars(r) {
    const full = Math.floor(r), half = r % 1 >= 0.5 ? 1 : 0;
    return '★'.repeat(full) + (half ? '½' : '') + ' ' + r.toFixed(1);
  }

  // ── Load KPIs ────────────────────────────────────────────────────────────────
  fetch('/api/stats').then(r => r.json()).then(s => {
    const vals = [s.totalProfessionals, s.totalJobs, s.completedJobs, s.avgRating + ' ★'];
    document.querySelectorAll('#kpi-row .value').forEach((el, i) => el.textContent = vals[i]);
  });

  // ── Load Professionals ───────────────────────────────────────────────────────
  fetch('/api/professionals').then(r => r.json()).then(pros => {
    document.getElementById('pro-grid').innerHTML = pros.map(p => \`
      <div class="pro-card">
        <div class="avatar">\${p.avatar}</div>
        <div class="name">\${p.name}</div>
        <div class="trade">\${p.trade} · \${p.location}</div>
        <div style="text-align:center;margin-bottom:6px">
          <span class="tier-badge tier-\${p.tier}">\${p.tier}</span>
        </div>
        <div class="meta">
          <div class="stars">\${stars(p.rating)}</div>
          <div>Jobs completed: <strong>\${p.jobs}</strong></div>
          <div>Credential: <strong>\${p.credential}</strong></div>
          <div>Last active: \${p.lastActive}</div>
        </div>
      </div>
    \`).join('');
  });

  // ── Load Jobs ────────────────────────────────────────────────────────────────
  fetch('/api/jobs').then(r => r.json()).then(jobs => {
    document.getElementById('jobs-body').innerHTML = jobs.map((j, i) => \`
      <tr>
        <td>\${i + 1}</td>
        <td>\${j.title}</td>
        <td>\${j.contractor}</td>
        <td><span class="status status-\${j.status}">\${j.status.replace('_',' ')}</span></td>
        <td>\${j.fee}</td>
        <td>\${j.date}</td>
      </tr>
    \`).join('');
  });
</script>
</body>
</html>`);
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[TFX Contractor Demo] Server running → http://localhost:${PORT}`);
  console.log(`  API endpoints:`);
  console.log(`    GET /api/professionals`);
  console.log(`    GET /api/professionals/:id`);
  console.log(`    GET /api/jobs`);
  console.log(`    GET /api/stats`);
});
