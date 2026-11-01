const express = require('express');
const router = express.Router();
const { loginLimiter, registerLimiter } = require('../middleware/rateLimiters');
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

// Public routes with strict rate limiters
router.post('/register', registerLimiter, register);
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
