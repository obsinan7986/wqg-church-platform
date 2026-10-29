const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('../config/cloudinary');

const contentUploadDir = path.join(__dirname, '..', 'uploads', 'content');
if (!fs.existsSync(contentUploadDir)) {
  fs.mkdirSync(contentUploadDir, { recursive: true });
}

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/jpg'
]);

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(contentUploadDir)) {
      fs.mkdirSync(contentUploadDir, { recursive: true });
    }
    cb(null, contentUploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const randomSuffix = Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    const baseName = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 30);
    cb(null, `content_${timestamp}_${randomSuffix}_${baseName}${ext}`);
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
      'Suuraan qofti eeyyamama (JPG, PNG, WebP qofa, hamma 3MB). Only JPG, PNG, or WebP images up to 3MB are allowed.'
    ),
    false
  );
};

// Max 3 MB
const MAX_FILE_SIZE = 3 * 1024 * 1024;

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1
  },
  fileFilter
});

const uploadContentImage = (fieldName = 'image') => {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'Hammayyuu ol (File size too large). Max 3MB allowed.'
          });
        }
        return res.status(400).json({
          success: false,
          message: `Multer Error: ${err.message}`
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
      next();
    });
  };
};

const uploadImageToCloudinary = async (filePath, folder = 'wqg/banners') => {
  const isCloudinaryConfigured = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );

  if (isCloudinaryConfigured) {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder,
        resource_type: 'image'
      });

      // Cleanup local temp file
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (_) {}
      }

      return {
        url: result.secure_url,
        public_id: result.public_id
      };
    } catch (err) {
      console.error('[Cloudinary Upload Error]:', err.message);
      // Fallback to local
    }
  }

  // Fallback: Return relative local static URL
  const filename = path.basename(filePath);
  return {
    url: `/uploads/content/${filename}`,
    public_id: ''
  };
};

const deleteImageFromCloudinary = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
  } catch (err) {
    console.warn('[Cloudinary Delete Warning]:', err.message);
  }
};

const removeTempFile = (filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (_) {}
  }
};

module.exports = {
  uploadContentImage,
  uploadImageToCloudinary,
  deleteImageFromCloudinary,
  removeTempFile
};
