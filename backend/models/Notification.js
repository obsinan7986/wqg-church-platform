const mongoose = require('mongoose');

const LocalizedStringSchema = new mongoose.Schema(
  {
    om: {
      type: String,
      required: [true, 'Oromo text is required'],
      trim: true
    },
    am: {
      type: String,
      trim: true,
      default: ''
    },
    en: {
      type: String,
      trim: true,
      default: ''
    }
  },
  { _id: false }
);

const NotificationSchema = new mongoose.Schema(
  {
    title: {
      type: LocalizedStringSchema,
      required: [true, 'Notification title is required']
    },
    message: {
      type: LocalizedStringSchema,
      required: [true, 'Notification message is required']
    },
    type: {
      type: String,
      enum: {
        values: ['LIVE_STARTED', 'NEW_SCHEDULE', 'ANNOUNCEMENT', 'PAYMENT_REMINDER'],
        message: '{VALUE} is not a valid notification type'
      },
      required: true
    },
    link: {
      type: String,
      trim: true,
      default: null
    },
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ]
  },
  {
    timestamps: true
  }
);

NotificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
