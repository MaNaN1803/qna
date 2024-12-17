const roleMiddleware = (...requiredRoles) => (req, res, next) => {
  if (!requiredRoles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Permission denied.' });
  }
  next();
};

module.exports = roleMiddleware;
