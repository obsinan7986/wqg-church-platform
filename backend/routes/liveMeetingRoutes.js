const express = require('express');
const router = express.Router();
const {
  getPublicNextLive,
  scheduleMeeting,
  getActiveMeeting,
  getMeetingByLink,
  startLive,
  endLive,
  requestJoin,
  admitMember,
  muteUser,
  muteAll,
  toggleVideoOff,
  toggleReaction,
  addComment
} = require('../controllers/liveMeetingController');
const { protect, roleMiddleware } = require('../middleware/authMiddleware');

// Public endpoint (no authentication needed)
router.get('/public/next', getPublicNextLive);

// All subsequent endpoints require authentication
router.use(protect);

// Active meeting info for authenticated members
router.get('/active', getActiveMeeting);
router.get('/:meetingLink', getMeetingByLink);

// Interactive member interactions
router.post('/:id/join-request', requestJoin);
router.post('/:id/reaction', toggleReaction);
router.post('/:id/comment', addComment);

// Scheduling: Both SUPER_ADMIN and ADMIN can schedule live meetings
router.post('/schedule', roleMiddleware('SUPER_ADMIN', 'ADMIN'), scheduleMeeting);

// Studio operations: Host or SUPER_ADMIN
router.patch('/:id/start', roleMiddleware('SUPER_ADMIN', 'ADMIN'), startLive);
router.patch('/:id/end', roleMiddleware('SUPER_ADMIN', 'ADMIN'), endLive);
router.post('/:id/admit', roleMiddleware('SUPER_ADMIN', 'ADMIN'), admitMember);
router.post('/:id/mute', roleMiddleware('SUPER_ADMIN', 'ADMIN'), muteUser);
router.post('/:id/mute-all', roleMiddleware('SUPER_ADMIN', 'ADMIN'), muteAll);
router.post('/:id/video-off', roleMiddleware('SUPER_ADMIN', 'ADMIN'), toggleVideoOff);

module.exports = router;
