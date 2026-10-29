const mongoose = require('mongoose');

const ScheduleItemSchema = new mongoose.Schema(
  {
    group: {
      type: String,
      enum: {
        values: ['SUNDAY_SERVICE', 'YOUTH', 'LIVE'],
        message: '{VALUE} is not a valid schedule group'
      },
      required: [true, 'Schedule group is required']
    },
    when: {
      om: { type: String, default: '', trim: true },
      am: { type: String, default: '', trim: true },
      en: { type: String, default: '', trim: true }
    },
    what: {
      om: { type: String, default: '', trim: true },
      am: { type: String, default: '', trim: true },
      en: { type: String, default: '', trim: true }
    },
    startMinutes: {
      type: Number,
      required: [true, 'startMinutes is required'],
      min: [0, 'startMinutes must be between 0 and 1439'],
      max: [1439, 'startMinutes must be between 0 and 1439'],
      default: 0
    },
    endMinutes: {
      type: Number,
      required: [true, 'endMinutes is required'],
      min: [0, 'endMinutes must be between 0 and 1439'],
      max: [1439, 'endMinutes must be between 0 and 1439'],
      default: 60
    },
    endsNextDay: {
      type: Boolean,
      default: false
    },
    clockType: {
      type: String,
      enum: ['INTERNATIONAL', 'ETHIOPIAN'],
      default: 'INTERNATIONAL'
    },
    customTime: {
      type: String,
      default: '',
      trim: true
    },
    time: {
      type: String,
      default: '',
      trim: true
    },
    startTime: {
      type: String,
      default: '',
      trim: true
    },
    endTime: {
      type: String,
      default: '',
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
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
);

ScheduleItemSchema.index({ group: 1, order: 1, isActive: 1 });

module.exports = mongoose.model('ScheduleItem', ScheduleItemSchema);
