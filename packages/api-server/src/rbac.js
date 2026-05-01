// Simple role-based access control
function requireRole(role) {
  return function(req, res, next) {
    if (!req.admin || req.admin.role !== role) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }
    next();
  };
}

module.exports = { requireRole };
