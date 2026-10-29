const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Attendance event title is required'],
      trim: true
    },
    date: {
      type: Date,
      default: Date.now
    },
    serviceType: {
      type: String,
      enum: {
        values: ['SUNDAY_SERVICE', 'PRAYER_NIGHT', 'CHOIR_REHEARSAL', 'GENERAL_ASSEMBLY', 'YOUTH_FELLOWSHIP'],
        message: '{VALUE} is not a valid service type'
      },
      default: 'SUNDAY_SERVICE'
    },
    originChurch: {
      type: String,
      default: 'All Branches'
    },
    presentMembers: [
      {
        member: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        markedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

AttendanceSchema.index({ date: -1 });

module.exports = mongoose.model('Attendance', AttendanceSchema);
