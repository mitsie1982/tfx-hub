const http = require("http");
// Use WHATWG URL API instead of deprecated url.parse
const port = process.env.PORT || 3004;
function sendHtml(res, html){ res.writeHead(200, {"Content-Type":"text/html; charset=utf-8"}); res.end(html); }
function sendJson(res, obj){ res.writeHead(200, {"Content-Type":"application/json; charset=utf-8"}); res.end(JSON.stringify(obj)); }
const html = `<!doctype html><html><head><meta charset="utf-8"/><title>Customer Demo</title><meta name="viewport" content="width=device-width,initial-scale=1"/><style>body{font-family:Segoe UI,Arial;margin:0;background:#fff8f0;color:#222}.wrap{max-width:980px;margin:48px auto;padding:24px;background:#fff;border-radius:8px;box-shadow:0 6px 18px rgba(0,0,0,.06)}h1{margin:0 0 8px}.meta{color:#666;margin-bottom:16px}.list{margin-top:12px}.item{padding:8px;border-bottom:1px solid #eee}footer{margin-top:18px;color:#888;font-size:13px}</style></head><body><div class="wrap"><h1>Customer Demo</h1><div class="meta">Status: <strong id="status">starting</strong> • Keys: <span id="keys">—</span></div><div><h3>Recent Customers</h3><div id="customers" class="list">Loading…</div></div><footer>Local demo served on port ${port}</footer></div><script>async function refresh(){try{const r=await fetch('/api/status');const j=await r.json();document.getElementById('status').textContent=j.status;document.getElementById('keys').textContent=j.keys.join(', ');const list=document.getElementById('customers');list.innerHTML=j.customers.map(c=>\`<div class="item"><strong>\${c.name}</strong> — \${c.lastOrder}</div>\`).join('');}catch(e){document.getElementById('status').textContent='error';document.getElementById('customers').textContent=e.message;}}refresh();setInterval(refresh,4000);</script></body></html>`;
const server = http.createServer((req, res) => {
	const u = new URL(req.url, `http://${req.headers.host}`);
	if (u.pathname === '/' || u.pathname === '/index.html') {
		sendHtml(res, html);
		return;
	}
	if (u.pathname === '/api/status') {
		const payload = {
			status: 'ready',
			keys: ['auth', 'client'],
			customers: [
				{ name: 'Acme Corp', lastOrder: '2026-03-30' },
				{ name: 'BrightCo', lastOrder: '2026-03-29' },
				{ name: 'Greenfield', lastOrder: '2026-03-28' }
			]
		};
		sendJson(res, payload);
		return;
	}
	res.writeHead(404, { 'Content-Type': 'text/plain' });
	res.end('Not found');
});
server.listen(port, '127.0.0.1', () => console.log('Listening on', port));


