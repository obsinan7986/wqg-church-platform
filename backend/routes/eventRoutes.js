const express = require('express');
const router = express.Router();
const {
  getPublicEvents,
  getAdminEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  uploadEventImage
} = require('../controllers/eventController');
const { protect, roleMiddleware } = require('../middleware/authMiddleware');
const { uploadContentImage } = require('../middleware/contentImageUploadMiddleware');

// Public route (no login needed)
router.get('/public', getPublicEvents);

// Protected routes
router.use(protect);

router.post(
  '/upload',
  roleMiddleware('SUPER_ADMIN', 'ADMIN', 'SECRETARY'),
  uploadContentImage('image'),
  uploadEventImage
);

router.get(
  '/',
  roleMiddleware('SUPER_ADMIN', 'ADMIN', 'SECRETARY'),
  getAdminEvents
);

router.post(
  '/',
  roleMiddleware('SUPER_ADMIN', 'ADMIN', 'SECRETARY'),
  createEvent
);

router.put(
  '/:id',
  roleMiddleware('SUPER_ADMIN', 'ADMIN'),
  updateEvent
);

router.delete(
  '/:id',
  roleMiddleware('SUPER_ADMIN', 'ADMIN'),
  deleteEvent
);

module.exports = router;
