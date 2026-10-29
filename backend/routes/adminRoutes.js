const express = require('express');
const router = express.Router();
const {
  getSystemOverview,
  updateUserRole,
  moderateMeetingComment
} = require('../controllers/adminController');
const { protect, roleMiddleware } = require('../middleware/authMiddleware');

router.use(protect);
router.use(roleMiddleware('ADMIN', 'SUPER_ADMIN'));

router.get('/overview', getSystemOverview);
router.put('/users/:id/role', updateUserRole);
router.delete('/meetings/:meetingId/comments/:commentId', moderateMeetingComment);

module.exports = router;
