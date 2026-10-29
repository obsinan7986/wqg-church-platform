const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const AddressSchema = new mongoose.Schema(
  {
    city: {
      type: String,
      required: [true, 'City (Magaalaa / ከተማ) is required'],
      trim: true
    },
    kebele: {
      type: String,
      required: [true, 'Kebele (Ganda / ቀበሌ) is required'],
      trim: true
    },
    phone: {
      type: String,
      required: [true, 'Phone number (Lakkoofsa Bilbilaa / ስልክ ቁጥር) is required'],
      trim: true
    }
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name (Maqaa Guutuu / ሙሉ ስም) is required'],
      trim: true
    },
    originChurch: {
      type: String,
      required: false,
      default: '',
      trim: true
    },
    address: {
      type: AddressSchema,
      required: [true, 'Address information is required']
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false // Excluded by default in queries for security
    },
    role: {
      type: String,
      enum: {
        values: ['SUPER_ADMIN', 'ADMIN', 'COLLECTOR', 'HR', 'SECRETARY', 'MEMBER'],
        message: '{VALUE} is not a valid user role'
      },
      default: 'MEMBER'
    },
    department: {
      type: String,
      trim: true,
      default: null
    },
    languagePref: {
      type: String,
      enum: ['om', 'am', 'en'],
      default: 'om'
    },
    calendarPref: {
      type: String,
      enum: ['ETHIOPIAN', 'GREGORIAN'],
      default: function () {
        return this.languagePref === 'en' ? 'GREGORIAN' : 'ETHIOPIAN';
      }
    },
    clockPref: {
      type: String,
      enum: ['INTERNATIONAL', 'ETHIOPIAN'],
      default: 'INTERNATIONAL'
    },
    isOnline: {
      type: Boolean,
      default: false
    },
    avatarUrl: {
      type: String,
      default: null
    },
    avatarPublicId: {
      type: String,
      default: null
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: undefined
    },
    passwordChangedAt: {
      type: Date,
      default: null
    },
    tokenVersion: {
      type: Number,
      default: 0
    },
    failedLoginAttempts: {
      type: Number,
      default: 0
    },
    lockUntil: {
      type: Date,
      default: null
    },
    lastLoginAt: {
      type: Date,
      default: null
    },
    mustChangePassword: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Index for phone lookup
UserSchema.index({ 'address.phone': 1 }, { unique: true });

// Sparse unique index for optional email
UserSchema.index({ email: 1 }, { unique: true, sparse: true });

// Pre-save hook to ensure blank email is undefined so sparse index won't collide
UserSchema.pre('save', function (next) {
  if (this.email === '' || this.email === null) {
    this.email = undefined;
  }
  next();
});

// Instance method to compare password
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.passwordHash);
};

module.exports = mongoose.model('User', UserSchema);
