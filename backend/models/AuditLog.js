const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    userName: {
      type: String,
      default: 'System / Guest'
    },
    userRole: {
      type: String,
      default: 'ANONYMOUS'
    },
    action: {
      type: String,
      required: [true, 'Audit action is required'],
      trim: true,
      index: true
    },
    details: {
      type: String,
      trim: true,
      default: ''
    },
    ipAddress: {
      type: String,
      default: '127.0.0.1'
    },
    userAgent: {
      type: String,
      default: ''
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true
  }
);

AuditLogSchema.index({ action: 1, timestamp: -1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
