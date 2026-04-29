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
const customerData = require('./src/services/customerData');

async function loadModel(requestUrl) {
	const url = new URL(requestUrl, 'http://127.0.0.1');
	const professionalId = url.searchParams.get('professionalId');
	const notice = url.searchParams.get('notice');
	const warning = url.searchParams.get('warning');
	const pendingRequest = url.searchParams.get('pendingRequest') === 'yes';
	const overview = await customerData.fetchCustomerOverview();
	const professionals = overview.professionals || [];
	const selectedProfessionalId = professionalId || (professionals[0] && professionals[0].id) || null;
	const professionalDetail = selectedProfessionalId
		? await customerData.fetchCustomerProfessionalDetail(selectedProfessionalId)
		: { item: null, warning: null };
	const shortlistIds = await customerData.getCustomerProfessionalShortlist();
	const contactRequest = professionalDetail.item
		? customerData.buildCustomerContactRequest(professionalDetail.item)
		: null;

	return {
		notice,
		overview,
		shortlistIds,
		professionalDetail: professionalDetail.item,
		professionalWarning: warning || professionalDetail.warning,
		contactRequest,
		pendingRequest: pendingRequest ? {
			title: url.searchParams.get('title') || '',
			trade: url.searchParams.get('trade') || '',
			location: url.searchParams.get('location') || '',
			budget: url.searchParams.get('budget') || '',
			urgency: url.searchParams.get('urgency') || '',
			description: url.searchParams.get('description') || ''
		} : null
	};
}

function renderPendingRequest(model) {
	if (!model.pendingRequest) {
		return '';
	}

	return renderSection('Review Job Request', renderKeyValueTable([
		{ label: 'Title', value: model.pendingRequest.title || 'Untitled request' },
		{ label: 'Trade', value: model.pendingRequest.trade || 'Trade pending' },
		{ label: 'Location', value: model.pendingRequest.location || 'Location pending' },
		{ label: 'Budget', value: model.pendingRequest.budget || 'Budget pending' },
		{ label: 'Urgency', value: model.pendingRequest.urgency || 'Urgency pending' },
		{ label: 'Description', value: model.pendingRequest.description || 'No description provided' }
	]) + `
		<div class="form-grid">
			<div class="form-card">
				<h3>Confirm Request</h3>
				<form method="post" action="/actions/request-job">
					<input type="hidden" name="confirm" value="yes">
					<input type="text" name="title" value="${model.pendingRequest.title}" hidden>
					<input type="text" name="trade" value="${model.pendingRequest.trade}" hidden>
					<input type="text" name="location" value="${model.pendingRequest.location}" hidden>
					<input type="text" name="budget" value="${model.pendingRequest.budget}" hidden>
					<input type="text" name="urgency" value="${model.pendingRequest.urgency}" hidden>
					<textarea name="description" hidden>${model.pendingRequest.description}</textarea>
					<button type="submit">Submit Confirmed Request</button>
				</form>
			</div>
			<div class="form-card">
				<h3>Edit Request</h3>
				<form method="get" action="/">
					<button type="submit" class="secondary">Back to Request Form</button>
				</form>
			</div>
		</div>`, 'Review the prepared request before submitting it to the customer workflow.');
}

function renderDemoOperatorSection() {
	return renderSection('TFSSA Live Demo Scope', `
		<div class="form-grid">
			<div class="form-card">
				<h3>Live System Fields</h3>
				<p class="muted">These sections refresh from the live API when the customer demo session is authenticated.</p>
				${renderPills([
					'Customer Snapshot',
					'Open Jobs',
					'Professional Directory',
					'Selected Professional',
					'Prepared Contact Request'
				])}
			</div>
			<div class="form-card">
				<h3>Presenter Editable During Demo</h3>
				<p class="muted">These are the fields the presenter can change live from this browser host.</p>
				${renderPills([
					'Customer sign-in email',
					'Customer password',
					'Shortlist toggle',
					'Job request title',
					'Job request trade',
					'Job request location',
					'Job request budget',
					'Job request urgency',
					'Job request description'
				])}
				<p class="muted">Shortlist changes now persist through the live API when authenticated. Job request submission also uses the live API.</p>
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
					'Customer sign-in',
					'Shortlist add and remove',
					'Job request title',
					'Job request trade',
					'Job request location',
					'Job request budget',
					'Job request urgency',
					'Job request description'
				])}
			</div>
			<div class="form-card">
				<h3>Presenter Sequence</h3>
				<p class="muted">Recommended TFSSA order: sign in, shortlist a professional, remove the shortlist, then create and confirm a job request using edited request details.</p>
			</div>
		</div>
	`, 'This panel is read-only rehearsal guidance based on the latest live verification run.');
}

function renderModel(model) {
	const overview = model.overview;
	const jobs = overview.jobs || [];
	const professionals = overview.professionals || [];
	const selectedProfessional = model.professionalDetail;
	const shortlistedIds = new Set(model.shortlistIds || []);
	const selectedProfessionalShortlisted = selectedProfessional ? shortlistedIds.has(selectedProfessional.id) : false;
	const user = overview.user || { firstName: 'Customer', lastName: '', email: 'client@example.com' };

	return renderShell({
		title: `${[user.firstName, user.lastName].filter(Boolean).join(' ') || user.email} Browser Workspace`,
		eyebrow: 'Customer Browser',
		subtitle: 'Live HTML browser host for job requests, professional discovery, and customer-to-professional contact preparation.',
		status: overview.source === 'live' ? 'Live customer data connected' : 'Sample customer data mode',
		sessionBadge: overview.source === 'live'
			? { label: 'Live Session Active', tone: 'live' }
			: { label: 'Sample Session Only', tone: 'sample' },
		notice: model.notice,
		warning: overview.warning || model.professionalWarning || null,
		nav: [
			{ href: '/', label: 'Overview' },
			{ href: '/?section=professionals', label: 'Professionals' },
			{ href: '/?section=request', label: 'Request Flow' }
		],
		sections: [
			renderDemoOperatorSection(),
			renderVerifiedFieldsSection(),
			renderSection('Customer Snapshot', renderStats([
				{ label: 'Open Jobs', value: jobs.length },
				{ label: 'Visible Professionals', value: professionals.length },
				{ label: 'User Role', value: user.role || 'client' },
				{ label: 'Data Source', value: overview.source }
			]) + `
				<div class="form-grid">
					<div class="form-card">
						<h3>Customer Sign In</h3>
						<form method="post" action="/actions/login">
							<input type="email" name="email" placeholder="client@example.com" required>
							<input type="password" name="password" placeholder="password123" required>
							<button type="submit">Sign In</button>
						</form>
						<form method="post" action="/actions/logout" class="inline-form">
							<button type="submit" class="secondary">Logout</button>
						</form>
					</div>
				</div>`, user.email),
			renderSection('Open Jobs', renderCards(jobs.map((job) => ({
				title: job.title,
				meta: `${job.trade} · ${job.location || 'Location TBC'} · ${job.budget || 'Budget TBC'}`,
				body: job.description,
				footer: job.urgency || job.status
			})))),
			renderSection('Professional Directory', renderCards(professionals.map((professional) => ({
				title: professional.name,
				meta: `${professional.trade} · ${professional.tier} · ${professional.rating || 'N/A'} rating`,
				footer: shortlistedIds.has(professional.id) ? 'Shortlisted in live customer session' : 'Browser detail view enabled',
				actionHref: `/?professionalId=${encodeURIComponent(professional.id)}`,
				actionLabel: 'Open profile'
			}))), 'Select a professional to view credentials and prefill the contact flow.'),
			renderSection('Selected Professional', selectedProfessional ? [
				renderKeyValueTable([
					{ label: 'Name', value: selectedProfessional.name },
					{ label: 'Trade', value: selectedProfessional.trade },
					{ label: 'Tier', value: selectedProfessional.tier },
					{ label: 'Response Time', value: selectedProfessional.responseTime || 'N/A' },
					{ label: 'Service Area', value: selectedProfessional.serviceArea || 'N/A' },
					{ label: 'Availability', value: selectedProfessional.availability || 'N/A' }
				]),
				`<p>${selectedProfessional.summary || 'No summary available.'}</p>`,
				renderPills(selectedProfessional.credentials || []),
				renderCards((selectedProfessional.reviewHighlights || []).map((item) => ({ title: 'Review Highlight', body: item }))),
				`<div class="form-grid">
					<div class="form-card">
						<h3>Shortlist Professional</h3>
						<p class="muted">Current state: ${selectedProfessionalShortlisted ? 'Shortlisted in live session' : 'Not shortlisted'}</p>
						<form method="post" action="/actions/shortlist">
							<input type="hidden" name="professionalId" value="${selectedProfessional.id}">
							<button type="submit">${selectedProfessionalShortlisted ? 'Remove From Shortlist' : 'Add To Shortlist'}</button>
						</form>
					</div>
				</div>`
			].join('') : '<p class="muted">No professional selected.</p>'),
			renderSection('Prepared Contact Request', (model.contactRequest ? renderKeyValueTable([
				{ label: 'Title', value: model.contactRequest.title },
				{ label: 'Trade', value: model.contactRequest.trade },
				{ label: 'Location', value: model.contactRequest.location || 'TBC' },
				{ label: 'Urgency', value: model.contactRequest.urgency || 'TBC' },
				{ label: 'Description', value: model.contactRequest.description }
			]) : '<p class="muted">Select a professional to prepare the contact request flow.</p>') + `
				<div class="form-grid">
					<div class="form-card">
						<h3>Submit Job Request</h3>
						<form method="post" action="/actions/request-job">
							<input type="text" name="title" value="${model.contactRequest ? model.contactRequest.title : ''}" placeholder="Job title" required>
							<input type="text" name="trade" value="${model.contactRequest ? model.contactRequest.trade : ''}" placeholder="Trade" required>
							<input type="text" name="location" value="${model.contactRequest ? model.contactRequest.location : ''}" placeholder="Location">
							<input type="text" name="budget" placeholder="Budget range">
							<input type="text" name="urgency" value="${model.contactRequest ? model.contactRequest.urgency : ''}" placeholder="Urgency">
							<textarea name="description" placeholder="Describe the work" required>${model.contactRequest ? model.contactRequest.description : ''}</textarea>
							<button type="submit">Review Request</button>
						</form>
					</div>
				</div>`, 'This mirrors the in-app “Contact Through Request Flow” action.'),
			renderPendingRequest(model)
		]
	});
}

async function handlePost(requestUrl, form) {
	const url = new URL(requestUrl, 'http://127.0.0.1');
	if (url.pathname === '/actions/login') {
		await customerData.loginCustomer({ email: form.email, password: form.password });
		return '/?notice=' + encodeURIComponent('Customer sign-in completed.');
	}
	if (url.pathname === '/actions/logout') {
		await customerData.logoutCustomer();
		return '/?notice=' + encodeURIComponent('Customer session cleared.');
	}
	if (url.pathname === '/actions/shortlist') {
		const result = await customerData.toggleCustomerProfessionalShortlist(form.professionalId);
		const message = result.warning || (result.shortlisted ? 'Professional added to shortlist.' : 'Professional removed from shortlist.');
		return '/?professionalId=' + encodeURIComponent(form.professionalId) + '&notice=' + encodeURIComponent(message);
	}
	if (url.pathname === '/actions/request-job') {
		if (String(form.confirm || '').toLowerCase() !== 'yes') {
			return '/?pendingRequest=yes'
				+ '&title=' + encodeURIComponent(form.title || '')
				+ '&trade=' + encodeURIComponent(form.trade || '')
				+ '&location=' + encodeURIComponent(form.location || '')
				+ '&budget=' + encodeURIComponent(form.budget || '')
				+ '&urgency=' + encodeURIComponent(form.urgency || '')
				+ '&description=' + encodeURIComponent(form.description || '');
		}
		const result = await customerData.createCustomerJobRequest({
			title: form.title,
			trade: form.trade,
			location: form.location,
			budget: form.budget,
			urgency: form.urgency,
			description: form.description
		});
		return '/?notice=' + encodeURIComponent(result.warning || 'Customer job request submitted.');
	}
	return '/?warning=' + encodeURIComponent('Unsupported customer browser action.');
}

function createServer() {
	return createHtmlServer({ loadModel, renderModel, handlePost });
}

if (require.main === module) {
	const port = Number(process.env.PORT || 3000);
	console.log('Customer browser host starting on port', port);
	createServer().listen(port, () => console.log('Listening on', port));
}

module.exports = { createServer, loadModel, renderModel };
