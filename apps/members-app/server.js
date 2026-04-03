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
const { createMembersApp } = require('../../packages/members-app/src');
const { signToken } = require('../../packages/shared-auth/src');

const ASSOCIATION_ACTION_OPTIONS = {
	'member-review': 'Member review queued',
	'trade-outreach': 'Trade outreach queued'
};

const PROFESSIONAL_ACTION_OPTIONS = {
	'availability-check-in': 'Availability check-in recorded',
	'tier-review-request': 'Tier review requested'
};

const SAMPLE_OVERVIEW = {
	totals: { openJobs: 4, inProgressJobs: 2, completedJobs: 13, professionals: 9 },
	openJobsByTrade: { plumber: 2, electrician: 1, builder: 1 },
	professionalsByTrade: { plumber: 3, builder: 2, electrician: 2, roofer: 2 }
};

const SAMPLE_PROFESSIONALS = [
	{ id: 'pro-001', name: 'John Smit', trade: 'plumber', tier: 'PREMIUM', rating: 4.8 },
	{ id: 'pro-002', name: 'Sarah Khubone', trade: 'builder', tier: 'TRUSTED', rating: 4.6 },
	{ id: 'pro-003', name: 'Naledi Khumalo', trade: 'general contractor', tier: 'TRUSTED', rating: 4.7 }
];

function createApp() {
	return createMembersApp({
		baseURL: process.env.TFX_API_BASE_URL || 'http://localhost:5005',
		getToken: async () => signToken({ sub: 'members-browser', associationId: 'assoc-members-demo', role: 'association' }),
		context: {
			associationId: 'assoc-members-demo',
			platform: 'browser',
			appVersion: '0.0.1-browser'
		}
	});
}

async function loadModel(requestUrl) {
	const url = new URL(requestUrl, 'http://127.0.0.1');
	const professionalId = url.searchParams.get('professionalId');

	try {
		const app = createApp();
		const [overview, professionals] = await Promise.all([
			app.association.getOverview(),
			app.professionals.browse({})
		]);
		const selectedProfessional = await app.professionals.getProfile(professionalId || ((professionals[0] && professionals[0].id) || ''));
		const selectedProfessionalActions = selectedProfessional
			? await app.association.listOperationalActions(selectedProfessional.id)
			: [];
		const professionalRequests = selectedProfessional
			? await app.professionals.listOperationalRequests(selectedProfessional.id)
			: [];
		return {
			source: 'live',
			warning: null,
			overview,
			professionals,
			selectedProfessional,
			selectedProfessionalActions,
			professionalRequests
		};
	} catch (error) {
		return {
			source: 'sample',
			warning: 'Unable to reach the members API. Showing association and professional sample data.',
			overview: SAMPLE_OVERVIEW,
			professionals: SAMPLE_PROFESSIONALS,
			selectedProfessional: SAMPLE_PROFESSIONALS.find((item) => item.id === professionalId) || SAMPLE_PROFESSIONALS[0],
			selectedProfessionalActions: [],
			professionalRequests: []
		};
	}
}

function renderModel(model) {
	return renderShell({
		title: 'Members Browser Workspace',
		eyebrow: 'Association And Professional Browser',
		subtitle: 'Browser host for the Association overview and the Professional directory/detail surface introduced in the members workspace.',
		status: model.source === 'live' ? 'Live members data connected' : 'Sample members data mode',
		warning: model.warning,
		nav: [
			{ href: '/', label: 'Association Overview' },
			{ href: '/?section=professional', label: 'Professional Directory' }
		],
		sections: [
			renderSection('Association Overview', renderStats([
				{ label: 'Open Jobs', value: model.overview.totals.openJobs || 0 },
				{ label: 'In Progress', value: model.overview.totals.inProgressJobs || 0 },
				{ label: 'Completed', value: model.overview.totals.completedJobs || 0 },
				{ label: 'Professionals', value: model.overview.totals.professionals || 0 }
			]), 'Association-facing supply and demand summary.'),
			renderSection('Association Distribution', [
				'<p class="muted">Open jobs by trade</p>',
				renderPills(Object.entries(model.overview.openJobsByTrade || {}).map(([trade, count]) => `${trade}: ${count}`)),
				'<p class="muted">Professionals by trade</p>',
				renderPills(Object.entries(model.overview.professionalsByTrade || {}).map(([trade, count]) => `${trade}: ${count}`))
			].join('')),
			renderSection('Professional Directory', renderCards((model.professionals || []).map((professional) => ({
				title: professional.name,
				meta: `${professional.trade} · ${professional.tier || 'Tier pending'} · ${professional.rating || 'N/A'} rating`,
				actionHref: `/?professionalId=${encodeURIComponent(professional.id)}`,
				actionLabel: 'Open professional'
			}))), 'Professional-facing browser visibility now exists as a dedicated members surface.'),
			renderSection('Selected Professional', model.selectedProfessional ? renderKeyValueTable([
				{ label: 'ID', value: model.selectedProfessional.id },
				{ label: 'Name', value: model.selectedProfessional.name },
				{ label: 'Trade', value: model.selectedProfessional.trade },
				{ label: 'Tier', value: model.selectedProfessional.tier || 'ONBOARDED' },
				{ label: 'Rating', value: model.selectedProfessional.rating || 'N/A' }
			]) + `
				<div class="form-grid">
					<div class="form-card">
						<h3>Association Action</h3>
						<form method="post" action="/actions/association-action">
							<input type="hidden" name="professionalId" value="${model.selectedProfessional.id}">
							<select name="actionType">
								<option value="member-review">Member review</option>
								<option value="trade-outreach">Trade outreach</option>
							</select>
							<button type="submit">Queue Association Action</button>
						</form>
					</div>
					<div class="form-card">
						<h3>Professional Action</h3>
						<form method="post" action="/actions/professional-action">
							<input type="hidden" name="professionalId" value="${model.selectedProfessional.id}">
							<select name="actionType">
								<option value="availability-check-in">Availability check-in</option>
								<option value="tier-review-request">Tier review request</option>
							</select>
							<button type="submit">Record Professional Action</button>
						</form>
					</div>
				</div>` + renderSection('Association Action History', renderCards((model.selectedProfessionalActions || []).map((item) => ({
				title: item.summary,
				meta: `${item.actionType} · ${item.createdAt || 'Recently'}`,
				body: item.note || 'No note recorded.',
				footer: `Source: ${item.source || 'live'}`
			}))), 'Queued member-review and trade-outreach actions.') + renderSection('Professional Request History', renderCards((model.professionalRequests || []).map((item) => ({
				title: item.summary,
				meta: `${item.actionType} · ${item.createdAt || 'Recently'}`,
				body: item.note || 'No note recorded.',
				footer: `Source: ${item.source || 'live'}`
			}))), 'Availability and tier-review requests recorded by the professional workflow.') : '<p class="muted">No professional selected.</p>', 'This surface verifies the Professional role separately from Contractor and Customer flows and now exposes operational actions across browser and mobile-style surfaces.')
		]
	});
}

async function handlePost(requestUrl, form) {
	const url = new URL(requestUrl, 'http://127.0.0.1');
	const app = createApp();
	if (url.pathname === '/actions/association-action') {
		const item = await app.association.runOperationalAction(form.professionalId, form.actionType, { summary: ASSOCIATION_ACTION_OPTIONS[form.actionType] });
		return '/?professionalId=' + encodeURIComponent(form.professionalId) + '&notice=' + encodeURIComponent(item.summary || 'Association action recorded.');
	}
	if (url.pathname === '/actions/professional-action') {
		const item = await app.professionals.submitOperationalRequest(form.actionType, { summary: PROFESSIONAL_ACTION_OPTIONS[form.actionType] }, form.professionalId);
		return '/?professionalId=' + encodeURIComponent(form.professionalId) + '&notice=' + encodeURIComponent(item.summary || 'Professional action recorded.');
	}
	return '/?warning=' + encodeURIComponent('Unsupported members browser action.');
}

function createServer() {
	return createHtmlServer({ loadModel, renderModel, handlePost });
}

if (require.main === module) {
	const port = Number(process.env.PORT || 3000);
	console.log('Members browser host starting on port', port);
	createServer().listen(port, () => console.log('Listening on', port));
}

module.exports = { createServer, loadModel, renderModel };
