function createRequestReview(requestForm) {
  if (!requestForm) {
    return null;
  }

  const title = String(requestForm.title || '').trim();
  const trade = String(requestForm.trade || '').trim();
  const description = String(requestForm.description || '').trim();

  if (!title || !trade || !description) {
    return null;
  }

  return {
    title,
    trade,
    description,
    budget: String(requestForm.budget || '').trim(),
    location: String(requestForm.location || '').trim(),
    urgency: String(requestForm.urgency || '').trim()
  };
}

module.exports = {
  createRequestReview
};
