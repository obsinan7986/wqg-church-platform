const AuditLog = require('../models/AuditLog');

// @desc    Get audit logs with search and filter
// @route   GET /api/audit-logs
// @access  Private (SUPER_ADMIN only)
exports.getAuditLogs = async (req, res) => {
  try {
    const { action, search, limit = 50, page = 1 } = req.query;
    const filter = {};

    if (action && action !== 'ALL') {
      filter.action = action;
    }

    if (search) {
      filter.$or = [
        { userName: { $regex: search, $options: 'i' } },
        { userRole: { $regex: search, $options: 'i' } },
        { action: { $regex: search, $options: 'i' } },
        { details: { $regex: search, $options: 'i' } },
        { ipAddress: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await AuditLog.countDocuments(filter);
    const logs = await AuditLog.find(filter)
      .populate('user', 'fullName role originChurch address.phone')
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    // List of distinct actions for UI filtering
    const distinctActions = await AuditLog.distinct('action');

    res.status(200).json({
      success: true,
      count: logs.length,
      total,
      currentPage: Number(page),
      totalPages: Math.ceil(total / limit),
      actions: distinctActions,
      logs
    });
  } catch (error) {
    console.error('[getAuditLogs Error]:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit logs'
    });
  }
};

// @desc    Clear older audit logs (Super Admin maintenance)
// @route   DELETE /api/audit-logs/clear
// @access  Private (SUPER_ADMIN only)
exports.clearAuditLogs = async (req, res) => {
  try {
    const deleteResult = await AuditLog.deleteMany({});
    res.status(200).json({
      success: true,
      message: `Cleared ${deleteResult.deletedCount} audit logs`
    });
  } catch (error) {
    console.error('[clearAuditLogs Error]:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to clear audit logs'
    });
  }
};
