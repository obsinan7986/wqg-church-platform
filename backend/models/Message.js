const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender is required']
    },
    channel: {
      type: String,
      enum: {
        values: ['EXEC_5_ACTORS', 'DIRECT', 'BROADCAST'],
        message: '{VALUE} is not a valid message channel'
      },
      default: 'EXEC_5_ACTORS'
    },
    content: {
      type: String,
      required: [true, 'Message content cannot be empty'],
      trim: true
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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

MessageSchema.index({ channel: 1, createdAt: 1 });
MessageSchema.index({ recipient: 1, createdAt: 1 });

module.exports = mongoose.model('Message', MessageSchema);
