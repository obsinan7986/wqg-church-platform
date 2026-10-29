const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  createNotification
} = require('../controllers/notificationController');
const { protect, roleMiddleware } = require('../middleware/authMiddleware');

// All notification routes require authentication
router.use(protect);

router.get('/', getNotifications);
router.patch('/mark-all-read', markAllAsRead);
router.patch('/:id/read', markAsRead);

// Protected to leadership/admin for creating global alerts
router.post(
  '/',
  roleMiddleware('SUPER_ADMIN', 'ADMIN', 'SECRETARY', 'HR', 'COLLECTOR'),
  createNotification
);

module.exports = router;
