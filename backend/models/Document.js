const mongoose = require('mongoose');
const crypto = require('crypto');

const DocumentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Document title is required'],
      trim: true
    },
    referenceCode: {
      type: String,
      unique: true,
      default: () => {
        const year = new Date().getFullYear();
        const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
        return `DOC-${year}-${rand}`;
      }
    },
    type: {
      type: String,
      enum: {
        values: ['MINUTES', 'OFFICIAL_LETTER', 'AGENDA', 'ANNOUNCEMENT'],
        message: '{VALUE} is not a valid document type'
      },
      default: 'MINUTES',
      required: true
    },
    content: {
      type: String,
      required: [true, 'Document content is required'],
      trim: true
    },
    meetingDate: {
      type: Date,
      default: Date.now
    },
    documentDate: {
      type: Date,
      default: Date.now
    },
    attendeesCount: {
      type: Number,
      default: 0
    },
    tags: [
      {
        type: String,
        trim: true
      }
    ],
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: {
        values: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
        message: '{VALUE} is not a valid status'
      },
      default: 'PUBLISHED'
    }
  },
  {
    timestamps: true
  }
);

DocumentSchema.index({ type: 1, meetingDate: -1 });
DocumentSchema.index({ status: 1 });

module.exports = mongoose.model('Document', DocumentSchema);
