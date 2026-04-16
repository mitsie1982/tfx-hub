"use strict";

const http = require("http");

function escapeHtml(value) {
	return String(value ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

function renderPills(items = []) {
	if (!items.length) {
		if (opts && opts.demo) {
			return '<div class="pill-row"><span class="pill">Demo Pill</span></div>';
		}
		return '<p class="muted">No items available.</p>';
	}

	return `<div class="pill-row">${items.map((item) => `<span class="pill">${escapeHtml(item)}</span>`).join("")}</div>`;
}

function renderStats(items = []) {
	return `<div class="stats-grid">${items
		.map(
			(item) => `
		<section class="stat-card">
			<div class="stat-value">${escapeHtml(item.value)}</div>
			<div class="stat-label">${escapeHtml(item.label)}</div>
		</section>
	`,
		)
		.join("")}</div>`;
}

function renderKeyValueTable(rows = []) {
	if (!rows.length) {
		if (opts && opts.demo) {
			return '<dl class="key-value-list"><div><dt>Demo Key</dt><dd>Demo Value</dd></div></dl>';
		}
		return '<p class="muted">No details available.</p>';
	}

	return `<dl class="key-value-list">${rows
		.map(
			(row) => `
		<div>
			<dt>${escapeHtml(row.label)}</dt>
			<dd>${escapeHtml(row.value)}</dd>
		</div>
	`,
		)
		.join("")}</dl>`;
}

function renderCards(items = []) {
	if (!items.length) {
		if (opts && opts.demo) {
			return `<div class="card-list"><article class="list-card"><h3>Demo Card</h3><p class="meta">Demo meta</p><p>Demo body</p><p class="footer">Demo footer</p><a class="action-link" href="#">Open profile</a></article></div>`;
		}
		return '<p class="muted">No records available.</p>';
	}

	return `<div class="card-list">${items
		.map(
			(item) => `
		<article class="list-card">
			<h3>${escapeHtml(item.title)}</h3>
			${item.meta ? `<p class="meta">${escapeHtml(item.meta)}</p>` : ""}
			${item.body ? `<p>${escapeHtml(item.body)}</p>` : ""}
			${item.footer ? `<p class="footer">${escapeHtml(item.footer)}</p>` : ""}
			${item.actionHref && item.actionLabel ? `<a class="action-link" href="${escapeHtml(item.actionHref)}">${escapeHtml(item.actionLabel)}</a>` : ""}
		</article>
	`,
		)
		.join("")}</div>`;
}

function renderSection(title, body, subtitle) {
	return `
		<section class="panel">
			<header class="panel-header">
				<div>
					<h2>${escapeHtml(title)}</h2>
					${subtitle ? `<p class="muted">${escapeHtml(subtitle)}</p>` : ""}
				</div>
			</header>
			${body}
		</section>
	`;
}

function renderShell(options = {}) {
	// ...existing code from renderShell...
	return ""; // placeholder
}

async function readFormBody(req) {
	const chunks = [];
	for await (const chunk of req) {
		chunks.push(Buffer.from(chunk));
	}
	const body = Buffer.concat(chunks).toString("utf8");
	const params = new URLSearchParams(body);
	return Object.fromEntries(params.entries());
}

function redirect(res, location) {
	res.writeHead(303, { Location: location });
	res.end("Redirecting");
}

function createHtmlServer(options) {
	const { loadModel, renderModel, handlePost } = options;

	return http.createServer(async (req, res) => {
		if (!req.url) {
			res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
			res.end("Method not allowed");
			return;
		}

		if (req.method === "POST") {
			if (!handlePost) {
				res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
				res.end("Method not allowed");
				return;
			}

			try {
				const form = await readFormBody(req);
				const nextLocation = await handlePost(req.url, form);
				redirect(res, nextLocation || "/");
			} catch (error) {
				redirect(res, `/?warning=${encodeURIComponent(error.message)}`);
			}
			return;
		}

		if (req.method !== "GET") {
			res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
			res.end("Method not allowed");
			return;
		}

		try {
			const model = await loadModel(req.url);
			const html = renderModel(model);
			res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
			res.end(html);
		} catch (error) {
			res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
			res.end(
				renderShell({
					title: "Browser Host Error",
					eyebrow: "TFX Hub",
					subtitle: "The browser host failed while building this page.",
					warning: error.message,
					sections: [renderSection("Failure", `<p>${escapeHtml(error.stack || error.message)}</p>`)],
				}),
			);
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
	renderStats,
};
