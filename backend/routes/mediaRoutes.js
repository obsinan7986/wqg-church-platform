const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const cloudinary = require('../config/cloudinary');

const MediaDocument = require('../models/MediaDocument');
const { protect, roleMiddleware } = require('../middleware/authMiddleware');
const { handleUpload, uploadDirectory } = require('../middleware/uploadMiddleware');
const { logAudit } = require('../utils/auditLogger');

// Cloudinary is used when all 3 env keys exist; otherwise files stay on local disk
const cloudEnabled = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
);
if (!cloudEnabled) {
  console.warn(
    '[Media] Cloudinary keys missing: uploads are saved on local disk (NOT persistent on Render).'
  );
}

// A document stored on Cloudinary has a full https URL; legacy ones start with /uploads/
const isCloudDoc = (doc) => typeof doc.fileUrl === 'string' && doc.fileUrl.startsWith('http');

// Safely delete a temporary local file
const removeLocalFile = (filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (err) {
    console.warn('[Local File Cleanup Warning]:', err.message);
  }
};

/**
 * Helper to determine fileType enum from mimeType and file extension
 */
const detectFileType = (file) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype.toLowerCase();

  if (mime === 'application/pdf' || ext === '.pdf') {
    return 'PDF';
  }
  if (
    mime.startsWith('audio/') ||
    ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'].includes(ext)
  ) {
    return 'AUDIO';
  }
  if (
    mime.startsWith('video/') ||
    ['.mp4', '.mkv', '.webm', '.mov', '.avi'].includes(ext)
  ) {
    return 'VIDEO';
  }
  return 'OTHER';
};

// @desc    Upload new religious media document (Book PDF, Gospel/Choir Audio, Sermon Video)
// @route   POST /api/media/upload
// @access  Private (SUPER_ADMIN, ADMIN, SECRETARY)
router.post(
  '/upload',
  protect,
  roleMiddleware('SUPER_ADMIN', 'ADMIN', 'SECRETARY'),
  handleUpload,
  async (req, res) => {
    let cloudResult = null; // remembered so we can undo the upload if the DB save fails

    try {
      const { title, category, description, recordedAt } = req.body;

      // Validate required file
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Maaloo faayilii ol-fe\'amu filadhaa (Please select a file to upload).'
        });
      }

      // Validate title
      if (!title || !title.trim()) {
        removeLocalFile(req.file.path);
        return res.status(400).json({
          success: false,
          message: 'Mata-dureen faayilii dirqama (File title is required).'
        });
      }

      // Validate category
      const allowedCategories = ['BOOK', 'GOSPEL', 'CHOIR', 'SERMON'];
      const normalizedCategory = (category || '').toUpperCase().trim();
      if (!allowedCategories.includes(normalizedCategory)) {
        removeLocalFile(req.file.path);
        return res.status(400).json({
          success: false,
          message: `Gosti faayilii sirrii miti. Kanneen keessaa filadhaa: ${allowedCategories.join(', ')}`
        });
      }

      // Detect fileType and validate logical match
      const detectedType = detectFileType(req.file);

      // BOOK should be PDF
      if (normalizedCategory === 'BOOK' && detectedType !== 'PDF') {
        removeLocalFile(req.file.path);
        return res.status(400).json({
          success: false,
          message: 'Gosa Kitaabaaf (BOOK) faayilii PDF qofatu eeyyamama (Only PDF files are allowed for books).'
        });
      }

      // GOSPEL and CHOIR should be Audio or Video
      if (
        (normalizedCategory === 'GOSPEL' || normalizedCategory === 'CHOIR') &&
        detectedType !== 'AUDIO' &&
        detectedType !== 'VIDEO'
      ) {
        removeLocalFile(req.file.path);
        return res.status(400).json({
          success: false,
          message: 'Wangeela fi Faarfannaaf faayilii Sagalee (Audio/MP3) ykn Viidiyoo qofatu eeyyamama.'
        });
      }

      // SERMON should be Video or Audio
      if (normalizedCategory === 'SERMON' && detectedType !== 'VIDEO' && detectedType !== 'AUDIO') {
        removeLocalFile(req.file.path);
        return res.status(400).json({
          success: false,
          message: 'Lallabaaf faayilii Viidiyoo (MP4) ykn Sagalee (Audio) qofatu eeyyamama.'
        });
      }

      // ---- Storage: Cloudinary (preferred) or local disk (fallback) ----
      let fileUrl;
      let storedFileName;
      let cloudinaryResourceType = 'raw';

      if (cloudEnabled) {
        // resource_type "auto": Cloudinary stores audio as "video" and PDFs as "image"
        cloudResult = await cloudinary.uploader.upload(req.file.path, {
          resource_type: 'auto',
          folder: `wqg/${normalizedCategory.toLowerCase()}`,
          use_filename: true,
          unique_filename: true
        });

        fileUrl = cloudResult.secure_url;          // full https URL
        storedFileName = cloudResult.public_id;    // needed to delete later
        cloudinaryResourceType = cloudResult.resource_type;

        // Temporary local copy is no longer needed
        removeLocalFile(req.file.path);
      } else {
        fileUrl = `/uploads/${req.file.filename}`;
        storedFileName = req.file.filename;
      }

      // Create MediaDocument entry in database
      const newMediaDocument = await MediaDocument.create({
        title: title.trim(),
        category: normalizedCategory,
        fileUrl,
        fileName: req.file.originalname,
        storedFileName,
        cloudinaryResourceType,
        fileType: detectedType,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        description: description ? description.trim() : '',
        recordedAt: recordedAt ? new Date(recordedAt) : null,
        uploadedBy: req.user._id
      });

      await newMediaDocument.populate('uploadedBy', 'fullName role originChurch');

      // Emit real-time notification to all connected clients
      if (req.io) {
        req.io.to('all_users_room').emit('new_media_document', {
          media: newMediaDocument
        });
      }

      // Log action in audit collection
      await logAudit(
        req,
        'UPLOAD_MEDIA_DOCUMENT',
        `Uploaded ${normalizedCategory}: "${newMediaDocument.title}" (${(req.file.size / (1024 * 1024)).toFixed(2)} MB)`
      );

      return res.status(201).json({
        success: true,
        message: 'Faayiliin milkaa\'inaan ol-fe\'ameera (File uploaded successfully).',
        media: newMediaDocument
      });
    } catch (error) {
      console.error('[Upload Media Error]:', error);

      // Clean up temporary local file
      removeLocalFile(req.file?.path);

      // If the file already reached Cloudinary but the DB save failed, remove it again
      if (cloudResult?.public_id) {
        try {
          await cloudinary.uploader.destroy(cloudResult.public_id, {
            resource_type: cloudResult.resource_type || 'raw'
          });
        } catch (cloudErr) {
          console.error('[Cloudinary Rollback Error]:', cloudErr.message);
        }
      }

      return res.status(500).json({
        success: false,
        message: error.message || 'Faayilii ol-fe\'uun hin danda\'amne (Failed to upload file).'
      });
    }
  }
);

// @desc    Get all uploaded media documents (books, gospels, choir, sermons)
// @route   GET /api/media/all
// @access  Public / All Members
router.get('/all', async (req, res) => {
  try {
    const { category, fileType, search, limit } = req.query;
    const filter = {};

    if (category && category !== 'ALL') {
      filter.category = category.toUpperCase().trim();
    }

    if (fileType && fileType !== 'ALL') {
      filter.fileType = fileType.toUpperCase().trim();
    }

    if (search && search.trim()) {
      // Escape regex special characters so user input cannot break the query
      const safeSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(safeSearch, 'i');
      filter.$or = [
        { title: searchRegex },
        { fileName: searchRegex },
        { description: searchRegex }
      ];
    }

    const query = MediaDocument.find(filter)
      .populate('uploadedBy', 'fullName role originChurch')
      .sort({ createdAt: -1 });

    if (limit && !isNaN(Number(limit))) {
      query.limit(Number(limit));
    }

    const mediaList = await query.exec();

    return res.status(200).json({
      success: true,
      count: mediaList.length,
      media: mediaList
    });
  } catch (error) {
    console.error('[getAllMediaDocuments Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Faayiloota fiduun hin danda\'amne (Failed to fetch media documents).'
    });
  }
});

// @desc    Get single media document details
// @route   GET /api/media/document/:id
// @access  Public / All Members
router.get('/document/:id', async (req, res) => {
  try {
    const doc = await MediaDocument.findById(req.params.id).populate(
      'uploadedBy',
      'fullName role originChurch'
    );

    if (!doc) {
      return res.status(404).json({
        success: false,
        message: 'Galmeen faayilii hin argamne (Media document not found).'
      });
    }

    return res.status(200).json({
      success: true,
      media: doc
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Direct download trigger with original filename
// @route   GET /api/media/download/:id
// @access  Public
router.get('/download/:id', async (req, res) => {
  try {
    const doc = await MediaDocument.findById(req.params.id);

    if (!doc) {
      return res.status(404).json({
        success: false,
        message: 'Media document not found'
      });
    }

    // Cloudinary file: redirect to the CDN URL with the "attachment" flag (forces download)
    if (isCloudDoc(doc)) {
      const downloadUrl = doc.fileUrl.includes('/upload/')
        ? doc.fileUrl.replace('/upload/', '/upload/fl_attachment/')
        : doc.fileUrl;
      return res.redirect(downloadUrl);
    }

    // Legacy local file
    if (!doc.storedFileName) {
      return res.status(404).json({
        success: false,
        message: 'File record is incomplete (no stored file name).'
      });
    }

    const filePath = path.join(uploadDirectory, doc.storedFileName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Faayiliin diskii irra hin jiru (File not found on server storage).'
      });
    }

    return res.download(filePath, doc.fileName || doc.storedFileName);
  } catch (error) {
    console.error('[Download Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Buufachuun hin danda\'amne'
    });
  }
});

// @desc    Delete media document and its stored file (Cloudinary or local)
// @route   DELETE /api/media/document/:id or DELETE /api/media/file/:id
// @access  Private (SUPER_ADMIN, ADMIN, SECRETARY)
const deleteHandler = async (req, res) => {
  try {
    const doc = await MediaDocument.findById(req.params.id);

    if (!doc) {
      return res.status(404).json({
        success: false,
        message: 'Galmeen faayilii hin argamne (Media document not found).'
      });
    }

    if (isCloudDoc(doc)) {
      // Delete from Cloudinary (a failure here must not block removing the DB record)
      if (doc.storedFileName) {
        try {
          await cloudinary.uploader.destroy(doc.storedFileName, {
            resource_type: doc.cloudinaryResourceType || 'raw',
            invalidate: true
          });
        } catch (cloudErr) {
          console.warn('[Cloudinary Delete Warning]:', cloudErr.message);
        }
      }
    } else if (doc.storedFileName) {
      // Legacy local file
      const physicalPath = path.join(uploadDirectory, doc.storedFileName);
      if (fs.existsSync(physicalPath)) {
        try {
          fs.unlinkSync(physicalPath);
        } catch (unlinkErr) {
          console.warn('[Physical File Delete Warning]:', unlinkErr.message);
        }
      }
    }

    const deletedTitle = doc.title;
    const deletedCategory = doc.category;

    await doc.deleteOne();

    // Broadcast delete event
    if (req.io) {
      req.io.to('all_users_room').emit('delete_media_document', {
        id: req.params.id
      });
    }

    // Audit log
    await logAudit(
      req,
      'DELETE_MEDIA_DOCUMENT',
      `Deleted ${deletedCategory}: "${deletedTitle}" (ID: ${req.params.id})`
    );

    return res.status(200).json({
      success: true,
      message: 'Faayiliin milkaa\'inaan haqameera (File deleted successfully).'
    });
  } catch (error) {
    console.error('[deleteMediaDocument Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Faayilii haquun hin danda\'amne'
    });
  }
};

router.delete(
  '/document/:id',
  protect,
  roleMiddleware('SUPER_ADMIN', 'ADMIN', 'SECRETARY'),
  deleteHandler
);

router.delete(
  '/file/:id',
  protect,
  roleMiddleware('SUPER_ADMIN', 'ADMIN', 'SECRETARY'),
  deleteHandler
);

module.exports = router;