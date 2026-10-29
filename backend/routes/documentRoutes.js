const express = require('express');
const router = express.Router();
const {
  createDocument,
  getDocuments,
  getDocumentById,
  updateDocument,
  deleteDocument
} = require('../controllers/documentController');
const { protect, roleMiddleware } = require('../middleware/authMiddleware');

router.use(protect);

router.get(
  '/',
  roleMiddleware('SECRETARY', 'ADMIN', 'SUPER_ADMIN'),
  getDocuments
);

router.post(
  '/',
  roleMiddleware('SECRETARY', 'ADMIN', 'SUPER_ADMIN'),
  createDocument
);

router.get('/:id', getDocumentById);

router.put(
  '/:id',
  roleMiddleware('SECRETARY', 'ADMIN', 'SUPER_ADMIN'),
  updateDocument
);

router.delete(
  '/:id',
  roleMiddleware('SECRETARY', 'ADMIN', 'SUPER_ADMIN'),
  deleteDocument
);

module.exports = router;
