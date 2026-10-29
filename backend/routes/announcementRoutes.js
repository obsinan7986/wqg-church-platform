const express = require('express');
const router = express.Router();
const {
  getPublicAnnouncements,
  getPublicAnnouncementById,
  getAdminAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  uploadAnnouncementImage
} = require('../controllers/announcementController');
const { protect, roleMiddleware } = require('../middleware/authMiddleware');
const { uploadContentImage } = require('../middleware/contentImageUploadMiddleware');

// Public routes (no login required)
router.get('/public', getPublicAnnouncements);
router.get('/public/:id', getPublicAnnouncementById);

// Protected routes
router.use(protect);

router.post(
  '/upload',
  roleMiddleware('SUPER_ADMIN', 'ADMIN', 'SECRETARY'),
  uploadContentImage('image'),
  uploadAnnouncementImage
);

router.get(
  '/',
  roleMiddleware('SUPER_ADMIN', 'ADMIN', 'SECRETARY'),
  getAdminAnnouncements
);

router.post(
  '/',
  roleMiddleware('SUPER_ADMIN', 'ADMIN', 'SECRETARY'),
  createAnnouncement
);

router.put(
  '/:id',
  roleMiddleware('SUPER_ADMIN', 'ADMIN'),
  updateAnnouncement
);

router.delete(
  '/:id',
  roleMiddleware('SUPER_ADMIN', 'ADMIN'),
  deleteAnnouncement
);

module.exports = router;
