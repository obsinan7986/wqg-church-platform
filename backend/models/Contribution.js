const mongoose = require('mongoose');
const crypto = require('crypto');

const ContributionSchema = new mongoose.Schema(
  {
    receiptNumber: {
      type: String,
      unique: true,
      default: () => {
        const year = new Date().getFullYear();
        const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
        return `WQG-${year}-${rand}`;
      }
    },
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Member reference is required']
    },
    collector: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: function () {
        return this.status === 'PAID';
      }
    },
    type: {
      type: String,
      enum: {
        values: ['MONTHLY', 'TITHE', 'DONATION', 'SPECIAL_OFFERING'],
        message: '{VALUE} is not a valid contribution type'
      },
      default: 'MONTHLY',
      required: true
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [1, 'Amount must be at least 1 ETB']
    },
    paymentMethod: {
      type: String,
      enum: {
        values: ['CASH', 'BANK_TRANSFER', 'TELEBIRR', 'CBE_BIRR'],
        message: '{VALUE} is not a valid payment method'
      },
      default: 'TELEBIRR'
    },
    transactionRef: {
      type: String,
      trim: true,
      default: undefined
    },
    proofUrl: {
      type: String,
      default: null
    },
    proofPublicId: {
      type: String,
      default: null
    },
    originChurch: {
      type: String,
      required: [true, 'Origin Church is required'],
      trim: true
    },
    status: {
      type: String,
      enum: {
        values: ['PAID', 'PENDING', 'CANCELLED', 'REJECTED'],
        message: '{VALUE} is not a valid status'
      },
      default: 'PAID'
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    reviewedAt: {
      type: Date,
      default: null
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: ''
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    paymentDate: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Pre-save hook to ensure empty or whitespace transactionRef is omitted for sparse indexing
ContributionSchema.pre('save', function (next) {
  if (!this.transactionRef || typeof this.transactionRef !== 'string' || this.transactionRef.trim() === '') {
    this.transactionRef = undefined;
    this.set('transactionRef', undefined);
  }
  next();
});

ContributionSchema.index({ member: 1, paymentDate: -1 });
ContributionSchema.index({ originChurch: 1, paymentDate: -1 });
ContributionSchema.index({ status: 1 });
ContributionSchema.index(
  { paymentMethod: 1, transactionRef: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { transactionRef: { $type: 'string' } }
  }
);

module.exports = mongoose.model('Contribution', ContributionSchema);
