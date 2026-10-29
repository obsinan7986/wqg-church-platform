const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Protect middleware: validates the JWT Bearer token and attaches user to req.user
 */
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No authorization token provided.'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user without passwordHash
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists.'
      });
    }

    // Check if account is locked
    if (user.lockUntil && user.lockUntil > Date.now()) {
      return res.status(403).json({
        success: false,
        message: 'Account is temporarily locked due to multiple failed login attempts. Please try again later.'
      });
    }

    // Reject tokens whose tokenVersion does not match
    if (decoded.tokenVersion !== undefined && decoded.tokenVersion !== (user.tokenVersion || 0)) {
      return res.status(401).json({
        success: false,
        message: 'Session has been invalidated. Please log in again.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token verification failed: invalid or expired token.',
      error: error.message
    });
  }
};

/**
 * Role middleware: Restricts route access to specified roles
 * Usage: roleMiddleware('SUPER_ADMIN', 'ADMIN')
 */
const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Authentication required before checking roles.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Role '${req.user.role}' is not authorized to access this resource. Allowed roles: [${allowedRoles.join(', ')}]`
      });
    }

    next();
  };
};

module.exports = {
  protect,
  roleMiddleware,
  authorizeRoles: roleMiddleware // alias for convenience
};
