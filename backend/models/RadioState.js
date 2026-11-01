const mongoose = require('mongoose');

const RadioQueueItemSchema = new mongoose.Schema(
  {
    mediaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GospelMedia',
      default: null
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    url: {
      type: String,
      default: '',
      trim: true
    },
    category: {
      type: String,
      enum: ['GOSPEL', 'CHOIR', 'SERMON', 'OTHER'],
      default: 'GOSPEL'
    },
    duration: {
      type: Number,
      default: 0 // Duration in seconds
    },
    sourceType: {
      type: String,
      enum: ['YOUTUBE'],
      default: 'YOUTUBE'
    },
    youtubeVideoId: {
      type: String,
      default: ''
    },
    thumbnailUrl: {
      type: String,
      default: ''
    }
  },
  { _id: true }
);

const RadioStateSchema = new mongoose.Schema(
  {
    mediaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GospelMedia',
      default: null
    },
    title: {
      type: String,
      default: ''
    },
    artist: {
      type: String,
      default: 'Waldaa Angafa Wareegamtoota Qulqulluu Giyoorgisii'
    },
    url: {
      type: String,
      default: ''
    },
    category: {
      type: String,
      enum: ['GOSPEL', 'CHOIR', 'SERMON', 'OTHER'],
      default: 'GOSPEL'
    },
    duration: {
      type: Number,
      default: 0
    },
    // Server UTC epoch time in ms when the song started/resumed playing
    startedAt: {
      type: Number,
      default: 0
    },
    // Server UTC epoch time in ms when paused (null if playing)
    pausedAt: {
      type: Number,
      default: null
    },
    isPlaying: {
      type: Boolean,
      default: false
    },
    volume: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.8
    },
    loop: {
      type: Boolean,
      default: false
    },
    startedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    startedByName: {
      type: String,
      default: ''
    },
    sourceType: {
      type: String,
      enum: ['YOUTUBE'],
      default: 'YOUTUBE'
    },
    youtubeVideoId: {
      type: String,
      default: ''
    },
    thumbnailUrl: {
      type: String,
      default: ''
    },
    queue: [RadioQueueItemSchema]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('RadioState', RadioStateSchema);
