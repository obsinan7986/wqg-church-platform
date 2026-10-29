const AuditLog = require('../models/AuditLog');

/**
 * Log a critical activity into AuditLog collection
 * @param {Object} req Express request object
 * @param {String} action Action name (e.g., 'LOGIN', 'CREATE_MEETING', 'ADD_BANNER')
 * @param {String|Object} details Human-readable or structured details of the event
 * @param {Object} [customUser] Explicit user object if req.user is not yet attached
 */
const logAudit = async (req, action, details, customUser = null) => {
  try {
    const actor = customUser || req?.user;
    const ip =
      req?.headers?.['x-forwarded-for'] ||
      req?.socket?.remoteAddress ||
      req?.ip ||
      '127.0.0.1';
    const userAgent = req?.headers?.['user-agent'] || '';

    const detailString =
      typeof details === 'object' ? JSON.stringify(details) : String(details || '');

    await AuditLog.create({
      user: actor?._id || null,
      userName: actor?.fullName || 'Anonymous / Guest',
      userRole: actor?.role || 'GUEST',
      action,
      details: detailString,
      ipAddress: Array.isArray(ip) ? ip[0] : ip,
      userAgent: userAgent.substring(0, 255),
      timestamp: new Date()
    });
  } catch (error) {
    console.error('[AuditLog Error]:', error.message);
  }
};

module.exports = { logAudit };
