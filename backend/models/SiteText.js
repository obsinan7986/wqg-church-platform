const mongoose = require('mongoose');

const SiteTextSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: [true, 'Translation key is required'],
      unique: true,
      trim: true,
      index: true
    },
    om: {
      type: String,
      default: ''
    },
    am: {
      type: String,
      default: ''
    },
    en: {
      type: String,
      default: ''
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('SiteText', SiteTextSchema);
