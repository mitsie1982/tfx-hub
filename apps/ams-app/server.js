'use strict';

const http = require('http');
const { URL } = require('url');
const {
	escapeHtml,
	readFormBody,
	redirect,
	renderCards,
	renderKeyValueTable,
	renderPills,
	renderSection,
	renderShell,
	renderStats
} = require('../browserHostUtils.cjs');
const amsData = require('./src/services/amsData');

const { extractJobDetails } = require('../../packages/shared-logic/src/nlpMatcher');
const SAMPLE_CONTRACTORS = require('./src/services/amsData').fetchAdminOverview().then(d => d.contractors).catch(() => []);

async function loadModel(requestUrl) {
	const url = new URL(requestUrl, 'http://127.0.0.1');
	const professionalId = url.searchParams.get('professionalId');
	const notice = url.searchParams.get('notice');
	const warning = url.searchParams.get('warning');
	const section = url.searchParams.get('section') || 'overview';
	const auditOutcome = url.searchParams.get('auditOutcome') || 'all';
	const overviewResult = await amsData.fetchAdminOverview();
	const adminManagementResult = await amsData.fetchAdminManagement({ outcome: auditOutcome, limit: 25 });
	const contractors = overviewResult.contractors || [];
	const selectedId = professionalId || (contractors[0] && contractors[0].id) || null;
	const detailResult = selectedId
		? await amsData.fetchAdminContractorDetail(selectedId)
		: { item: null, warning: null };

	return {
		section,
		auditOutcome,
		notice,
		overviewResult,
		adminManagementResult,
		contractors,
		selectedContractor: detailResult.item,
		detailWarning: warning || detailResult.warning
	};
}

function renderAdminManagementSection(model) {
	const adminManagement = model.adminManagementResult || { accounts: [], auditEvents: [], csvPreview: '' };
	const accountCards = (adminManagement.accounts || []).map((item) => ({
		title: `${item.firstName || ''} ${item.lastName || ''}`.trim() || item.username,
		meta: `${item.username} � ${item.email}`,
		body: item.isBootstrapAdmin ? 'Bootstrap admin: reset and credential rotation are blocked in the API.' : 'Managed admin: browser actions can issue resets and rotate credentials.',
		footer: item.isBootstrapAdmin ? 'Bootstrap admin' : 'Managed admin'
	}));
	const auditCards = (adminManagement.auditEvents || []).map((item) => ({
		title: item.eventType,
		meta: `${item.outcome} � ${item.requestMethod || 'N/A'} ${item.requestPath || ''}`.trim(),
		body: item.reason || 'No reason supplied.',
		footer: item.createdAt || 'Recently'
	}));

	return renderSection('Admin Management', `
		<div class="form-grid">
			<div class="form-card">
				<h3>Create Managed Admin</h3>
				<form method="post" action="/actions/admin-account-create">
					<input type="text" name="firstName" placeholder="First name" required>
					<input type="text" name="lastName" placeholder="Last name" required>
					<input type="email" name="email" placeholder="Email" required>
					<input type="text" name="username" placeholder="Username" required>
					<input type="password" name="password" placeholder="Temporary password" required>
					<button type="submit">Create managed admin</button>
				</form>
			</div>
			<div class="form-card">
				<h3>Audit Export</h3>
				<form method="get" action="/exports/admin-audit.csv">
					<select name="outcome">
						<option value="all"${model.auditOutcome === 'all' ? ' selected' : ''}>All outcomes</option>
						<option value="success"${model.auditOutcome === 'success' ? ' selected' : ''}>Success only</option>
						<option value="denied"${model.auditOutcome === 'denied' ? ' selected' : ''}>Denied only</option>
					</select>
					<button type="submit">Download CSV</button>
				</form>
				<p class="muted">Use the same filter below to preview the export in-browser.</p>
			</div>
		</div>
		${renderCards(accountCards)}
		<div class="card-list">${(adminManagement.accounts || []).map((item) => `
			<article class="list-card">
				<h3>${escapeHtml(`${item.firstName || ''} ${item.lastName || ''}`.trim() || item.username)}</h3>
				<p class="meta">${escapeHtml(`${item.username} � ${item.email}`)}</p>
				${item.isBootstrapAdmin ? `<p>${escapeHtml('Bootstrap admin resets and credential rotation must be handled out-of-band.')}</p>` : `
					<form method="post" action="/actions/admin-account-reset">
						<input type="hidden" name="adminUserId" value="${escapeHtml(item.id)}">
						<button type="submit">Issue reset token</button>
					</form>
					<form method="post" action="/actions/admin-account-rotate" class="inline-form">
						<input type="hidden" name="adminUserId" value="${escapeHtml(item.id)}">
						<input type="hidden" name="username" value="${escapeHtml(item.username)}">
						<button type="submit" class="secondary">Rotate credentials</button>
					</form>`}
			</article>
		`).join('')}</div>
		<div class="form-grid">
			<div class="form-card">
				<h3>Audit Filters</h3>
				<form method="get" action="/">
					<input type="hidden" name="section" value="admins">
					<select name="auditOutcome">
						<option value="all"${model.auditOutcome === 'all' ? ' selected' : ''}>All outcomes</option>
						<option value="success"${model.auditOutcome === 'success' ? ' selected' : ''}>Success only</option>
						<option value="denied"${model.auditOutcome === 'denied' ? ' selected' : ''}>Denied only</option>
					</select>
					<button type="submit">Apply filter</button>
				</form>
			</div>
			<div class="form-card">
				<h3>CSV Preview</h3>
				<pre>${escapeHtml(adminManagement.csvPreview || 'No CSV preview available.')}</pre>
			</div>
		</div>
		${renderCards(auditCards)}
	`, 'Managed admin workflows, audit filters, and CSV export are available in the browser host.');
}

function renderModel(model) {
	const overview = model.overviewResult.overview || { totals: {}, openJobsByTrade: {}, professionalsByTier: {} };
	const contractor = model.selectedContractor;

	return renderShell({
		title: 'Admin Browser Workspace',
		eyebrow: 'Association Admin Browser',
		subtitle: 'Live HTML browser host for platform operations, contractor review, managed admin workflows, and admin audit export.',
		status: model.overviewResult.source === 'live' ? 'Live admin data connected' : 'Sample admin data mode',
		notice: model.notice,
		warning: model.overviewResult.warning || model.adminManagementResult.warning || model.detailWarning || null,
		nav: [
			{ href: '/', label: 'Operations Overview' },
			{ href: '/?section=contractors', label: 'Contractor Directory' },
			{ href: '/?section=admins', label: 'Admin Management' }
		],
		sections: [
			renderSection('Operations Totals', renderStats([
				{ label: 'Open Jobs', value: overview.totals.openJobs || 0 },
				{ label: 'In Progress', value: overview.totals.inProgressJobs || 0 },
				{ label: 'Completed', value: overview.totals.completedJobs || 0 },
				{ label: 'Professionals', value: overview.totals.professionals || 0 }
			]) + `
				<div class="form-grid">
					<div class="form-card">
						<h3>Admin Sign In</h3>
						<form method="post" action="/actions/login">
							<input type="text" name="identifier" placeholder="TFX_ADMIN_USERNAME" required>
							<input type="password" name="password" placeholder="TFX_ADMIN_PASSWORD" required>
							<button type="submit">Sign In</button>
						</form>
						<form method="post" action="/actions/logout" class="inline-form">
							<button type="submit" class="secondary">Logout</button>
						</form>
					</div>
					<div class="form-card">
						<h3>Admin Access Rules</h3>
						<p>Use TFX_ADMIN_USERNAME and TFX_ADMIN_PASSWORD to sign in. Admin WhatsApp access is disabled, and admin access is limited to 08:00-17:00 Africa/Johannesburg.</p>
					</div>
				</div>`),
			renderSection('Open Jobs by Trade', renderPills(Object.entries(overview.openJobsByTrade || {}).map(([trade, count]) => `${trade}: ${count}`))),
			renderSection('Professional Tiers', renderPills(Object.entries(overview.professionalsByTier || {}).map(([tier, count]) => `${tier}: ${count}`))),
			renderSection('Contractor Directory', renderCards(model.contractors.map((item) => ({
				title: item.name,
				meta: `${item.trade} � ${item.tier} � ${item.rating || 'N/A'} rating`,
				footer: 'Open browser detail',
				actionHref: `/?section=contractors&professionalId=${encodeURIComponent(item.id)}`,
				actionLabel: 'Inspect contractor'
			})))),
			renderAdminManagementSection(model),
			renderSection('Selected Contractor', contractor ? [
				renderKeyValueTable([
					{ label: 'Name', value: contractor.name },
					{ label: 'Trade', value: contractor.trade },
					{ label: 'Tier', value: contractor.tier },
					{ label: 'Completed Jobs', value: contractor.completedJobs || 'N/A' },
					{ label: 'Active Quotes', value: contractor.activeQuotes || 'N/A' },
					{ label: 'Response Time', value: contractor.responseTime || 'N/A' }
				]),
				`<p>${escapeHtml(contractor.summary || 'No contractor summary available.')}</p>`,
				renderCards((contractor.adminActions || []).map((action) => ({
					title: action.summary,
					meta: `${action.actionType} � ${action.createdAt || 'Recently'}`,
					body: action.note || 'No note recorded.',
					footer: `Source: ${action.source || 'live'}`
				}))),
				renderPills((contractor.compliance && contractor.compliance.notes) || []),
				`<div class="form-grid">
					<div class="form-card">
						<h3>Run Admin Action</h3>
						<form method="post" action="/actions/admin-action">
							<input type="hidden" name="professionalId" value="${escapeHtml(contractor.id)}">
							<select name="actionType">
								<option value="tier-review">Tier review</option>
								<option value="compliance-review">Compliance review</option>
								<option value="dispute-audit">Dispute audit</option>
							</select>
							<button type="submit">Execute Action</button>
						</form>
					</div>
				</div>`
			].join('') : '<p class="muted">No contractor selected.</p>', 'Admin actions remain executable in the underlying mobile workspace and API.')
		]
	});
}

async function handlePost(requestUrl, form) {
	const url = new URL(requestUrl, 'http://127.0.0.1');
	if (url.pathname === '/actions/login') {
		await amsData.loginAdmin({ identifier: form.identifier, password: form.password });
		return '/?notice=' + encodeURIComponent('Admin sign-in completed.');
	}
	if (url.pathname === '/actions/logout') {
		await amsData.logoutAdmin();
		return '/?notice=' + encodeURIComponent('Admin session cleared.');
	}
	if (url.pathname === '/actions/subscribe-whatsapp') {
		const result = await amsData.subscribeAdminWhatsapp(form.phoneNumber);
		return '/?notice=' + encodeURIComponent(result.warning || result.item.nextStep || `Subscribed ${form.phoneNumber}.`);
	}
	if (url.pathname === '/actions/admin-action') {
		const result = await amsData.performAdminContractorAction(form.professionalId, form.actionType);
		return '/?section=contractors&professionalId=' + encodeURIComponent(form.professionalId) + '&notice=' + encodeURIComponent(result.warning || `${result.item.summary} (${result.source}).`);
	}
	if (url.pathname === '/actions/admin-account-create') {
		const result = await amsData.createManagedAdminAccount({
			firstName: form.firstName,
			lastName: form.lastName,
			email: form.email,
			username: form.username,
			password: form.password
		});
		return '/?section=admins&notice=' + encodeURIComponent(result.warning || `Managed admin ${result.item.username} created.`);
	}
	if (url.pathname === '/actions/admin-account-reset') {
		const result = await amsData.requestManagedAdminPasswordReset(form.adminUserId);
		return '/?section=admins&notice=' + encodeURIComponent(result.warning || `Reset token issued for ${result.item.targetUserId}.`);
	}
	if (url.pathname === '/actions/admin-account-rotate') {
		const tempPassword = `temp-${Date.now().toString().slice(-6)}`;
		const result = await amsData.rotateManagedAdminCredentials(form.adminUserId, { username: form.username, password: tempPassword });
		return '/?section=admins&notice=' + encodeURIComponent(result.warning || `Rotated ${result.item.username}. Temporary password: ${tempPassword}`);
	}
	return '/?warning=' + encodeURIComponent('Unsupported admin browser action.');
}

function createServer() {
	return http.createServer(async (req, res) => {
		if (!req.url) {
			res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
			res.end('Method not allowed');
			return;
		}

		const url = new URL(req.url, 'http://127.0.0.1');

		// --- SMART MATCH ENDPOINT (Automated Mode) ---
		if (req.method === 'POST' && url.pathname === '/api/smart-match') {
			let body = '';
			req.on('data', chunk => { body += chunk; });
			req.on('end', async () => {
				try {
					const { requestText } = JSON.parse(body || '{}');
					if (!requestText) {
						res.writeHead(400, { 'Content-Type': 'application/json' });
						res.end(JSON.stringify({ error: 'Missing requestText' }));
						return;
					}
					// 1. NLP extraction
					const { trade, location, serviceType } = await extractJobDetails(requestText);
					// 2. Get contractors (sample mode if not authenticated)
					let contractors = [];
					try {
						const overview = await require('./src/services/amsData').fetchAdminOverview();
						contractors = overview.contractors || [];
					} catch { contractors = await SAMPLE_CONTRACTORS; }
					// 3. Filter contractors
					let matches = contractors.filter(c =>
						(!trade || c.trade === trade) &&
						(!location || c.location === location) &&
						c.available === true
					);
					// 4. Rank by rating (extendable)
					matches = matches.sort((a, b) => (b.rating || 0) - (a.rating || 0));
					res.writeHead(200, { 'Content-Type': 'application/json' });
					res.end(JSON.stringify({ matches }));
				} catch (error) {
					res.writeHead(500, { 'Content-Type': 'application/json' });
					res.end(JSON.stringify({ error: error.message }));
				}
			});
			return;
		}

		if (req.method === 'GET' && url.pathname === '/exports/admin-audit.csv') {
			try {
				const result = await amsData.fetchAdminManagement({ outcome: url.searchParams.get('outcome') || 'all', limit: 100 });
				res.writeHead(200, {
					'Content-Type': 'text/csv; charset=utf-8',
					'Content-Disposition': 'attachment; filename="admin-audit-events.csv"'
				});
				res.end(result.csvPreview || 'id,eventType,outcome,targetUserId,createdAt\n');
				return;
			} catch (error) {
				redirect(res, `/?section=admins&warning=${encodeURIComponent(error.message)}`);
				return;
			}
		}

		if (req.method === 'POST') {
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
			const html = renderShell({
				title: 'Browser Host Error',
				eyebrow: 'TFX Hub',
				subtitle: 'The browser host failed while building this page.',
				warning: error.message,
				sections: [renderSection('Failure', `<p>${escapeHtml(error.stack || error.message)}</p>`)]
			});
			res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
			res.end(html);
		}
	});
}

if (require.main === module) {
	const port = Number(process.env.PORT || 3000);
	console.log('Admin browser host starting on port', port);
	createServer().listen(port, () => console.log('Listening on', port));
}

module.exports = { createServer, loadModel, renderModel };
