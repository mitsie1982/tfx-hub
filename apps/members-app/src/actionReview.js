const ASSOCIATION_ACTIONS = {
  'member-review': {
    title: 'Review Member Review Queue',
    summary: 'Queue a member review so the association can inspect readiness and follow-up actions.'
  },
  'trade-outreach': {
    title: 'Review Trade Outreach Queue',
    summary: 'Queue a trade outreach action so the association can contact this professional for upcoming demand.'
  }
};

const PROFESSIONAL_ACTIONS = {
  'availability-check-in': {
    title: 'Review Availability Check-In',
    summary: 'Record an availability check-in request for this professional before sending it.'
  },
  'tier-review-request': {
    title: 'Review Tier Review Request',
    summary: 'Request a tier review for this professional after confirming the escalation path.'
  }
};

function createReview(professional, actionType, scope, scopeLabel, definitions) {
  if (!professional || !actionType || !definitions[actionType]) {
    return null;
  }

  return {
    scope,
    scopeLabel,
    actionType,
    professionalId: professional.id,
    professionalName: professional.name || professional.id,
    title: definitions[actionType].title,
    summary: definitions[actionType].summary
  };
}

function createAssociationActionReview(professional, actionType) {
  return createReview(professional, actionType, 'association', 'Association workflow', ASSOCIATION_ACTIONS);
}

function createProfessionalActionReview(professional, actionType) {
  return createReview(professional, actionType, 'professional', 'Professional workflow', PROFESSIONAL_ACTIONS);
}

module.exports = {
  createAssociationActionReview,
  createProfessionalActionReview
};