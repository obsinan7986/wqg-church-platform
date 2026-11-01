const express = require('express');
const router = express.Router();
const {
  getRadioState,
  getRadioLibrary,
  reportTrackEnded,
  playRadio,
  pauseRadio,
  resumeRadio,
  stopRadio,
  seekRadio,
  nextRadio,
  updateRadioQueue
} = require('../controllers/radioController');
const { protect, roleMiddleware } = require('../middleware/authMiddleware');

const STAFF_ROLES = ['SUPER_ADMIN', 'ADMIN', 'SECRETARY'];

// Public / general endpoints
router.get('/state', getRadioState);
router.get('/library', getRadioLibrary);

// Staff-only endpoints
router.use(protect);
router.use(roleMiddleware(...STAFF_ROLES));

router.post('/play', playRadio);
router.post('/pause', pauseRadio);
router.post('/resume', resumeRadio);
router.post('/stop', stopRadio);
router.post('/seek', seekRadio);
router.post('/next', nextRadio);
router.post('/queue', updateRadioQueue);
router.post('/track-ended', reportTrackEnded);

module.exports = router;
