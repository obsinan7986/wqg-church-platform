const express = require('express');
const router = express.Router();
const {
  getAllMembers,
  getMemberById,
  assignDepartment,
  recordAttendance,
  getAttendanceList,
  resetMemberPassword
} = require('../controllers/hrController');
const { protect, roleMiddleware } = require('../middleware/authMiddleware');

router.use(protect);

// Collectors need member directory to select members when recording contributions
router.get('/members', roleMiddleware('HR', 'ADMIN', 'SUPER_ADMIN', 'COLLECTOR'), getAllMembers);
router.get('/members/:id', roleMiddleware('HR', 'ADMIN', 'SUPER_ADMIN', 'COLLECTOR'), getMemberById);

// Other HR management routes restricted to HR, ADMIN, SUPER_ADMIN
router.put('/members/:id/department', roleMiddleware('HR', 'ADMIN', 'SUPER_ADMIN'), assignDepartment);
router.post('/members/:id/reset-password', roleMiddleware('HR', 'ADMIN', 'SUPER_ADMIN'), resetMemberPassword);
router.post('/attendance', roleMiddleware('HR', 'ADMIN', 'SUPER_ADMIN'), recordAttendance);
router.get('/attendance', roleMiddleware('HR', 'ADMIN', 'SUPER_ADMIN'), getAttendanceList);

module.exports = router;
