const ACTION_DEFINITIONS = {
  'tier-review': {
    title: 'Review Tier Review Action',
    summary: 'Queue a tier review after confirming this contractor should be audited for promotion or retention.',
    panelLabel: 'Tier review panel'
  },
  'compliance-review': {
    title: 'Review Compliance Action',
    summary: 'Open a compliance review after confirming the contractor needs a compliance follow-up.',
    panelLabel: 'Compliance panel'
  },
  'dispute-audit': {
    title: 'Review Dispute Audit Action',
    summary: 'Open a dispute audit after confirming the contractor needs dispute-history investigation.',
    panelLabel: 'Disputes panel'
  }
};

function createAdminActionReview(contractor, actionType) {
  if (!contractor || !actionType || !ACTION_DEFINITIONS[actionType]) {
    return null;
  }

  return {
    actionType,
    contractorId: contractor.id,
    contractorName: contractor.name || contractor.id,
    panelLabel: ACTION_DEFINITIONS[actionType].panelLabel,
    title: ACTION_DEFINITIONS[actionType].title,
    summary: ACTION_DEFINITIONS[actionType].summary
  };
}

module.exports = {
  createAdminActionReview
};