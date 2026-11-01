const express = require('express');
const router = express.Router();
const {
  getContactSettings,
  getAdminSettings,
  updateSiteSettings,
  toggleLiveMeeting
} = require('../controllers/siteSettingsController');
const { protect, optionalAuth, authorizeRoles } = require('../middleware/authMiddleware');

// Public route for public pages (Contact, Footer, Live card, Home strip)
// Uses optionalAuth so if logged in, member-only credentials can be included
router.get('/contact', optionalAuth, getContactSettings);

// Admin routes
router.get('/', protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), getAdminSettings);
router.put('/', protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), updateSiteSettings);
router.put('/live-toggle', protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), toggleLiveMeeting);

module.exports = router;
