const express = require('express');
const router = express.Router();
const {
  getBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  uploadBannerImage
} = require('../controllers/bannerController');
const { protect, roleMiddleware } = require('../middleware/authMiddleware');
const { uploadContentImage } = require('../middleware/contentImageUploadMiddleware');

// Public route to view active banners
router.get('/', getBanners);

// Protected routes (Admin, Super Admin)
router.post(
  '/upload',
  protect,
  roleMiddleware('ADMIN', 'SUPER_ADMIN'),
  uploadContentImage('image'),
  uploadBannerImage
);

router.post(
  '/',
  protect,
  roleMiddleware('ADMIN', 'SUPER_ADMIN'),
  createBanner
);

router.put(
  '/:id',
  protect,
  roleMiddleware('ADMIN', 'SUPER_ADMIN'),
  updateBanner
);

router.delete(
  '/:id',
  protect,
  roleMiddleware('ADMIN', 'SUPER_ADMIN'),
  deleteBanner
);

module.exports = router;
