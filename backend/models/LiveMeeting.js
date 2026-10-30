const mongoose = require('mongoose');
const crypto = require('crypto');

const LiveCommentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    fullName: {
      type: String,
      required: true
    },
    originChurch: {
      type: String,
      default: 'Waldaa Angafa Wareegamtoota Qulquluu Giyoorgisii'
    },
    role: {
      type: String,
      default: 'MEMBER'
    },
    text: {
      type: String,
      required: [true, 'Comment text cannot be empty'],
      trim: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

const LiveMeetingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Live meeting title is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    scheduledDate: {
      type: Date,
      default: Date.now
    },
    meetingLink: {
      type: String,
      unique: true,
      default: () => 'wqg-' + crypto.randomBytes(4).toString('hex')
    },
    status: {
      type: String,
      enum: {
        values: ['SCHEDULED', 'LIVE', 'ENDED'],
        message: '{VALUE} is not a valid status'
      },
      default: 'SCHEDULED'
    },
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    waitingRoom: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    allowedParticipants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    allowedMicUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    allowedVideoUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    mutedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    videoOffUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    dislikes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    comments: [LiveCommentSchema]
  },
  {
    timestamps: true
  }
);

LiveMeetingSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('LiveMeeting', LiveMeetingSchema);
