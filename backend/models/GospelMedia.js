const mongoose = require('mongoose');

// Helper to extract 11-char YouTube Video ID from any format (watch, shorts, youtu.be, embed, raw ID)
const extractYouTubeId = (url) => {
  if (!url) return '';
  const trimmed = url.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
  );
  return match ? match[1] : '';
};

const GospelMediaSchema = new mongoose.Schema(
  {
    title: {
      om: { type: String, required: [true, 'Afaan Oromoo title is required'], trim: true },
      am: { type: String, default: '', trim: true },
      en: { type: String, default: '', trim: true }
    },
    description: {
      om: { type: String, default: '', trim: true },
      am: { type: String, default: '', trim: true },
      en: { type: String, default: '', trim: true }
    },
    youtubeUrl: {
      type: String,
      required: [true, 'YouTube URL is required'],
      trim: true
    },
    youtubeVideoId: {
      type: String,
      trim: true,
      default: function () {
        return extractYouTubeId(this.youtubeUrl);
      }
    },
    embedUrl: {
      type: String,
      trim: true,
      default: function () {
        const id = extractYouTubeId(this.youtubeUrl);
        return id ? `https://www.youtube.com/embed/${id}` : '';
      }
    },
    category: {
      type: String,
      enum: {
        values: ['GOSPEL', 'CHOIR', 'PRAYER', 'SERMON'],
        message: '{VALUE} is not a valid category'
      },
      default: 'GOSPEL',
      required: true
    },
    speakerOrSinger: {
      type: String,
      trim: true,
      default: 'St. George Fellowship'
    },
    thumbnailUrl: {
      type: String,
      trim: true,
      default: ''
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

GospelMediaSchema.pre('save', function (next) {
  if (this.isModified('youtubeUrl') || !this.youtubeVideoId || !this.embedUrl) {
    this.youtubeVideoId = extractYouTubeId(this.youtubeUrl);
    if (this.youtubeVideoId) {
      this.embedUrl = `https://www.youtube.com/embed/${this.youtubeVideoId}`;
    }
  }
  next();
});

GospelMediaSchema.index({ category: 1, createdAt: -1 });

module.exports = mongoose.model('GospelMedia', GospelMediaSchema);
