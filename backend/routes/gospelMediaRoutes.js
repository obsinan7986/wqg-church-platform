const express = require('express');
const router = express.Router();
const {
  getAllMedia,
  createMedia,
  deleteMedia
} = require('../controllers/gospelMediaController');
const { protect, roleMiddleware } = require('../middleware/authMiddleware');

// Public route to view gospel videos/audios
router.get('/', getAllMedia);

// Protected routes (Super Admin, Admin, Secretary)
router.post(
  '/',
  protect,
  roleMiddleware('SUPER_ADMIN', 'ADMIN', 'SECRETARY'),
  createMedia
);

router.delete(
  '/:id',
  protect,
  roleMiddleware('SUPER_ADMIN', 'ADMIN', 'SECRETARY'),
  deleteMedia
);

module.exports = router;
