const mongoose = require('mongoose');

const AnnouncementSchema = new mongoose.Schema(
  {
    title: {
      om: { type: String, default: '', trim: true },
      am: { type: String, default: '', trim: true },
      en: { type: String, default: '', trim: true }
    },
    description: {
      om: { type: String, default: '', trim: true },
      am: { type: String, default: '', trim: true },
      en: { type: String, default: '', trim: true }
    },
    imageUrl: {
      type: String,
      default: '',
      trim: true
    },
    imagePublicId: {
      type: String,
      default: '',
      trim: true
    },
    pinned: {
      type: Boolean,
      default: false
    },
    audience: {
      type: String,
      enum: {
        values: ['ALL', 'MEMBERS', 'STAFF'],
        message: '{VALUE} is not a valid audience'
      },
      default: 'ALL'
    },
    status: {
      type: String,
      enum: {
        values: ['DRAFT', 'PUBLISHED'],
        message: '{VALUE} is not a valid status'
      },
      default: 'DRAFT'
    },
    publishAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      default: null
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

AnnouncementSchema.index({ status: 1, audience: 1, publishAt: -1, pinned: -1 });

module.exports = mongoose.model('Announcement', AnnouncementSchema);
