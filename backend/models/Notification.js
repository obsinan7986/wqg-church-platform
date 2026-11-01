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
      enum: [
        'LIVE_STARTED',
        'NEW_SCHEDULE',
        'ANNOUNCEMENT',
        'PAYMENT_REMINDER',
        'CONTACT_MESSAGE',
        'GENERAL',
        'EVENT',
        'URGENT'
      ],
      default: 'GENERAL'
    },
    // audience: array of roles allowed to see this notification.
    // Empty array or null = visible to ALL roles (including MEMBER)
    audience: {
      type: [String],
      enum: ['SUPER_ADMIN', 'ADMIN', 'SECRETARY', 'HR', 'COLLECTOR', 'MEMBER'],
      default: []
    },
    // Frontend route or URL to navigate to when clicked
    link: {
      type: String,
      trim: true,
      default: null
    },
    // Reference model type (e.g. 'CONTACT_MESSAGE', 'EVENT')
    refType: {
      type: String,
      trim: true,
      default: null
    },
    // Reference document ID
    refId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    // Per-user read state: users who have marked this notification as read
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
NotificationSchema.index({ audience: 1 });
NotificationSchema.index({ readBy: 1 });

module.exports = mongoose.model('Notification', NotificationSchema);
