const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure destination uploads directory exists
const uploadDirectory = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

// Allowed MIME types and extensions for multi-format uploads
const ALLOWED_MIME_TYPES = new Set([
  // PDFs (Books)
  'application/pdf',

  // Audio formats (Gospels & Choir)
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/ogg',
  'audio/vorbis',
  'audio/x-m4a',
  'audio/m4a',
  'audio/aac',
  'audio/mp4',
  'audio/x-aac',
  'audio/flac',

  // Video formats (Sermons)
  'video/mp4',
  'video/x-matroska',
  'video/mkv',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'video/avi'
]);

const ALLOWED_EXTENSIONS = new Set([
  // PDF
  '.pdf',
  // Audio
  '.mp3',
  '.wav',
  '.ogg',
  '.m4a',
  '.aac',
  '.flac',
  // Video
  '.mp4',
  '.mkv',
  '.webm',
  '.mov',
  '.avi'
]);

// Configure Multer disk storage with unique timestamps
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Re-verify directory exists on each write
    if (!fs.existsSync(uploadDirectory)) {
      fs.mkdirSync(uploadDirectory, { recursive: true });
    }
    cb(null, uploadDirectory);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const randomSuffix = Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    const baseName = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 50);

    const uniqueFilename = `${timestamp}-${randomSuffix}-${baseName}${ext}`;
    cb(null, uniqueFilename);
  }
});

// File validation filter
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype.toLowerCase();

  const isMimeAllowed = ALLOWED_MIME_TYPES.has(mime) || mime.startsWith('audio/') || mime.startsWith('video/');
  const isExtAllowed = ALLOWED_EXTENSIONS.has(ext);

  if (isMimeAllowed && isExtAllowed) {
    return cb(null, true);
  }

  return cb(
    new Error(
      `Gosti faayilii eeyyamamaa miti (${ext || mime}). Gosti eeyyamaman: PDF (Kitaaba), MP3/Audio (Faarfannaa/Wangeela), fi MP4/Video (Lallaba). (Unsupported file type: only PDF, Audio, and Video files are allowed.)`
    ),
    false
  );
};

// 50MB file size limit
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 Megabytes

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1
  },
  fileFilter
});

/**
 * Express middleware wrapper to catch Multer errors gracefully
 */
const handleUpload = (req, res, next) => {
  const uploadSingle = upload.single('file');

  uploadSingle(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'Hangi faayilii 50MB caaluu hin danda\'u (File size exceeds the 50MB limit).'
        });
      }
      return res.status(400).json({
        success: false,
        message: `Multer upload error: ${err.message}`
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload failed'
      });
    }

    next();
  });
};

module.exports = {
  upload,
  handleUpload,
  uploadDirectory,
  MAX_FILE_SIZE
};
