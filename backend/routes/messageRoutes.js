const express = require('express');
const router = express.Router();
const {
  getExecMessages,
  getBroadcastMessages,
  getDirectMessages,
  sendMessage
} = require('../controllers/messageController');
const { protect, roleMiddleware } = require('../middleware/authMiddleware');

router.use(protect);

// 5 Executive roles strictly for Executive chat
router.get(
  '/exec-5',
  roleMiddleware('SUPER_ADMIN', 'ADMIN', 'COLLECTOR', 'HR', 'SECRETARY'),
  getExecMessages
);

// General broadcast for all authenticated members
router.get('/broadcast', getBroadcastMessages);

// 1-on-1 direct messages
router.get('/direct/:userId', getDirectMessages);

// Post message
router.post('/', sendMessage);

module.exports = router;
