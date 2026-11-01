const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('../config/cloudinary');
const { verifyFileSignature } = require('../utils/fileSignature');

const paymentUploadDir = path.join(__dirname, '..', 'uploads', 'payments');
if (!fs.existsSync(paymentUploadDir)) {
  fs.mkdirSync(paymentUploadDir, { recursive: true });
}

// Allowed image formats
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/jpg'
]);

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(paymentUploadDir)) {
      fs.mkdirSync(paymentUploadDir, { recursive: true });
    }
    cb(null, paymentUploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const randomSuffix = Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    const baseName = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 30);
    cb(null, `payment_${timestamp}_${randomSuffix}_${baseName}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype.toLowerCase();

  if (ALLOWED_MIME_TYPES.has(mime) && ALLOWED_EXTENSIONS.has(ext)) {
    return cb(null, true);
  }

  return cb(
    new Error(
      'Suuraan kaffaltii qofti eeyyamama (JPG, PNG, WebP qofa, hamma 5MB). Only JPG, PNG, or WebP images up to 5MB are allowed.'
    ),
    false
  );
};

// Max 5 MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1
  },
  fileFilter
});

/**
 * Express middleware wrapper to catch Multer errors for field "proof"
 */
const uploadPaymentProof = (req, res, next) => {
  const uploadSingle = upload.single('proof');

  uploadSingle(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'Hangi suuraa kaffaltii 5MB caaluu hin danda\'u (Screenshot size cannot exceed 5MB).'
        });
      }
      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Image upload failed'
      });
    }

    // Verify real file magic numbers/signature
    if (req.file) {
      const isValidSig = verifyFileSignature(req.file.path, ['jpeg', 'png', 'webp']);
      if (!isValidSig) {
        removeTempFile(req.file.path);
        return res.status(400).json({
          success: false,
          message: 'Invalid file signature: Content does not match an authentic image format (JPEG, PNG, WebP).'
        });
      }
    }

    next();
  });
};

/**
 * Safely delete local file
 */
const removeTempFile = (filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.warn('[Payment File Cleanup Warning]:', err.message);
  }
};

/**
 * Upload proof file to Cloudinary folder "wqg/payments"
 * Returns { proofUrl, proofPublicId }
 */
const uploadProofToCloudinary = async (filePath) => {
  if (!filePath) return { proofUrl: null, proofPublicId: null };

  const isCloudinaryConfigured = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );

  try {
    if (isCloudinaryConfigured) {
      const result = await cloudinary.uploader.upload(filePath, {
        folder: 'wqg/payments',
        resource_type: 'image'
      });

      // Temporary local copy is deleted after Cloudinary upload
      removeTempFile(filePath);

      return {
        proofUrl: result.secure_url,
        proofPublicId: result.public_id
      };
    } else {
      // Local fallback: keep file in /uploads/payments
      const relativeUrl = `/uploads/payments/${path.basename(filePath)}`;
      return {
        proofUrl: relativeUrl,
        proofPublicId: null
      };
    }
  } catch (uploadError) {
    // Clean up local temp file on failure
    removeTempFile(filePath);
    throw uploadError;
  }
};

module.exports = {
  uploadPaymentProof,
  uploadProofToCloudinary,
  removeTempFile
};
