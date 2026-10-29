const express = require('express');
const router = express.Router();
const { getAuditLogs, clearAuditLogs } = require('../controllers/auditController');
const { protect, roleMiddleware } = require('../middleware/authMiddleware');

router.use(protect);
router.use(roleMiddleware('SUPER_ADMIN'));

router.get('/', getAuditLogs);
router.delete('/clear', clearAuditLogs);

module.exports = router;
