const express = require('express');
const router = express.Router();
const siteTextController = require('../controllers/siteTextController');
const { protect, roleMiddleware } = require('../middleware/authMiddleware');

// Public route: fetch all overrides
router.get('/', siteTextController.getSiteTexts);

// Admin routes: PUT to override, DELETE to reset to default
router.put(
  '/:key',
  protect,
  roleMiddleware('SUPER_ADMIN', 'ADMIN'),
  siteTextController.updateSiteText
);

router.delete(
  '/:key',
  protect,
  roleMiddleware('SUPER_ADMIN', 'ADMIN'),
  siteTextController.deleteSiteText
);

module.exports = router;
