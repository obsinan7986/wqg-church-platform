const mongoose = require('mongoose');

const PaymentAccountSchema = new mongoose.Schema(
  {
    method: {
      type: String,
      enum: {
        values: ['TELEBIRR', 'CBE_BIRR', 'BANK_TRANSFER', 'CASH'],
        message: '{VALUE} is not a valid payment method'
      },
      required: [true, 'Payment method is required']
    },
    accountName: {
      type: String,
      required: [true, 'Account name is required'],
      trim: true
    },
    accountNumber: {
      type: String,
      required: [true, 'Account number is required'],
      trim: true
    },
    bankName: {
      type: String,
      trim: true,
      default: ''
    },
    instructions: {
      type: String,
      trim: true,
      default: ''
    },
    active: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

PaymentAccountSchema.index({ method: 1, active: 1 });

module.exports = mongoose.model('PaymentAccount', PaymentAccountSchema);
