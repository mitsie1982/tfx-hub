const HUMAN_FACING_DEMO_SEED = {
  professionals: {
    directory: [
      {
        id: 'pro-003',
        name: 'Theuns Fraser',
        trade: 'general contractor',
        tier: 'TRUSTED',
        rating: 4.9,
        completedJobs: 128,
        responseTime: '8 min',
        serviceArea: 'Johannesburg North and Midrand',
        availability: 'Available for demo callbacks today',
        summary: 'Theuns Fraser leads residential upgrade work with a focus on plumbing coordination, small renovations, and fast homeowner updates.',
        credentials: ['Background checked', 'Insurance verified', 'Demo-ready references'],
        portfolioHighlights: ['Managed bathroom refresh with same-week completion', 'Coordinated leak repair and waterproofing follow-up', 'Delivered homeowner updates with before-and-after photos'],
        reviewHighlights: ['Clear communication from first visit to handover.', 'Handled follow-up items quickly and professionally.']
      },
      {
        id: 'pro-001',
        name: 'John Smit',
        trade: 'plumber',
        tier: 'PREMIUM',
        rating: 4.8,
        completedJobs: 247,
        responseTime: '9 min',
        serviceArea: 'Johannesburg North',
        availability: 'Available this afternoon',
        summary: 'John Smit specializes in residential plumbing repairs, leak detection, and bathroom upgrades.',
        credentials: ['NHBRC registered', 'PIRB compliant', 'Background checked'],
        portfolioHighlights: ['Rebuilt guest bathroom plumbing line', 'Completed leak tracing for townhouse complex', 'Installed pressure-balancing shower mixers'],
        reviewHighlights: ['Arrived on time and explained the repair clearly.', 'Left the site clean and shared photo updates before departure.']
      },
      {
        id: 'pro-002',
        name: 'Sarah Khubone',
        trade: 'builder',
        tier: 'TRUSTED',
        rating: 4.6,
        completedJobs: 81,
        responseTime: '18 min',
        serviceArea: 'Midrand and Centurion',
        availability: 'Next site opening in 2 days',
        summary: 'Sarah Khubone handles boundary walls, extensions, and general building projects for homeowners.',
        credentials: ['MBSA member', 'Safety file ready', 'References verified'],
        portfolioHighlights: ['Completed 8m boundary wall extension', 'Managed small garage conversion', 'Delivered paving and plaster finish bundle'],
        reviewHighlights: ['Kept the project on schedule and communicated material delays early.', 'Quality of plaster finish was better than expected.']
      },
      {
        id: 'pro-101',
        name: 'Lerato Ndlovu',
        trade: 'electrician',
        tier: 'VERIFIED',
        rating: 4.6,
        completedJobs: 54,
        responseTime: '14 min',
        serviceArea: 'Sandton and Randburg',
        availability: 'Inspection slot open tomorrow morning',
        summary: 'Lerato Ndlovu covers residential electrical tidy-ups, lighting upgrades, and compliance-ready handovers.',
        credentials: ['Wireman registered', 'COC-ready documentation', 'Background checked'],
        portfolioHighlights: ['Completed garage conversion lighting package', 'Reworked distribution board labelling and balancing', 'Delivered snag-list closeout before occupancy'],
        reviewHighlights: ['Explained each safety item clearly before starting.', 'Fast turnaround with tidy workmanship and handover notes.']
      }
    ]
  },
  contractor: {
    profile: {
      professionalId: 'pro-003',
      name: 'Theuns Fraser',
      trade: 'general contractor',
      tier: 'TRUSTED',
      rating: 4.9,
      completedJobs: 128,
      activeQuotes: 7,
      responseTime: '8 min'
    },
    leads: [
      {
        id: 'job-001',
        title: 'Kitchen plumbing and leak repair',
        trade: 'Plumbing',
        location: 'Midrand',
        budget: 'R4,000 - R8,500',
        urgency: 'Urgent',
        posted: '15 min ago',
        description: 'Homeowner needs a contractor to repair a sink leak, replace two shutoff valves, and test water pressure before the weekend.',
        requirements: ['Own transport', 'Can start today', 'Photo updates required'],
        leadType: 'Verified homeowner',
        matchScore: 93,
        status: 'OPEN',
        source: 'sample'
      },
      {
        id: 'job-002',
        title: 'Boundary wall extension and gate footing',
        trade: 'Builder',
        location: 'Centurion',
        budget: 'R15,000 - R28,000',
        urgency: 'This week',
        posted: '42 min ago',
        description: 'Michelle needs a boundary wall extension with a new gate footing before guests arrive next week.',
        requirements: ['Foundation prep included', 'Site inspection first', 'Progress photo updates'],
        leadType: 'Repeat customer',
        matchScore: 81,
        status: 'OPEN',
        source: 'sample'
      },
      {
        id: 'job-003',
        title: 'Garage conversion electrical tidy-up',
        trade: 'Electrical',
        location: 'Randburg',
        budget: 'R9,500 - R16,000',
        urgency: 'Flexible',
        posted: '1 hour ago',
        description: 'Homeowner needs a contractor to coordinate lighting, sockets, and a final snag list before a family event.',
        requirements: ['Inspection summary required', 'Family home access window', 'Compliance-ready finish'],
        leadType: 'Verified homeowner',
        matchScore: 77,
        status: 'OPEN',
        source: 'sample'
      },
      {
        id: 'job-004',
        title: 'Roof waterproofing and ceiling patch repair',
        trade: 'Roofing',
        location: 'Sandton',
        budget: 'R12,000 - R19,000',
        urgency: 'Urgent',
        posted: '2 hours ago',
        description: 'Customer needs a contractor to inspect a leak path, reseal the roof section, and patch interior ceiling damage.',
        requirements: ['Leak-path photos', 'Weekend follow-up possible', 'Written workmanship guarantee'],
        leadType: 'Repeat customer',
        matchScore: 83,
        status: 'OPEN',
        source: 'sample'
      }
    ],
    history: [
      {
        id: 'event-001',
        jobId: 'job-001',
        jobTitle: 'Kitchen plumbing and leak repair',
        type: 'interest',
        summary: 'Interest sent to homeowner',
        createdAt: '2026-04-02T10:00:00.000Z',
        status: 'sent',
        source: 'sample'
      },
      {
        id: 'event-002',
        jobId: 'job-002',
        jobTitle: 'Boundary wall extension and gate footing',
        type: 'quote',
        summary: 'Quote R18,500 · 4 working days',
        createdAt: '2026-04-02T11:20:00.000Z',
        status: 'sent',
        source: 'sample'
      },
      {
        id: 'event-003',
        jobId: 'job-004',
        jobTitle: 'Roof waterproofing and ceiling patch repair',
        type: 'message',
        summary: 'I can inspect the leak path this afternoon and confirm the full repair scope.',
        createdAt: '2026-04-02T14:05:00.000Z',
        status: 'sent',
        source: 'sample'
      }
    ]
  },
  customer: {
    user: {
      id: 'client-001',
      firstName: 'Michelle',
      lastName: 'Brummer',
      email: 'client@example.com',
      role: 'client'
    },
    jobs: [
      {
        id: 'job-201',
        title: 'Bathroom plumbing repair',
        trade: 'plumber',
        location: 'Sandton',
        budget: 'R2,500 - R5,000',
        urgency: 'Urgent',
        description: 'Repair a leaking shower mixer and replace two broken taps.',
        status: 'OPEN'
      },
      {
        id: 'job-202',
        title: 'Boundary wall extension and gate footing',
        trade: 'builder',
        location: 'Midrand',
        budget: 'R15,000 - R28,000',
        urgency: 'This week',
        description: 'Extend the existing wall, add a gate footing, and finish the plaster neatly.',
        status: 'OPEN'
      },
      {
        id: 'job-203',
        title: 'Roof waterproofing and ceiling patch repair',
        trade: 'roofer',
        location: 'Sandton',
        budget: 'R12,000 - R19,000',
        urgency: 'Urgent',
        description: 'Inspect the leak path, reseal the roof section, and repair the ceiling patch inside.',
        status: 'OPEN'
      }
    ]
  },
  admin: {
    overview: {
      totals: { openJobs: 6, inProgressJobs: 3, completedJobs: 12, cancelledJobs: 1, professionals: 24 },
      professionalsByTier: { PREMIUM: 5, VERIFIED: 6, TRUSTED: 9, ONBOARDED: 4 },
      openJobsByTrade: { plumber: 2, builder: 2, electrician: 1, roofer: 1 },
      recentOpenJobs: [
        { id: 'job-301', title: 'Kitchen leak repair', trade: 'plumber' },
        { id: 'job-302', title: 'Boundary wall extension', trade: 'builder' }
      ],
      totalJobsTracked: 22
    },
    contractors: [
      { id: 'pro-003', name: 'Theuns Fraser', trade: 'general contractor', tier: 'TRUSTED', rating: 4.9 },
      { id: 'pro-001', name: 'John Smit', trade: 'plumber', tier: 'PREMIUM', rating: 4.8 }
    ],
    contractorDetails: {
      'pro-001': {
        id: 'pro-001',
        name: 'John Smit',
        trade: 'plumber',
        tier: 'PREMIUM',
        rating: 4.8,
        completedJobs: 247,
        responseTime: '9 min',
        activeQuotes: 11,
        summary: 'High-volume plumbing contractor with strong response times and premium tier performance.',
        tierReview: { status: 'Eligible for retention review', reason: 'Premium performance sustained for 90 days', recommendedAction: 'Queue for monthly tier audit' },
        compliance: { status: 'Healthy', lastCheck: '2026-03-29', notes: ['No recent violations', 'Credential renewal due in 42 days'] },
        disputes: [{ id: 'disp-101', status: 'Resolved', summary: 'Minor callout timing dispute closed within SLA' }],
        adminActions: [{ id: 'admin-action-sample-001', actionType: 'tier-review', summary: 'Tier review queued', note: 'Monthly premium retention check', createdBy: 'admin-sample', createdAt: '2026-04-02T08:00:00.000Z', source: 'sample' }]
      },
      'pro-003': {
        id: 'pro-003',
        name: 'Theuns Fraser',
        trade: 'general contractor',
        tier: 'TRUSTED',
        rating: 4.9,
        completedJobs: 128,
        responseTime: '8 min',
        activeQuotes: 7,
        summary: 'Trusted general contractor with high lead velocity, strong close rates, and reliable demo-ready history.',
        tierReview: { status: 'Ready for verified review', reason: 'Completed jobs and rating exceed the VERIFIED threshold', recommendedAction: 'Prepare promotion review with updated credentials' },
        compliance: { status: 'Healthy', lastCheck: '2026-04-02', notes: ['Credential set verified', 'No active warnings'] },
        disputes: [{ id: 'disp-102', status: 'Resolved', summary: 'Variation-order clarification closed within mediation SLA' }],
        adminActions: [{ id: 'admin-action-sample-002', actionType: 'compliance-review', summary: 'Compliance review opened', note: 'Quarterly demo account verification complete', createdBy: 'admin-sample', createdAt: '2026-04-02T09:15:00.000Z', source: 'sample' }]
      }
    },
    accounts: [
      { id: 'admin-001', email: 'admin@example.com', username: 'local-admin-secret', firstName: 'Platform', lastName: 'Admin', role: 'admin', isBootstrapAdmin: true, createdAt: '2026-04-02T07:00:00.000Z' },
      { id: 'admin-ops-001', email: 'ops-admin@example.com', username: 'ops.admin', firstName: 'Ops', lastName: 'Admin', role: 'admin', isBootstrapAdmin: false, createdAt: '2026-04-02T08:30:00.000Z' }
    ],
    auditEvents: [
      { id: 'audit-001', adminUserId: 'admin-001', eventType: 'admin_login', outcome: 'success', reason: 'authenticated', identifier: 'local-admin-secret', requestPath: '/auth/login', requestMethod: 'POST', targetUserId: null, ipAddress: '127.0.0.1', createdAt: '2026-04-02T08:00:00.000Z' },
      { id: 'audit-002', adminUserId: 'admin-001', eventType: 'admin_password_reset_request', outcome: 'denied', reason: 'bootstrap_admin_reset_forbidden', identifier: 'admin@example.com', requestPath: '/auth/password-reset/request', requestMethod: 'POST', targetUserId: 'admin-001', ipAddress: '127.0.0.1', createdAt: '2026-04-02T08:05:00.000Z' },
      { id: 'audit-003', adminUserId: 'admin-001', eventType: 'admin_account_create', outcome: 'success', reason: 'created_admin_account', identifier: null, requestPath: '/admin/accounts', requestMethod: 'POST', targetUserId: 'admin-ops-001', ipAddress: '127.0.0.1', createdAt: '2026-04-02T08:30:00.000Z' }
    ]
  },
  members: {
    overview: {
      totals: { openJobs: 4, inProgressJobs: 2, completedJobs: 13, professionals: 4 },
      openJobsByTrade: { plumber: 1, electrician: 1, builder: 1, 'general contractor': 1 },
      professionalsByTrade: { plumber: 1, builder: 1, electrician: 1, 'general contractor': 1 }
    },
    professionals: [
      { id: 'pro-003', name: 'Theuns Fraser', trade: 'general contractor', tier: 'TRUSTED', rating: 4.9 },
      { id: 'pro-001', name: 'John Smit', trade: 'plumber', tier: 'PREMIUM', rating: 4.8 },
      { id: 'pro-002', name: 'Sarah Khubone', trade: 'builder', tier: 'TRUSTED', rating: 4.6 },
      { id: 'pro-101', name: 'Lerato Ndlovu', trade: 'electrician', tier: 'VERIFIED', rating: 4.6 }
    ],
    associationActions: {
      'pro-003': [
        { id: 'assoc-action-001', actionType: 'member-review', summary: 'Member review queued', note: 'Quarterly quality and responsiveness review opened for the demo account.', createdAt: '2026-04-02T09:40:00.000Z', source: 'sample' },
        { id: 'assoc-action-002', actionType: 'trade-outreach', summary: 'Trade outreach queued', note: 'Members workspace follow-up scheduled for a same-week availability window.', createdAt: '2026-04-02T10:10:00.000Z', source: 'sample' }
      ]
    },
    professionalRequests: {
      'pro-003': [
        { id: 'prof-request-001', actionType: 'availability-check-in', summary: 'Availability check-in recorded', note: 'Theuns confirmed a same-day callback slot for member referrals.', createdAt: '2026-04-02T10:20:00.000Z', source: 'sample' },
        { id: 'prof-request-002', actionType: 'tier-review-request', summary: 'Tier review requested', note: 'Professional asked for VERIFIED promotion review after recent completions.', createdAt: '2026-04-02T11:05:00.000Z', source: 'sample' }
      ]
    }
  }
};

function cloneDemoSeed(value) {
  return JSON.parse(JSON.stringify(value));
}

function getHumanFacingDemoSeed() {
  return cloneDemoSeed(HUMAN_FACING_DEMO_SEED);
}

module.exports = {
  HUMAN_FACING_DEMO_SEED,
  cloneDemoSeed,
  getHumanFacingDemoSeed
};
