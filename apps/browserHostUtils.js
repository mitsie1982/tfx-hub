'use strict';

const http = require('http');

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderPills(items = []) {
  if (!items.length) {
    return '<p class="muted">No items available.</p>';
  }

  return `<div class="pill-row">${items.map((item) => `<span class="pill">${escapeHtml(item)}</span>`).join('')}</div>`;
}

function renderStats(items = []) {
  return `<div class="stats-grid">${items.map((item) => `
    <section class="stat-card">
      <div class="stat-value">${escapeHtml(item.value)}</div>
      <div class="stat-label">${escapeHtml(item.label)}</div>
    </section>
  `).join('')}</div>`;
}

function renderKeyValueTable(rows = []) {
  if (!rows.length) {
    return '<p class="muted">No details available.</p>';
  }

  return `<dl class="key-value-list">${rows.map((row) => `
    <div>
      <dt>${escapeHtml(row.label)}</dt>
      <dd>${escapeHtml(row.value)}</dd>
    </div>
  `).join('')}</dl>`;
}

function renderCards(items = []) {
  if (!items.length) {
    return '<p class="muted">No records available.</p>';
  }

  return `<div class="card-list">${items.map((item) => `
    <article class="list-card">
      <h3>${escapeHtml(item.title)}</h3>
      ${item.meta ? `<p class="meta">${escapeHtml(item.meta)}</p>` : ''}
      ${item.body ? `<p>${escapeHtml(item.body)}</p>` : ''}
      ${item.footer ? `<p class="footer">${escapeHtml(item.footer)}</p>` : ''}
      ${item.actionHref && item.actionLabel ? `<a class="action-link" href="${escapeHtml(item.actionHref)}">${escapeHtml(item.actionLabel)}</a>` : ''}
    </article>
  `).join('')}</div>`;
}

function renderSection(title, body, subtitle) {
  return `
    <section class="panel">
      <header class="panel-header">
        <div>
          <h2>${escapeHtml(title)}</h2>
          ${subtitle ? `<p class="muted">${escapeHtml(subtitle)}</p>` : ''}
        </div>
      </header>
      ${body}
    </section>
  `;
}

function renderShell(options = {}) {
  const {
    title,
    eyebrow,
    subtitle,
    status,
    sessionBadge,
    notice,
    warning,
    nav = [],
    sections = []
  } = options;

  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="utf-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1">',
    `  <title>${escapeHtml(title)}</title>`,
    '  <style>',
    '    :root { color-scheme: light; --bg: #f4f1e8; --paper: #fffaf2; --ink: #18231c; --muted: #58675e; --accent: #123524; --accent-soft: #d8ebdd; --outline: #e2d8c6; --warm: #8b5e34; }',
    '    * { box-sizing: border-box; }',
    '    body { margin: 0; font-family: "Segoe UI", Tahoma, sans-serif; background: linear-gradient(180deg, #f0ece1 0%, #f7f4ed 100%); color: var(--ink); }',
    '    .page { max-width: 1180px; margin: 0 auto; padding: 24px; }',
    '    .hero { background: var(--accent); color: #fff; padding: 28px; border-radius: 24px; box-shadow: 0 20px 40px rgba(18, 53, 36, 0.14); }',
    '    .eyebrow { text-transform: uppercase; letter-spacing: 0.12em; font-size: 12px; color: #d0e4d4; margin: 0 0 10px; }',
    '    h1 { margin: 0; font-size: 34px; line-height: 1.1; }',
    '    .hero p { margin: 10px 0 0; max-width: 880px; line-height: 1.5; }',
    '    .hero-meta { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 16px; }',
    '    .status { display: inline-block; padding: 8px 12px; border-radius: 999px; background: #214c35; color: #d7eadb; font-size: 13px; font-weight: 700; }',
    '    .session-badge { display: inline-block; padding: 8px 12px; border-radius: 999px; font-size: 13px; font-weight: 700; }',
    '    .session-badge.live { background: #dff2e4; color: #214c35; }',
    '    .session-badge.sample { background: #fff3cd; color: #8b5e34; }',
    '    .notice { margin-top: 16px; padding: 12px 14px; border-radius: 14px; background: #dff2e4; color: #214c35; }',
    '    .warning { margin-top: 16px; padding: 12px 14px; border-radius: 14px; background: #fff3cd; color: #8b5e34; }',
    '    nav { display: flex; flex-wrap: wrap; gap: 10px; margin: 18px 0 22px; }',
    '    nav a { text-decoration: none; color: var(--accent); font-weight: 700; background: #e0eadf; padding: 10px 14px; border-radius: 999px; }',
    '    .layout { display: grid; gap: 18px; margin-top: 20px; }',
    '    .panel { background: var(--paper); border: 1px solid var(--outline); border-radius: 22px; padding: 20px; box-shadow: 0 10px 25px rgba(24, 35, 28, 0.05); }',
    '    .panel-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; }',
    '    .panel h2 { margin: 0; font-size: 24px; }',
    '    .muted { color: var(--muted); }',
    '    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }',
    '    .stat-card { background: #fff; border: 1px solid var(--outline); border-radius: 18px; padding: 16px; }',
    '    .stat-value { font-size: 26px; font-weight: 800; color: var(--accent); }',
    '    .stat-label { margin-top: 6px; color: var(--muted); font-size: 13px; }',
    '    .card-list { display: grid; gap: 12px; }',
    '    .list-card { background: #fff; border: 1px solid var(--outline); border-radius: 18px; padding: 16px; }',
    '    .list-card h3 { margin: 0; font-size: 18px; }',
    '    .meta { color: var(--muted); margin: 6px 0 10px; }',
    '    .footer { color: var(--warm); font-size: 13px; font-weight: 700; margin-bottom: 0; }',
    '    .action-link { display: inline-block; margin-top: 10px; text-decoration: none; color: var(--accent); font-weight: 700; }',
    '    form { display: grid; gap: 10px; margin-top: 12px; }',
    '    input, textarea, select, button { font: inherit; }',
    '    input, textarea, select { width: 100%; padding: 11px 13px; border-radius: 12px; border: 1px solid var(--outline); background: #fff; color: var(--ink); }',
    '    textarea { min-height: 88px; resize: vertical; }',
    '    button { padding: 11px 14px; border: none; border-radius: 999px; background: var(--accent); color: #fff; font-weight: 700; cursor: pointer; }',
    '    button.secondary { background: #6b5b55; }',
    '    .inline-form { display: inline-flex; margin-top: 8px; }',
    '    .form-grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }',
    '    .form-card { background: #fff; border: 1px solid var(--outline); border-radius: 18px; padding: 16px; }',
    '    .pill-row { display: flex; flex-wrap: wrap; gap: 8px; }',
    '    .pill { display: inline-block; padding: 8px 12px; border-radius: 999px; background: var(--accent-soft); color: var(--accent); font-weight: 700; font-size: 13px; }',
    '    .key-value-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin: 0; }',
    '    .key-value-list div { background: #fff; border: 1px solid var(--outline); border-radius: 16px; padding: 14px; }',
    '    .key-value-list dt { font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); margin-bottom: 8px; }',
    '    .key-value-list dd { margin: 0; font-size: 16px; font-weight: 700; }',
    '    @media (max-width: 640px) { .page { padding: 16px; } .hero { padding: 22px; } h1 { font-size: 28px; } }',
    '  </style>',
    '</head>',
    '<body>',
    '  <main class="page">',
    '    <section class="hero">',
    `      <p class="eyebrow">${escapeHtml(eyebrow || '')}</p>`,
    `      <h1>${escapeHtml(title)}</h1>`,
    `      <p>${escapeHtml(subtitle || '')}</p>`,
    (status || sessionBadge) ? '      <div class="hero-meta">' : '',
    status ? `        <span class="status">${escapeHtml(status)}</span>` : '',
    sessionBadge ? `        <span class="session-badge ${escapeHtml(sessionBadge.tone || 'sample')}">${escapeHtml(sessionBadge.label)}</span>` : '',
    (status || sessionBadge) ? '      </div>' : '',
    notice ? `      <div class="notice">${escapeHtml(notice)}</div>` : '',
    warning ? `      <div class="warning">${escapeHtml(warning)}</div>` : '',
    '    </section>',
    nav.length ? `    <nav>${nav.map((item) => `<a href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a>`).join('')}</nav>` : '',
    `    <div class="layout">${sections.join('')}</div>`,
    '  </main>',
    '</body>',
    '</html>'
  ].join('\n');
}

async function readFormBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }
  const body = Buffer.concat(chunks).toString('utf8');
  const params = new URLSearchParams(body);
  return Object.fromEntries(params.entries());
}

function redirect(res, location) {
  res.writeHead(303, { Location: location });
  res.end('Redirecting');
}

function createHtmlServer(options) {
  const { loadModel, renderModel, handlePost } = options;

  return http.createServer(async (req, res) => {
    if (!req.url) {
      res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Method not allowed');
      return;
    }

    if (req.method === 'POST') {
      if (!handlePost) {
        res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Method not allowed');
        return;
      }

      try {
        const form = await readFormBody(req);
        const nextLocation = await handlePost(req.url, form);
        redirect(res, nextLocation || '/');
      } catch (error) {
        redirect(res, `/?warning=${encodeURIComponent(error.message)}`);
      }
      return;
    }

    if (req.method !== 'GET') {
      res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Method not allowed');
      return;
    }

    try {
      const model = await loadModel(req.url);
      const html = renderModel(model);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderShell({
        title: 'Browser Host Error',
        eyebrow: 'TFX Hub',
        subtitle: 'The browser host failed while building this page.',
        warning: error.message,
        sections: [renderSection('Failure', `<p>${escapeHtml(error.stack || error.message)}</p>`)]
      }));
    }
  });
}

module.exports = {
  createHtmlServer,
  escapeHtml,
  readFormBody,
  redirect,
  renderCards,
  renderKeyValueTable,
  renderPills,
  renderSection,
  renderShell,
  renderStats
};