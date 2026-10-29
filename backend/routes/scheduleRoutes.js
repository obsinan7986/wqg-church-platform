const express = require('express');
const router = express.Router();
const {
  getPublicSchedule,
  getAdminSchedule,
  createScheduleItem,
  updateScheduleItem,
  reorderScheduleItems,
  deleteScheduleItem
} = require('../controllers/scheduleController');
const { protect, roleMiddleware } = require('../middleware/authMiddleware');

// Public route (no login required)
router.get('/public', getPublicSchedule);

// Protected routes (Dashboard)
router.use(protect);

router.get(
  '/',
  roleMiddleware('SUPER_ADMIN', 'ADMIN', 'SECRETARY'),
  getAdminSchedule
);

router.post(
  '/',
  roleMiddleware('SUPER_ADMIN', 'ADMIN', 'SECRETARY'),
  createScheduleItem
);

router.put(
  '/reorder',
  roleMiddleware('SUPER_ADMIN', 'ADMIN', 'SECRETARY'),
  reorderScheduleItems
);

router.put(
  '/:id',
  roleMiddleware('SUPER_ADMIN', 'ADMIN', 'SECRETARY'),
  updateScheduleItem
);

router.delete(
  '/:id',
  roleMiddleware('SUPER_ADMIN', 'ADMIN', 'SECRETARY'),
  deleteScheduleItem
);

module.exports = router;
