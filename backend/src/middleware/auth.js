const requireAuth = (req, res, next) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

const validateTenantAccess = (req, res, next) => {
  const tenantId = req.session?.activeTenantId;
  if (!tenantId) {
    return res.status(400).json({ error: 'No active tenant selected' });
  }
  req.tenantId = tenantId;
  next();
};

module.exports = {
  requireAuth,
  validateTenantAccess
};
