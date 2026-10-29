const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const { logAudit } = require('../utils/auditLogger');

// @desc    Get all members with filters for HR Management
// @route   GET /api/hr/members
// @access  Private (HR, ADMIN, SUPER_ADMIN)
exports.getAllMembers = async (req, res) => {
  try {
    const { originChurch, department, search } = req.query;
    const filter = {};

    if (originChurch && originChurch !== 'ALL') {
      filter.originChurch = originChurch;
    }

    if (department && department !== 'ALL') {
      filter.department = department;
    }

    const members = await User.find(filter)
      .select('fullName originChurch address email avatarUrl role department languagePref isOnline createdAt mustChangePassword')
      .sort({ createdAt: -1 });

    let results = members;
    if (search) {
      const q = search.toLowerCase();
      results = members.filter(
        (m) =>
          m.fullName?.toLowerCase().includes(q) ||
          m.address?.phone?.includes(q) ||
          m.originChurch?.toLowerCase().includes(q) ||
          m.address?.city?.toLowerCase().includes(q)
      );
    }

    res.status(200).json({
      success: true,
      count: results.length,
      members: results
    });
  } catch (error) {
    console.error('[getAllMembers Error]:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch members'
    });
  }
};

// @desc    Get single member by ID (for Digital Member ID card & details)
// @route   GET /api/hr/members/:id
// @access  Private (HR, ADMIN, SUPER_ADMIN, COLLECTOR)
exports.getMemberById = async (req, res) => {
  try {
    const member = await User.findById(req.params.id)
      .select('fullName originChurch address email avatarUrl avatarPublicId role department languagePref isOnline createdAt');

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    res.status(200).json({
      success: true,
      member
    });
  } catch (error) {
    console.error('[getMemberById Error]:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve member'
    });
  }
};

// @desc    Assign member to service department
// @route   PUT /api/hr/members/:id/department
// @access  Private (HR, ADMIN, SUPER_ADMIN)
exports.assignDepartment = async (req, res) => {
  try {
    const { department } = req.body;
    if (!department) {
      return res.status(400).json({
        success: false,
        message: 'Department is required'
      });
    }

    const member = await User.findById(req.params.id);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    member.department = department;
    await member.save();

    res.status(200).json({
      success: true,
      message: `Member department updated to ${department}`,
      member: {
        _id: member._id,
        fullName: member.fullName,
        department: member.department,
        originChurch: member.originChurch
      }
    });
  } catch (error) {
    console.error('[assignDepartment Error]:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to assign department'
    });
  }
};

// @desc    Record or update attendance session
// @route   POST /api/hr/attendance
// @access  Private (HR, ADMIN, SUPER_ADMIN)
exports.recordAttendance = async (req, res) => {
  try {
    const { title, date, serviceType, originChurch, presentMemberIds, notes } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Event title is required'
      });
    }

    const presentMembers = (presentMemberIds || []).map((id) => ({
      member: id,
      markedAt: new Date()
    }));

    const attendance = await Attendance.create({
      title: title.trim(),
      date: date ? new Date(date) : new Date(),
      serviceType: serviceType || 'SUNDAY_SERVICE',
      originChurch: originChurch || 'All Branches',
      presentMembers,
      recordedBy: req.user._id,
      notes: notes || ''
    });

    await attendance.populate([
      { path: 'recordedBy', select: 'fullName role' },
      { path: 'presentMembers.member', select: 'fullName originChurch department' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Attendance record saved successfully',
      attendance
    });
  } catch (error) {
    console.error('[recordAttendance Error]:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to record attendance'
    });
  }
};

// @desc    Get all attendance records
// @route   GET /api/hr/attendance
// @access  Private (HR, ADMIN, SUPER_ADMIN)
exports.getAttendanceList = async (req, res) => {
  try {
    const attendanceList = await Attendance.find()
      .populate('recordedBy', 'fullName role')
      .populate('presentMembers.member', 'fullName originChurch department')
      .sort({ date: -1 });

    res.status(200).json({
      success: true,
      count: attendanceList.length,
      attendance: attendanceList
    });
  } catch (error) {
    console.error('[getAttendanceList Error]:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance records'
    });
  }
};

// @desc    Admin / HR Reset Member Password
// @route   POST /api/hr/members/:id/reset-password
// @access  Private (SUPER_ADMIN, ADMIN, HR)
exports.resetMemberPassword = async (req, res) => {
  try {
    const member = await User.findById(req.params.id).select('+passwordHash');
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    // Generate temporary password with min 8 chars, uppercase, lowercase, digits
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const tempPassword = `Wqg#${randomHex}7`;

    const salt = await bcrypt.genSalt(10);
    member.passwordHash = await bcrypt.hash(tempPassword, salt);
    member.mustChangePassword = true;
    member.tokenVersion = (member.tokenVersion || 0) + 1;
    member.failedLoginAttempts = 0;
    member.lockUntil = null;
    await member.save();

    await logAudit(
      req,
      'PASSWORD_RESET',
      `Temporary password generated for member ${member.fullName} (${member.address?.phone}) by ${req.user.fullName} (${req.user.role})`
    );

    return res.status(200).json({
      success: true,
      message: `Temporary password generated for ${member.fullName}. Give this to the member. They must change it upon next login.`,
      temporaryPassword: tempPassword,
      member: {
        _id: member._id,
        fullName: member.fullName,
        phone: member.address?.phone,
        mustChangePassword: member.mustChangePassword
      }
    });
  } catch (error) {
    console.error('[resetMemberPassword Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to reset member password'
    });
  }
};
