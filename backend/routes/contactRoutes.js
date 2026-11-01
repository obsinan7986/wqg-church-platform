const express = require('express');
const router = express.Router();
const {
  submitContactMessage,
  getContactMessages,
  getContactMessageById,
  updateContactMessageStatus,
  deleteContactMessage
} = require('../controllers/contactController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Public submission with rate limiting and honeypot
router.post('/', submitContactMessage);

// Admin endpoints (strictly SUPER_ADMIN and ADMIN)
router.get('/', protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), getContactMessages);
router.get('/:id', protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), getContactMessageById);
router.patch('/:id/status', protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), updateContactMessageStatus);
router.delete('/:id', protect, authorizeRoles('SUPER_ADMIN', 'ADMIN'), deleteContactMessage);

module.exports = router;
