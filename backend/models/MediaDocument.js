const mongoose = require('mongoose');

const MediaDocumentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title (Mata-duree / ርዕስ) is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    category: {
      type: String,
      enum: {
        values: ['BOOK', 'GOSPEL', 'CHOIR', 'SERMON'],
        message: '{VALUE} is not a valid category. Must be BOOK, GOSPEL, CHOIR, or SERMON'
      },
      required: [true, 'Category (Gosa / ምድብ) is required']
    },
    // Cloudinary: full https URL (secure_url). Legacy local files: "/uploads/xxx"
    fileUrl: {
      type: String,
      required: [true, 'File URL is required'],
      trim: true
    },
    fileName: {
      type: String,
      trim: true
    },
    // Cloudinary: the public_id (needed to delete the file later).
    // Legacy local files: the saved file name on disk.
    storedFileName: {
      type: String,
      trim: true
    },
    // Cloudinary resource type, needed for destroy(): image | video | raw
    // (audio files are stored by Cloudinary as "video")
    cloudinaryResourceType: {
      type: String,
      enum: ['image', 'video', 'raw'],
      default: 'raw'
    },
    fileType: {
      type: String,
      enum: ['PDF', 'AUDIO', 'VIDEO', 'OTHER'],
      default: 'OTHER'
    },
    mimeType: {
      type: String,
      trim: true
    },
    fileSize: {
      type: Number, // in bytes
      default: 0
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    recordedAt: {
      type: Date,
      default: null
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Uploaded by user reference is required']
    }
  },
  {
    timestamps: true
  }
);

// Indexes for fast lookup by category and creation date
MediaDocumentSchema.index({ category: 1, createdAt: -1 });
MediaDocumentSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('MediaDocument', MediaDocumentSchema);