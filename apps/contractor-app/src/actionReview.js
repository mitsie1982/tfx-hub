function createQuoteReview(project, draft) {
  if (!project || !String(draft.amount || '').trim()) {
    return null;
  }

  return {
    type: 'quote',
    projectId: project.id,
    projectTitle: project.title,
    quote: {
      amount: String(draft.amount || '').trim(),
      timeline: String(draft.timeline || '').trim(),
      note: String(draft.note || '').trim()
    }
  };
}

function createMessageReview(project, draft) {
  const body = String(draft.body || '').trim();
  if (!project || !body) {
    return null;
  }

  return {
    type: 'message',
    projectId: project.id,
    projectTitle: project.title,
    message: { body }
  };
}

module.exports = {
  createQuoteReview,
  createMessageReview
};