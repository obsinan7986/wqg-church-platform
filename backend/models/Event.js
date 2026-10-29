const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema(
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
    type: {
      type: String,
      enum: {
        values: ['CEREMONY', 'FEAST', 'MEETING', 'TRAINING', 'LIVE', 'OTHER'],
        message: '{VALUE} is not a valid event type'
      },
      default: 'OTHER'
    },
    startAt: {
      type: Date,
      required: [true, 'Event start date/time is required']
    },
    endAt: {
      type: Date,
      default: null
    },
    location: {
      type: String,
      default: '',
      trim: true
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
    linkUrl: {
      type: String,
      default: '',
      trim: true
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
    recurrence: {
      type: String,
      enum: {
        values: ['NONE', 'ETH_MONTHLY', 'ETH_YEARLY'],
        message: '{VALUE} is not a valid recurrence type'
      },
      default: 'NONE'
    },
    ethDay: {
      type: Number,
      min: 1,
      max: 30,
      default: null
    },
    ethMonth: {
      type: Number,
      min: 1,
      max: 13,
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

EventSchema.index({ status: 1, audience: 1, startAt: 1 });

module.exports = mongoose.model('Event', EventSchema);
