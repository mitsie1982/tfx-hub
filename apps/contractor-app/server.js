'use strict';

const { URL } = require('url');
const {
	createHtmlServer,
	renderCards,
	renderKeyValueTable,
	renderPills,
	renderSection,
	renderShell,
	renderStats
} = require('../browserHostUtils');
const contractorData = require('./src/services/contractorData');

async function loadModel(requestUrl) {
	const url = new URL(requestUrl, 'http://127.0.0.1');
	const selectedProjectId = url.searchParams.get('projectId');
	const notice = url.searchParams.get('notice');
	const warning = url.searchParams.get('warning');
	const pendingAction = url.searchParams.get('pendingAction');
	const [profileResult, projectsResult, historyResult] = await Promise.all([
		contractorData.fetchContractorProfile(),
		contractorData.fetchProjects({ trade: 'All', search: '' }),
		contractorData.fetchLeadHistory()
	]);

	const projects = projectsResult.items || [];
	const selectedProject = projects.find((project) => project.id === selectedProjectId) || projects[0] || null;

	return {
		profile: profileResult.item,
		profileSource: profileResult.source,
		projects,
		notice,
		projectsWarning: warning || projectsResult.warning || profileResult.warning || historyResult.warning || null,
		history: historyResult.items || [],
		selectedProject,
		pendingAction: pendingAction ? {
			type: pendingAction,
			projectId: url.searchParams.get('projectId') || '',
			amount: url.searchParams.get('amount') || '',
			timeline: url.searchParams.get('timeline') || '',
			note: url.searchParams.get('note') || '',
			body: url.searchParams.get('body') || ''
		} : null
	};
}

function renderPendingAction(model) {
	const pendingAction = model.pendingAction;
	if (!pendingAction) {
		return '';
	}
	const selectedProject = model.selectedProject;
	const projectId = pendingAction.projectId || (selectedProject && selectedProject.id) || '';
	const projectTitle = (selectedProject && selectedProject.title) || pendingAction.projectId || 'Selected lead';

	if (pendingAction.type === 'quote') {
		return renderSection('Confirm Quote', [
			'<p class="muted">Review the quote before sending it to the homeowner.</p>',
			renderKeyValueTable([
				{ label: 'Project', value: projectTitle },
				{ label: 'Amount', value: pendingAction.amount || 'TBC' },
				{ label: 'Timeline', value: pendingAction.timeline || 'Timeline pending' },
				{ label: 'Note', value: pendingAction.note || 'No note added' }
			]),
			`<div class="form-grid">
				<div class="form-card">
					<h3>Send Quote</h3>
					<form method="post" action="/actions/quote">
						<input type="hidden" name="confirm" value="yes">
						<input type="hidden" name="projectId" value="${projectId}">
						<input type="hidden" name="amount" value="${pendingAction.amount}">
						<input type="hidden" name="timeline" value="${pendingAction.timeline}">
						<input type="hidden" name="note" value="${pendingAction.note}">
						<button type="submit">Confirm Quote</button>
					</form>
				</div>
				<div class="form-card">
					<h3>Cancel</h3>
					<form method="get" action="/">
						<input type="hidden" name="projectId" value="${projectId}">
						<button type="submit" class="secondary">Back to Lead Detail</button>
					</form>
				</div>
			</div>`
		].join(''));
	}

	if (pendingAction.type === 'message') {
		return renderSection('Preview Message', [
			'<p class="muted">Preview the message before it is recorded and sent.</p>',
			renderKeyValueTable([
				{ label: 'Project', value: projectTitle },
				{ label: 'Message', value: pendingAction.body || 'No message entered' }
			]),
			`<div class="form-grid">
				<div class="form-card">
					<h3>Send Message</h3>
					<form method="post" action="/actions/message">
						<input type="hidden" name="confirm" value="yes">
						<input type="hidden" name="projectId" value="${projectId}">
						<textarea name="body" hidden>${pendingAction.body}</textarea>
						<button type="submit">Confirm Message</button>
					</form>
				</div>
				<div class="form-card">
					<h3>Cancel</h3>
					<form method="get" action="/">
						<input type="hidden" name="projectId" value="${projectId}">
						<button type="submit" class="secondary">Back to Lead Detail</button>
					</form>
				</div>
			</div>`
		].join(''));
	}

	return '';
}

function renderDemoOperatorSection() {
	return renderSection('TFSSA Live Demo Scope', `
		<div class="form-grid">
			<div class="form-card">
				<h3>Live System Fields</h3>
				<p class="muted">These sections load from the live API whenever the demo session is authenticated.</p>
				${renderPills([
					'Dashboard Snapshot',
					'Contractor Profile',
					'Matched Leads',
					'Selected Lead Detail',
					'Lead History'
				])}
			</div>
			<div class="form-card">
				<h3>Presenter Editable During Demo</h3>
				<p class="muted">These controls actively change the browser-host session while TFSSA is watching the live flow.</p>
				${renderPills([
					'Contractor sign-in identifier',
					'Contractor password',
					'WhatsApp subscription number',
					'Express interest action',
					'Quote amount',
					'Quote timeline',
					'Quote note',
					'Homeowner message body'
				])}
			</div>
		</div>
	`, 'Use the Desktop shortcut to open this page in authenticated live-demo mode.');
}

function renderVerifiedFieldsSection() {
	return renderSection('Fields Verified Live', `
		<div class="form-grid">
			<div class="form-card">
				<h3>Verified Presenter Changes</h3>
				${renderPills([
					'Contractor sign-in',
					'WhatsApp number change',
					'Express interest',
					'Quote amount',
					'Quote timeline',
					'Quote note',
					'Homeowner message body'
				])}
			</div>
			<div class="form-card">
				<h3>Presenter Sequence</h3>
				<p class="muted">Recommended TFSSA order: sign in, update WhatsApp number, open a lead, send interest, review a quote, then preview and confirm a homeowner message.</p>
			</div>
		</div>
	`, 'This panel is read-only rehearsal guidance based on the latest live verification run.');
}

function renderModel(model) {
	const profile = model.profile;
	const selectedProject = model.selectedProject;

	return renderShell({
		title: profile ? `${profile.name} Browser Workspace` : 'Contractor Browser Workspace',
		eyebrow: 'Contractor Browser',
		subtitle: 'Live HTML browser host for the contractor dashboard, matched leads, project detail, and lead activity.',
		status: model.profileSource === 'live' ? 'Live contractor data connected' : 'Sample contractor data mode',
		sessionBadge: model.profileSource === 'live'
			? { label: 'Live Session Active', tone: 'live' }
			: { label: 'Sample Session Only', tone: 'sample' },
		notice: model.notice,
		warning: model.projectsWarning,
		nav: [
			{ href: '/', label: 'Dashboard' },
			{ href: '/?section=leads', label: 'Matched Leads' },
			{ href: '/?section=history', label: 'Lead History' }
		],
		sections: [
			renderDemoOperatorSection(),
			renderVerifiedFieldsSection(),
			renderSection('Dashboard Snapshot', renderStats([
				{ label: 'Completed Jobs', value: profile.completedJobs },
				{ label: 'Active Quotes', value: profile.activeQuotes },
				{ label: 'Open Leads', value: model.projects.length },
				{ label: 'Response Time', value: profile.responseTime }
			]), `${profile.trade} · ${profile.tier} tier · ${profile.rating} rating`),
			renderSection('Contractor Profile', renderKeyValueTable([
				{ label: 'Professional ID', value: profile.professionalId },
				{ label: 'Name', value: profile.name },
				{ label: 'Trade', value: profile.trade },
				{ label: 'Tier', value: profile.tier }
			]) + `
				<div class="form-grid">
					<div class="form-card">
						<h3>Contractor Sign In</h3>
						<form method="post" action="/actions/login">
							<input type="text" name="identifier" placeholder="contractor@example.com or +27710000001" required>
							<input type="password" name="password" placeholder="password123" required>
							<button type="submit">Sign In</button>
						</form>
						<form method="post" action="/actions/logout" class="inline-form">
							<button type="submit" class="secondary">Logout</button>
						</form>
					</div>
					<div class="form-card">
						<h3>WhatsApp Subscription</h3>
						<form method="post" action="/actions/subscribe-whatsapp">
							<input type="tel" name="phoneNumber" placeholder="+27710000001" required>
							<button type="submit">Subscribe Mobile Number</button>
						</form>
					</div>
				</div>`),
			renderSection('Matched Leads', renderCards(model.projects.map((project) => ({
				title: project.title,
				meta: `${project.trade} · ${project.location} · ${project.budget}`,
				body: project.description,
				footer: `${project.urgency} · ${project.matchScore}% match · ${project.source}`,
				actionHref: `/?projectId=${encodeURIComponent(project.id)}`,
				actionLabel: 'Open lead detail'
			}))), 'Select any lead to inspect its detail panel.'),
			renderSection('Selected Lead Detail', selectedProject ? [
				renderKeyValueTable([
					{ label: 'Title', value: selectedProject.title },
					{ label: 'Trade', value: selectedProject.trade },
					{ label: 'Location', value: selectedProject.location },
					{ label: 'Budget', value: selectedProject.budget },
					{ label: 'Urgency', value: selectedProject.urgency },
					{ label: 'Lead Type', value: selectedProject.leadType }
				]),
				`<p>${selectedProject.description}</p>`,
				renderPills(selectedProject.requirements || []),
				'<p class="footer">The browser host can now post interest, quotes, and homeowner messages through the same service layer.</p>',
				`<div class="form-grid">
					<div class="form-card">
						<h3>Express Interest</h3>
						<form method="post" action="/actions/interest">
							<input type="hidden" name="projectId" value="${selectedProject.id}">
							<button type="submit">Send Interest</button>
						</form>
					</div>
					<div class="form-card">
						<h3>Submit Quote</h3>
						<form method="post" action="/actions/quote">
							<input type="hidden" name="projectId" value="${selectedProject.id}">
							<input type="text" name="amount" placeholder="R12,500" required>
							<input type="text" name="timeline" placeholder="3 working days">
							<textarea name="note" placeholder="Brief note for the homeowner"></textarea>
							<button type="submit">Review Quote</button>
						</form>
					</div>
					<div class="form-card">
						<h3>Send Homeowner Message</h3>
						<form method="post" action="/actions/message">
							<input type="hidden" name="projectId" value="${selectedProject.id}">
							<textarea name="body" placeholder="I can inspect this tomorrow morning." required></textarea>
							<button type="submit">Preview Message</button>
						</form>
					</div>
				</div>`
			].join('') : '<p class="muted">No lead selected.</p>'),
			renderPendingAction(model),
			renderSection('Lead History', renderCards(model.history.map((item) => ({
				title: `${String(item.type || '').toUpperCase()} · ${item.jobTitle}`,
				meta: `${item.createdAt} · ${item.status}`,
				body: item.summary,
				footer: `Source: ${item.source}`
			}))), 'Quotes, interest, and messages recorded by the contractor workflow.')
		]
	});
}

async function handlePost(requestUrl, form) {
	const url = new URL(requestUrl, 'http://127.0.0.1');
	if (url.pathname === '/actions/login') {
		await contractorData.loginContractor({ identifier: form.identifier, password: form.password });
		return '/?notice=' + encodeURIComponent('Contractor sign-in completed. Live data will load when the API server is available.');
	}
	if (url.pathname === '/actions/logout') {
		await contractorData.logoutContractor();
		return '/?notice=' + encodeURIComponent('Contractor session cleared.');
	}
	if (url.pathname === '/actions/subscribe-whatsapp') {
		const result = await contractorData.subscribeContractorWhatsapp(form.phoneNumber);
		return '/?notice=' + encodeURIComponent(result.warning || result.item.nextStep || `Subscribed ${form.phoneNumber}.`);
	}
	if (url.pathname === '/actions/interest') {
		const result = await contractorData.expressInterest(form.projectId);
		return '/?projectId=' + encodeURIComponent(form.projectId) + '&notice=' + encodeURIComponent(`Interest recorded (${result.source}).`);
	}
	if (url.pathname === '/actions/quote') {
		if (String(form.confirm || '').toLowerCase() !== 'yes') {
			return '/?projectId=' + encodeURIComponent(form.projectId) + '&pendingAction=quote&amount=' + encodeURIComponent(form.amount || '') + '&timeline=' + encodeURIComponent(form.timeline || '') + '&note=' + encodeURIComponent(form.note || '');
		}
		const result = await contractorData.submitQuote(form.projectId, {
			amount: form.amount,
			timeline: form.timeline,
			note: form.note
		});
		return '/?projectId=' + encodeURIComponent(form.projectId) + '&notice=' + encodeURIComponent(`Quote recorded: ${result.summary}`);
	}
	if (url.pathname === '/actions/message') {
		if (String(form.confirm || '').toLowerCase() !== 'yes') {
			return '/?projectId=' + encodeURIComponent(form.projectId) + '&pendingAction=message&body=' + encodeURIComponent(form.body || '');
		}
		const result = await contractorData.sendMessage(form.projectId, { body: form.body });
		return '/?projectId=' + encodeURIComponent(form.projectId) + '&notice=' + encodeURIComponent(`Message recorded: ${result.summary}`);
	}
	return '/?warning=' + encodeURIComponent('Unsupported contractor browser action.');
}

function createServer() {
	return createHtmlServer({ loadModel, renderModel, handlePost });
}

if (require.main === module) {
	const port = Number(process.env.PORT || 3000);
	console.log('Contractor browser host starting on port', port);
	createServer().listen(port, () => console.log('Listening on', port));
}

module.exports = { createServer, loadModel, renderModel };
