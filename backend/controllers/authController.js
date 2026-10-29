const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { logAudit } = require('../utils/auditLogger');
const {
  uploadAvatarToCloudinary,
  deleteAvatarFromCloudinary,
  removeTempFile
} = require('../middleware/avatarUploadMiddleware');

/**
 * Generate JWT Token helper including tokenVersion
 */
const generateToken = (userOrId, tokenVersion = 0) => {
  const id = userOrId?._id || userOrId;
  const version = userOrId?.tokenVersion !== undefined ? userOrId.tokenVersion : tokenVersion;
  return jwt.sign({ id, tokenVersion: version }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d'
  });
};

/**
 * Format user payload for client responses
 */
const formatUserPayload = (user) => {
  return {
    _id: user._id,
    fullName: user.fullName,
    originChurch: user.originChurch,
    address: user.address,
    email: user.email || null,
    avatarUrl: user.avatarUrl || null,
    role: user.role,
    department: user.department,
    languagePref: user.languagePref,
    calendarPref: user.calendarPref || (user.languagePref === 'en' ? 'GREGORIAN' : 'ETHIOPIAN'),
    clockPref: user.clockPref || 'INTERNATIONAL',
    isOnline: user.isOnline,
    tokenVersion: user.tokenVersion || 0,
    mustChangePassword: Boolean(user.mustChangePassword),
    lastLoginAt: user.lastLoginAt || null,
    createdAt: user.createdAt
  };
};

/**
 * @desc    Register a new member
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res) => {
  try {
    const { fullName, originChurch, address, email, password, languagePref } = req.body;

    // Comprehensive validation
    if (!fullName || !password) {
      return res.status(400).json({
        success: false,
        message: 'fullName and password are required fields.'
      });
    }

    if (!address || !address.city || !address.kebele || !address.phone) {
      return res.status(400).json({
        success: false,
        message: 'Address with city, kebele, and phone number is required.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    // Check if phone number is already registered
    const normalizedPhone = address.phone.trim();
    const existingUser = await User.findOne({ 'address.phone': normalizedPhone });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: `A user with phone number '${normalizedPhone}' is already registered.`
      });
    }

    // Optional email check
    let cleanEmail = undefined;
    if (email && email.trim()) {
      cleanEmail = email.trim().toLowerCase();
      const existingEmail = await User.findOne({ email: cleanEmail });
      if (existingEmail) {
        return res.status(409).json({
          success: false,
          message: `The email address '${cleanEmail}' is already registered.`
        });
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user strictly with MEMBER role for public registrations
    const newUser = await User.create({
      fullName: fullName.trim(),
      originChurch: (originChurch || '').trim(),
      address: {
        city: address.city.trim(),
        kebele: address.kebele.trim(),
        phone: normalizedPhone
      },
      email: cleanEmail,
      passwordHash,
      role: 'MEMBER',
      languagePref: languagePref || 'om',
      calendarPref: req.body.calendarPref || (languagePref === 'en' ? 'GREGORIAN' : 'ETHIOPIAN'),
      clockPref: req.body.clockPref || 'INTERNATIONAL',
      tokenVersion: 0
    });

    const token = generateToken(newUser);
    await logAudit(req, 'REGISTER', `Member registered: ${newUser.fullName} (${newUser.address.phone})`, newUser);

    return res.status(201).json({
      success: true,
      message: 'Registration successful.',
      token,
      user: formatUserPayload(newUser)
    });
  } catch (error) {
    console.error('[Register Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during registration.',
      error: error.message
    });
  }
};

/**
 * @desc    Authenticate user by phone and password with hardening
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res) => {
  const GENERIC_ERROR_MSG = 'Invalid phone number or password credentials.';

  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and password are required.'
      });
    }

    const normalizedPhone = phone.trim();

    // Query user and explicitly select passwordHash
    const user = await User.findOne({ 'address.phone': normalizedPhone }).select('+passwordHash');

    if (!user) {
      await logAudit(req, 'LOGIN_FAILED', `Login failed: user with phone ${normalizedPhone} not found`);
      return res.status(401).json({
        success: false,
        message: GENERIC_ERROR_MSG
      });
    }

    // Check if account is temporarily locked (15 minutes after 5 failed attempts)
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const remainingMinutes = Math.ceil((user.lockUntil.getTime() - Date.now()) / (60 * 1000));
      await logAudit(req, 'LOGIN_FAILED', `Attempted login on locked account: ${user.fullName} (${normalizedPhone})`, user);
      return res.status(429).json({
        success: false,
        message: `Account is temporarily locked due to multiple failed login attempts. Please try again after ${remainingMinutes} minute(s).`
      });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

      // Lock account for 15 minutes on 5th failure
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
      }

      await user.save();
      await logAudit(req, 'LOGIN_FAILED', `Login failed: invalid password (Attempt ${user.failedLoginAttempts}) for ${normalizedPhone}`, user);

      return res.status(401).json({
        success: false,
        message: GENERIC_ERROR_MSG
      });
    }

    // Successful login: reset failed counters, update lastLoginAt
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    user.lastLoginAt = new Date();
    await user.save();

    const token = generateToken(user);
    await logAudit(req, 'LOGIN', `User logged in: ${user.fullName} (${user.role})`, user);

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: formatUserPayload(user)
    });
  } catch (error) {
    console.error('[Login Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during login.',
      error: error.message
    });
  }
};

/**
 * @desc    Get current authenticated user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      user: formatUserPayload(req.user)
    });
  } catch (error) {
    console.error('[GetMe Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching current profile.',
      error: error.message
    });
  }
};

/**
 * @desc    Update avatar (POST /api/auth/avatar)
 * @access  Private (All authenticated users)
 */
const uploadAvatar = async (req, res) => {
  let tempFilePath = req.file?.path;
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No avatar image file provided. Please choose a JPG, PNG, or WebP image under 2MB.'
      });
    }

    // Delete old avatar from Cloudinary / local
    if (req.user.avatarPublicId || req.user.avatarUrl) {
      await deleteAvatarFromCloudinary(req.user.avatarPublicId, req.user.avatarUrl);
    }

    // Upload new avatar to wqg/avatars
    const uploadRes = await uploadAvatarToCloudinary(req.file.path);
    tempFilePath = null; // cleaned up

    const user = await User.findById(req.user._id);
    user.avatarUrl = uploadRes.avatarUrl;
    user.avatarPublicId = uploadRes.avatarPublicId;
    await user.save();

    await logAudit(req, 'AVATAR_UPDATE', `User updated avatar: ${user.fullName}`, user);

    return res.status(200).json({
      success: true,
      message: 'Avatar updated successfully',
      avatarUrl: user.avatarUrl,
      user: formatUserPayload(user)
    });
  } catch (error) {
    removeTempFile(tempFilePath);
    console.error('[uploadAvatar Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload avatar'
    });
  }
};

/**
 * @desc    Delete avatar (DELETE /api/auth/avatar)
 * @access  Private (All authenticated users)
 */
const deleteAvatar = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user.avatarPublicId || user.avatarUrl) {
      await deleteAvatarFromCloudinary(user.avatarPublicId, user.avatarUrl);
    }

    user.avatarUrl = null;
    user.avatarPublicId = null;
    await user.save();

    await logAudit(req, 'AVATAR_DELETE', `User removed avatar: ${user.fullName}`, user);

    return res.status(200).json({
      success: true,
      message: 'Avatar deleted successfully',
      user: formatUserPayload(user)
    });
  } catch (error) {
    console.error('[deleteAvatar Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete avatar'
    });
  }
};

/**
 * @desc    Update profile (PATCH /api/auth/profile)
 *          Whitelist ONLY: fullName, originChurch, address.city, address.kebele, email, languagePref
 *          Never allow: role, passwordHash, tokenVersion
 * @access  Private (All authenticated users)
 */
const updateProfile = async (req, res) => {
  try {
    const { fullName, originChurch, address, email, languagePref, calendarPref, clockPref } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Strictly whitelist allowed fields
    if (fullName !== undefined) {
      if (!fullName.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Full name cannot be empty.'
        });
      }
      user.fullName = fullName.trim();
    }

    if (originChurch !== undefined) {
      user.originChurch = (originChurch || '').trim();
    }

    if (address) {
      if (address.city !== undefined) {
        user.address.city = address.city.trim();
      }
      if (address.kebele !== undefined) {
        user.address.kebele = address.kebele.trim();
      }
      // Note: phone change is strictly handled via changePhone with password confirmation
    }

    if (email !== undefined) {
      const cleanEmail = email ? email.trim().toLowerCase() : undefined;
      if (cleanEmail) {
        const existing = await User.findOne({ email: cleanEmail, _id: { $ne: user._id } });
        if (existing) {
          return res.status(409).json({
            success: false,
            message: 'Email address is already in use by another account.'
          });
        }
        user.email = cleanEmail;
      } else {
        user.email = undefined;
      }
    }

    if (languagePref !== undefined) {
      if (['om', 'am', 'en'].includes(languagePref)) {
        user.languagePref = languagePref;
      }
    }

    if (calendarPref !== undefined) {
      if (['ETHIOPIAN', 'GREGORIAN'].includes(calendarPref)) {
        user.calendarPref = calendarPref;
      }
    }

    if (clockPref !== undefined) {
      if (['INTERNATIONAL', 'ETHIOPIAN'].includes(clockPref)) {
        user.clockPref = clockPref;
      }
    }

    await user.save();
    await logAudit(req, 'PROFILE_UPDATE', `User updated profile fields: ${user.fullName}`, user);

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: formatUserPayload(user)
    });
  } catch (error) {
    console.error('[updateProfile Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update profile'
    });
  }
};

/**
 * @desc    Change password (PUT /api/auth/change-password)
 *          Policy: min 8 chars, uppercase, lowercase, number
 *          Must differ from current
 *          tokenVersion++ and return fresh token
 * @access  Private (All authenticated users)
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirm } = req.body;

    if (!currentPassword || !newPassword || !confirm) {
      return res.status(400).json({
        success: false,
        message: 'Current password, new password, and confirmation are required.'
      });
    }

    if (newPassword !== confirm) {
      return res.status(400).json({
        success: false,
        message: 'New password and confirmation password do not match.'
      });
    }

    // Min 8 chars, at least one uppercase, one lowercase, one number
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!strongPasswordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number.'
      });
    }

    const user = await User.findById(req.user._id).select('+passwordHash');

    // Verify current password
    const isCurrentMatch = await user.comparePassword(currentPassword);
    if (!isCurrentMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect.'
      });
    }

    // Must differ from current
    const isSameAsCurrent = await user.comparePassword(newPassword);
    if (isSameAsCurrent) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from your current password.'
      });
    }

    // Hash and update
    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    user.passwordChangedAt = new Date();
    user.mustChangePassword = false;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    await logAudit(req, 'PASSWORD_CHANGE', `User changed password: ${user.fullName}`, user);

    // Return fresh token with updated tokenVersion
    const freshToken = generateToken(user);

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully. All other devices have been logged out.',
      token: freshToken,
      user: formatUserPayload(user)
    });
  } catch (error) {
    console.error('[changePassword Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to change password'
    });
  }
};

/**
 * @desc    Change phone number (PUT /api/auth/change-phone)
 *          Requires current password and uniqueness check
 * @access  Private (All authenticated users)
 */
const changePhone = async (req, res) => {
  try {
    const { newPhone, currentPassword } = req.body;

    if (!newPhone || !currentPassword) {
      return res.status(400).json({
        success: false,
        message: 'New phone number and current password are required.'
      });
    }

    const normalizedPhone = newPhone.trim();

    const user = await User.findById(req.user._id).select('+passwordHash');

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect.'
      });
    }

    // Check uniqueness
    const existing = await User.findOne({
      'address.phone': normalizedPhone,
      _id: { $ne: user._id }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: `The phone number '${normalizedPhone}' is already in use by another account.`
      });
    }

    const oldPhone = user.address.phone;
    user.address.phone = normalizedPhone;
    await user.save();

    await logAudit(
      req,
      'PHONE_CHANGE',
      `User changed phone from ${oldPhone} to ${normalizedPhone}`,
      user
    );

    return res.status(200).json({
      success: true,
      message: 'Phone number updated successfully.',
      user: formatUserPayload(user)
    });
  } catch (error) {
    console.error('[changePhone Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to change phone number'
    });
  }
};

/**
 * @desc    Logout from all devices (POST /api/auth/logout-all)
 *          Increments tokenVersion to invalidate all existing tokens
 * @access  Private (All authenticated users)
 */
const logoutAll = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    await logAudit(req, 'LOGOUT_ALL', `User logged out of all devices: ${user.fullName}`, user);

    return res.status(200).json({
      success: true,
      message: 'Successfully logged out of all devices. Please log in again.'
    });
  } catch (error) {
    console.error('[logoutAll Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to logout of all devices'
    });
  }
};

/**
 * @desc    Get last 10 security events from AuditLog (GET /api/auth/security-activity)
 * @access  Private (All authenticated users)
 */
const getSecurityActivity = async (req, res) => {
  try {
    const activities = await AuditLog.find({
      user: req.user._id,
      action: {
        $in: [
          'LOGIN',
          'LOGIN_FAILED',
          'PASSWORD_CHANGE',
          'PROFILE_UPDATE',
          'PHONE_CHANGE',
          'LOGOUT_ALL',
          'AVATAR_UPDATE',
          'AVATAR_DELETE',
          'PASSWORD_RESET'
        ]
      }
    })
      .sort({ timestamp: -1 })
      .limit(10)
      .select('action details ipAddress userAgent timestamp');

    return res.status(200).json({
      success: true,
      count: activities.length,
      activities
    });
  } catch (error) {
    console.error('[getSecurityActivity Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch security activity'
    });
  }
};

/**
 * @desc    Create staff accounts (ADMIN, COLLECTOR, HR, SECRETARY)
 * @route   POST /api/auth/create-staff
 * @access  Private (SUPER_ADMIN only)
 */
const createStaff = async (req, res) => {
  try {
    const { fullName, originChurch, address, email, password, role, department, languagePref } = req.body;

    const allowedStaffRoles = ['ADMIN', 'COLLECTOR', 'HR', 'SECRETARY', 'SUPER_ADMIN'];

    if (!role || !allowedStaffRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid staff role. Permitted staff roles are: ${allowedStaffRoles.join(', ')}`
      });
    }

    if (!fullName || !password) {
      return res.status(400).json({
        success: false,
        message: 'fullName and password are required fields.'
      });
    }

    if (!address || !address.city || !address.kebele || !address.phone) {
      return res.status(400).json({
        success: false,
        message: 'Complete address with city, kebele, and phone is required.'
      });
    }

    const normalizedPhone = address.phone.trim();
    const existingUser = await User.findOne({ 'address.phone': normalizedPhone });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: `A staff member or user with phone number '${normalizedPhone}' already exists.`
      });
    }

    let cleanEmail = undefined;
    if (email && email.trim()) {
      cleanEmail = email.trim().toLowerCase();
      const existingEmail = await User.findOne({ email: cleanEmail });
      if (existingEmail) {
        return res.status(409).json({
          success: false,
          message: `The email address '${cleanEmail}' is already registered.`
        });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const staffUser = await User.create({
      fullName: fullName.trim(),
      originChurch: (originChurch || '').trim(),
      address: {
        city: address.city.trim(),
        kebele: address.kebele.trim(),
        phone: normalizedPhone
      },
      email: cleanEmail,
      passwordHash,
      role,
      department: department ? department.trim() : null,
      languagePref: languagePref || 'om',
      calendarPref: req.body.calendarPref || (languagePref === 'en' ? 'GREGORIAN' : 'ETHIOPIAN'),
      clockPref: req.body.clockPref || 'INTERNATIONAL',
      tokenVersion: 0
    });

    await logAudit(req, 'CREATE_STAFF', `Created staff account: ${staffUser.fullName} (${staffUser.role}) by ${req.user?.fullName}`);

    return res.status(201).json({
      success: true,
      message: `Staff member account with role '${role}' created successfully.`,
      user: formatUserPayload(staffUser)
    });
  } catch (error) {
    console.error('[CreateStaff Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while creating staff account.',
      error: error.message
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
  uploadAvatar,
  deleteAvatar,
  updateProfile,
  changePassword,
  changePhone,
  logoutAll,
  getSecurityActivity,
  createStaff,
  formatUserPayload,
  generateToken
};
