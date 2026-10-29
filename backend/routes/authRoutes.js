const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const {
  register,
  login,
  getMe,
  uploadAvatar,
  deleteAvatar,
  updateProfile,
  changePassword,
  changePhone,
  logoutAll,
  getSecurityActivity,
  createStaff
} = require('../controllers/authController');
const { protect, roleMiddleware } = require('../middleware/authMiddleware');
const { uploadAvatarFile } = require('../middleware/avatarUploadMiddleware');

// Login rate limiter: 10 attempts per 15 min per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts from this IP address. Please try again after 15 minutes.'
  }
});

// Public routes
router.post('/register', register);
router.post('/login', loginLimiter, login);

// Protected routes (Any authenticated user)
router.get('/me', protect, getMe);
router.post('/avatar', protect, uploadAvatarFile, uploadAvatar);
router.delete('/avatar', protect, deleteAvatar);
router.patch('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);
router.put('/change-phone', protect, changePhone);
router.post('/logout-all', protect, logoutAll);
router.get('/security-activity', protect, getSecurityActivity);

// Protected route (Restricted strictly to SUPER_ADMIN)
router.post('/create-staff', protect, roleMiddleware('SUPER_ADMIN'), createStaff);

module.exports = router;
