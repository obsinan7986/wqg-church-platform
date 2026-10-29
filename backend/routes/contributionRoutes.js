const express = require('express');
const router = express.Router();
const {
  createContribution,
  submitContribution,
  approveContribution,
  rejectContribution,
  getContributions,
  getContributionStats,
  getMyContributions,
  getContributionById,
  getPaymentAccounts,
  createPaymentAccount,
  updatePaymentAccount,
  deletePaymentAccount
} = require('../controllers/contributionController');
const { protect, roleMiddleware } = require('../middleware/authMiddleware');
const { uploadPaymentProof } = require('../middleware/paymentUploadMiddleware');

// Payment Accounts ("Where to pay")
router.get('/payment-accounts', protect, getPaymentAccounts);
router.post(
  '/payment-accounts',
  protect,
  roleMiddleware('ADMIN', 'SUPER_ADMIN'),
  createPaymentAccount
);
router.put(
  '/payment-accounts/:id',
  protect,
  roleMiddleware('ADMIN', 'SUPER_ADMIN'),
  updatePaymentAccount
);
router.delete(
  '/payment-accounts/:id',
  protect,
  roleMiddleware('ADMIN', 'SUPER_ADMIN'),
  deletePaymentAccount
);

// Member viewing their own contributions
router.get('/my', protect, getMyContributions);

// Collector / Admin stats
router.get(
  '/stats',
  protect,
  roleMiddleware('COLLECTOR', 'ADMIN', 'SUPER_ADMIN'),
  getContributionStats
);

// Get list with filters
router.get(
  '/',
  protect,
  roleMiddleware('COLLECTOR', 'ADMIN', 'SUPER_ADMIN'),
  getContributions
);

// Record new payment directly by collector
router.post(
  '/',
  protect,
  roleMiddleware('COLLECTOR', 'ADMIN', 'SUPER_ADMIN'),
  uploadPaymentProof,
  createContribution
);

// New payment submission by any logged-in MEMBER
router.post(
  '/submit',
  protect,
  uploadPaymentProof,
  submitContribution
);

// Approval and rejection by Collector / Admin
router.patch(
  '/:id/approve',
  protect,
  roleMiddleware('COLLECTOR', 'ADMIN', 'SUPER_ADMIN'),
  approveContribution
);

router.patch(
  '/:id/reject',
  protect,
  roleMiddleware('COLLECTOR', 'ADMIN', 'SUPER_ADMIN'),
  rejectContribution
);

// Single receipt
router.get('/:id', protect, getContributionById);

module.exports = router;
