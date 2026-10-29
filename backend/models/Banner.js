const mongoose = require('mongoose');

const BannerSchema = new mongoose.Schema(
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
      required: [true, 'Banner image URL is required'],
      trim: true
    },
    linkUrl: {
      type: String,
      default: '/services',
      trim: true
    },
    badge: {
      type: String,
      default: 'Ayyaana & Sagantaa Addaa',
      trim: true
    },
    order: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    },
    activeFrom: {
      type: Date,
      default: null
    },
    activeTo: {
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

BannerSchema.index({ isActive: 1, order: 1, createdAt: -1 });

module.exports = mongoose.model('Banner', BannerSchema);
