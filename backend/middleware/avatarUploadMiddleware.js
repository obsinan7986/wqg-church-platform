const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('../config/cloudinary');

const avatarUploadDir = path.join(__dirname, '..', 'uploads', 'avatars');
if (!fs.existsSync(avatarUploadDir)) {
  fs.mkdirSync(avatarUploadDir, { recursive: true });
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
    if (!fs.existsSync(avatarUploadDir)) {
      fs.mkdirSync(avatarUploadDir, { recursive: true });
    }
    cb(null, avatarUploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const randomSuffix = Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    const baseName = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 30);
    cb(null, `avatar_${timestamp}_${randomSuffix}_${baseName}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype.toLowerCase();

  if (ALLOWED_MIME_TYPES.has(mime) && ALLOWED_EXTENSIONS.has(ext)) {
    return cb(null, true);
  }

  return cb(
    new Error('Suuraa qofa (JPG, PNG, WebP) fe\'uu dandeessu. Max 2MB. (Only JPG, PNG, or WebP images up to 2MB allowed.)'),
    false
  );
};

// Max 2 MB as requested
const MAX_FILE_SIZE = 2 * 1024 * 1024;

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1
  },
  fileFilter
});

const uploadAvatarFile = (req, res, next) => {
  const uploadSingle = upload.single('avatar');

  uploadSingle(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'Hangi suuraa profile 2MB caaluu hin danda\'u (Avatar file size cannot exceed 2MB).'
        });
      }
      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Avatar upload failed'
      });
    }

    next();
  });
};

const removeTempFile = (filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.warn('[Avatar Cleanup Warning]:', err.message);
  }
};

const uploadAvatarToCloudinary = async (filePath) => {
  if (!filePath) return { avatarUrl: null, avatarPublicId: null };

  const isCloudinaryConfigured = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );

  try {
    if (isCloudinaryConfigured) {
      const result = await cloudinary.uploader.upload(filePath, {
        folder: 'wqg/avatars',
        resource_type: 'image',
        transformation: [
          { width: 400, height: 400, crop: 'fill', gravity: 'face' }
        ]
      });

      removeTempFile(filePath);

      return {
        avatarUrl: result.secure_url,
        avatarPublicId: result.public_id
      };
    } else {
      const relativeUrl = `/uploads/avatars/${path.basename(filePath)}`;
      return {
        avatarUrl: relativeUrl,
        avatarPublicId: null
      };
    }
  } catch (err) {
    removeTempFile(filePath);
    throw err;
  }
};

const deleteAvatarFromCloudinary = async (publicId, avatarUrl) => {
  try {
    if (publicId) {
      await cloudinary.uploader.destroy(publicId);
    } else if (avatarUrl && avatarUrl.startsWith('/uploads/avatars/')) {
      const localPath = path.join(__dirname, '..', avatarUrl);
      removeTempFile(localPath);
    }
  } catch (err) {
    console.warn('[Delete Avatar Warning]:', err.message);
  }
};

module.exports = {
  uploadAvatarFile,
  uploadAvatarToCloudinary,
  deleteAvatarFromCloudinary,
  removeTempFile
};
