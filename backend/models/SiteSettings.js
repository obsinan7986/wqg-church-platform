const mongoose = require('mongoose');

const LocalizedTextSchema = new mongoose.Schema(
  {
    om: { type: String, trim: true, default: '' },
    am: { type: String, trim: true, default: '' },
    en: { type: String, trim: true, default: '' }
  },
  { _id: false }
);

const SocialLinkSchema = new mongoose.Schema(
  {
    platform: {
      type: String,
      enum: ['FACEBOOK', 'YOUTUBE', 'TELEGRAM', 'TIKTOK', 'INSTAGRAM', 'WHATSAPP', 'OTHER'],
      required: true
    },
    url: {
      type: String,
      required: true,
      trim: true
    },
    enabled: {
      type: Boolean,
      default: true
    }
  },
  { _id: false }
);

const LiveMeetingSchema = new mongoose.Schema(
  {
    title: {
      type: LocalizedTextSchema,
      default: () => ({ om: '', am: '', en: '' })
    },
    platform: {
      type: String,
      enum: ['ZOOM', 'MEET', 'YOUTUBE', 'TELEGRAM', 'OTHER'],
      default: 'ZOOM'
    },
    url: {
      type: String,
      trim: true,
      default: ''
    },
    meetingId: {
      type: String,
      trim: true,
      default: ''
    },
    passcode: {
      type: String,
      trim: true,
      default: ''
    },
    isLive: {
      type: Boolean,
      default: false
    },
    nextStartAt: {
      type: Date,
      default: null
    },
    scheduleText: {
      type: LocalizedTextSchema,
      default: () => ({ om: '', am: '', en: '' })
    },
    visibility: {
      type: String,
      enum: ['PUBLIC', 'MEMBERS'],
      default: 'PUBLIC'
    }
  },
  { _id: false }
);

const SiteSettingsSchema = new mongoose.Schema(
  {
    emails: [
      {
        type: String,
        trim: true,
        lowercase: true
      }
    ],
    phones: [
      {
        type: String,
        trim: true
      }
    ],
    address: {
      type: LocalizedTextSchema,
      default: () => ({ om: '', am: '', en: '' })
    },
    mapUrl: {
      type: String,
      trim: true,
      default: ''
    },
    officeHours: {
      type: LocalizedTextSchema,
      default: () => ({ om: '', am: '', en: '' })
    },
    socialLinks: [SocialLinkSchema],
    liveMeeting: {
      type: LiveMeetingSchema,
      default: () => ({})
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('SiteSettings', SiteSettingsSchema);
