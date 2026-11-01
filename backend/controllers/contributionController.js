const mongoose = require('mongoose');
const Contribution = require('../models/Contribution');
const User = require('../models/User');
const Notification = require('../models/Notification');
const PaymentAccount = require('../models/PaymentAccount');
const { uploadProofToCloudinary, removeTempFile } = require('../middleware/paymentUploadMiddleware');
const { logAudit } = require('../utils/auditLogger');
const { getAddisDate, toEthiopian, toGregorian, daysInMonth } = require('../utils/ethiopianCalendar');

// @desc    Record a new contribution / payment directly by collector & generate receipt
// @route   POST /api/contributions
// @access  Private (COLLECTOR, ADMIN, SUPER_ADMIN)
exports.createContribution = async (req, res) => {
  let tempFilePath = req.file?.path;
  try {
    const { memberId, type, amount, paymentMethod, originChurch, notes, transactionRef, paymentDate } = req.body;

    if (!memberId) {
      removeTempFile(tempFilePath);
      return res.status(400).json({
        success: false,
        message: 'Select a member from the list'
      });
    }

    // Validate ObjectId to prevent CastError when a typed name or invalid string is sent
    if (!mongoose.isValidObjectId(memberId)) {
      removeTempFile(tempFilePath);
      return res.status(400).json({
        success: false,
        message: 'Select a member from the list'
      });
    }

    if (!amount || Number(amount) <= 0) {
      removeTempFile(tempFilePath);
      return res.status(400).json({
        success: false,
        message: 'Hangi qarshii 0 caaluu qaba (Amount must be greater than 0)'
      });
    }

    // Validate paymentDate not in future (judged in Addis Ababa time)
    const addisToday = getAddisDate();
    let finalPaymentDate = new Date();
    if (paymentDate) {
      const datePart = typeof paymentDate === 'string' ? paymentDate.split('T')[0] : '';
      if (datePart && datePart > addisToday.isoDate) {
        removeTempFile(tempFilePath);
        return res.status(400).json({
          success: false,
          message: 'Guyyaan kaffaltii gara fuulduraa ta\'uu hin danda\'u (Payment date cannot be in the future)'
        });
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(paymentDate.trim())) {
        const [y, m, d] = paymentDate.trim().split('-').map(Number);
        finalPaymentDate = new Date(Date.UTC(y, m - 1, d));
      } else {
        finalPaymentDate = new Date(paymentDate);
      }
    }

    const member = await User.findById(memberId);
    if (!member) {
      removeTempFile(tempFilePath);
      return res.status(404).json({
        success: false,
        message: 'Miseensi hin argamne (Member account not found)'
      });
    }

    // Optional proof upload for non-cash if collector uploads one
    let proofUrl = null;
    let proofPublicId = null;
    if (req.file) {
      const uploadRes = await uploadProofToCloudinary(req.file.path);
      proofUrl = uploadRes.proofUrl;
      proofPublicId = uploadRes.proofPublicId;
      tempFilePath = null; // already cleaned up by uploadProofToCloudinary
    }

    const cleanRef = transactionRef && typeof transactionRef === 'string' && transactionRef.trim() !== ''
      ? transactionRef.trim()
      : undefined;

    // Explicit check for unique transaction reference
    if (cleanRef) {
      const existingRef = await Contribution.findOne({
        paymentMethod: paymentMethod || 'TELEBIRR',
        transactionRef: cleanRef
      });
      if (existingRef) {
        removeTempFile(tempFilePath);
        return res.status(400).json({
          success: false,
          message: 'Lakk. Dabarsaa (Transaction Reference) kun kanaan dura itti fayyadameera (This transaction reference has already been used).'
        });
      }
    }

    const contribution = await Contribution.create({
      member: member._id,
      collector: req.user._id,
      reviewedBy: req.user._id,
      reviewedAt: new Date(),
      type: type || 'MONTHLY',
      amount: Number(amount),
      paymentMethod: paymentMethod || 'TELEBIRR',
      transactionRef: cleanRef,
      proofUrl,
      proofPublicId,
      originChurch: (originChurch && originChurch.trim()) || member.originChurch || 'Headquarters',
      notes: notes || '',
      status: 'PAID',
      paymentDate: finalPaymentDate
    });

    await contribution.populate([
      { path: 'member', select: 'fullName originChurch address email avatarUrl role department phone' },
      { path: 'collector', select: 'fullName originChurch role' },
      { path: 'reviewedBy', select: 'fullName role' }
    ]);

    // Audit log
    await logAudit(
      req,
      'CREATE_CONTRIBUTION',
      `Collector recorded payment of ${contribution.amount} ETB (${contribution.receiptNumber}) for member ${member.fullName}`
    );

    // Send real-time notification
    if (req.io) {
      req.io.to('all_users_room').emit('new_contribution_recorded', {
        receiptNumber: contribution.receiptNumber,
        memberId: member._id,
        amount: contribution.amount,
        type: contribution.type
      });

      req.io.to(`user_${member._id}`).emit('payment_status_updated', {
        contributionId: contribution._id,
        status: 'PAID',
        contribution,
        receiptNumber: contribution.receiptNumber
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Contribution recorded successfully',
      contribution
    });
  } catch (error) {
    removeTempFile(tempFilePath);
    console.error('[createContribution Error]:', error.message);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Lakk. Dabarsaa (Transaction Reference) kun kanaan dura itti fayyadameera (This transaction reference has already been used).'
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to record contribution'
    });
  }
};

// @desc    Submit payment by member for collector review
// @route   POST /api/contributions/submit
// @access  Private (Any authenticated member)
exports.submitContribution = async (req, res) => {
  let tempFilePath = req.file?.path;
  try {
    const { type, amount, paymentMethod, transactionRef, notes } = req.body;

    if (!amount || Number(amount) <= 0) {
      removeTempFile(tempFilePath);
      return res.status(400).json({
        success: false,
        message: 'Hangi qarshii 0 caaluu qaba (Amount must be greater than 0)'
      });
    }

    const selectedMethod = paymentMethod || 'TELEBIRR';

    // For non-cash methods: proof screenshot or reference is required
    const cleanRef = transactionRef && typeof transactionRef === 'string' && transactionRef.trim() !== ''
      ? transactionRef.trim()
      : undefined;

    // Explicit check for unique transaction reference
    if (cleanRef) {
      const existingRef = await Contribution.findOne({
        paymentMethod: paymentMethod || 'TELEBIRR',
        transactionRef: cleanRef
      });
      if (existingRef) {
        removeTempFile(tempFilePath);
        return res.status(400).json({
          success: false,
          message: 'Lakk. Dabarsaa (Transaction Reference) kun kanaan dura itti fayyadameera (This transaction reference has already been used).'
        });
      }
    }

    if (selectedMethod !== 'CASH' && !req.file && !cleanRef) {
      removeTempFile(tempFilePath);
      return res.status(400).json({
        success: false,
        message: 'Kaffaltii baankii/Telebirriif Lakk. Dabarsaa (Reference) ykn Suuraa Nagahee (Screenshot) dhiyeessuun dirqama (Reference or Screenshot proof is required for non-cash payments).'
      });
    }

    // Upload screenshot to Cloudinary folder "wqg/payments"
    let proofUrl = null;
    let proofPublicId = null;
    if (req.file) {
      const uploadRes = await uploadProofToCloudinary(req.file.path);
      proofUrl = uploadRes.proofUrl;
      proofPublicId = uploadRes.proofPublicId;
      tempFilePath = null; // cleaned up
    }

    const member = await User.findById(req.user._id);
    const originChurch = member?.originChurch || req.user.originChurch || 'Damee Haramaya / Finfinnee';

    // Validate transactionDate / paymentDate not in future (judged in Addis time)
    const addisToday = getAddisDate();
    const inputDate = req.body.transactionDate || req.body.paymentDate;
    let finalPaymentDate = new Date();
    if (inputDate) {
      const datePart = typeof inputDate === 'string' ? inputDate.split('T')[0] : '';
      if (datePart && datePart > addisToday.isoDate) {
        removeTempFile(tempFilePath);
        return res.status(400).json({
          success: false,
          message: 'Guyyaan kaffaltii gara fuulduraa ta\'uu hin danda\'u (Transaction date cannot be in the future)'
        });
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(inputDate.trim())) {
        const [y, m, d] = inputDate.trim().split('-').map(Number);
        finalPaymentDate = new Date(Date.UTC(y, m - 1, d));
      } else {
        finalPaymentDate = new Date(inputDate);
      }
    }

    const contribution = await Contribution.create({
      member: req.user._id,
      originChurch,
      status: 'PENDING',
      type: type || 'MONTHLY',
      amount: Number(amount),
      paymentMethod: selectedMethod,
      transactionRef: cleanRef,
      proofUrl,
      proofPublicId,
      notes: notes || '',
      paymentDate: finalPaymentDate
    });

    await contribution.populate([
      { path: 'member', select: 'fullName originChurch address email avatarUrl role department phone' }
    ]);

    // Audit log
    await logAudit(
      req,
      'SUBMIT_PAYMENT',
      `Member ${member?.fullName || req.user._id} submitted payment of ${contribution.amount} ETB via ${selectedMethod} for approval`
    );

    // Notify collectors and executive actors in real time
    if (req.io) {
      req.io.to('exec_5_actors_room').emit('new_pending_payment', {
        contribution
      });
      req.io.to('all_users_room').emit('payment_submitted', {
        contributionId: contribution._id,
        memberId: req.user._id,
        amount: contribution.amount
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Kaffaltiin keessan milkaa\'inaan dhiyaateera. Funaanaan yeroo mirkaneessu nagaheen isiniif kennama (Payment submitted successfully for collector approval).',
      contribution
    });
  } catch (error) {
    removeTempFile(tempFilePath);
    console.error('[submitContribution Error]:', error.message);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Lakk. Dabarsaa (Transaction Reference) kun kanaan dura itti fayyadameera (This transaction reference has already been used).'
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || 'Kaffaltii dhiyeessuun hin danda\'amne (Failed to submit payment)'
    });
  }
};

// @desc    Approve a pending contribution
// @route   PATCH /api/contributions/:id/approve
// @access  Private (COLLECTOR, ADMIN, SUPER_ADMIN)
exports.approveContribution = async (req, res) => {
  try {
    const contribution = await Contribution.findById(req.params.id);

    if (!contribution) {
      return res.status(404).json({
        success: false,
        message: 'Galmeen kaffaltii hin argamne (Contribution record not found)'
      });
    }

    if (contribution.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Kaffaltii haala '${contribution.status}' irra jiru mirkaneessuun hin danda'amu. Kaffaltii 'PENDING' qofatu mirkanaa'a (Only PENDING contributions can be reviewed).`
      });
    }

    // Conflict-of-interest check: nobody can approve their own payment
    if (contribution.member && contribution.member.toString() === req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Walitti bu\'iinsa fedhii: Kaffaltii ofii keessanii mirkaneessuun hin eeyyamamu (Conflict of interest: You cannot approve your own payment).'
      });
    }

    contribution.status = 'PAID';
    contribution.collector = req.user._id;
    contribution.reviewedBy = req.user._id;
    contribution.reviewedAt = new Date();
    await contribution.save();

    await contribution.populate([
      { path: 'member', select: 'fullName originChurch address email avatarUrl role department phone' },
      { path: 'collector', select: 'fullName originChurch role' },
      { path: 'reviewedBy', select: 'fullName role' }
    ]);

    // Audit log
    await logAudit(
      req,
      'APPROVE_PAYMENT',
      `Approved payment ${contribution.receiptNumber} (${contribution.amount} ETB) for member ${contribution.member?.fullName}`
    );

    // Create persistent notification for the member
    try {
      const notif = await Notification.create({
        title: {
          om: "Kaffaltiin Keessan Mirkanaa'eera",
          am: 'ክፍያዎ ጸድቋል',
          en: 'Payment Approved'
        },
        message: {
          om: `Kaffaltiin qarshii ${contribution.amount} ETB (${contribution.receiptNumber}) milkaa'inaan mirkanaa'eera. Nagahee keessan buufachuu dandeessu.`,
          am: `የ ${contribution.amount} ብር ክፍያዎ (${contribution.receiptNumber}) ጸድቋል። ደረሰኝዎን ማውረድ ይችላሉ።`,
          en: `Your payment of ${contribution.amount} ETB (${contribution.receiptNumber}) has been approved. You can now view and print your receipt.`
        },
        type: 'PAYMENT_REMINDER',
        link: '/dashboard?tab=finance',
        readBy: []
      });

      if (req.io) {
        req.io.to(`user_${contribution.member._id}`).emit('new_notification', {
          ...notif.toObject(),
          isRead: false
        });
      }
    } catch (notifErr) {
      console.warn('[Notification create error]:', notifErr.message);
    }

    // Emit real-time status event to user's personal room
    if (req.io) {
      req.io.to(`user_${contribution.member._id}`).emit('payment_status_updated', {
        contributionId: contribution._id,
        status: 'PAID',
        contribution,
        receiptNumber: contribution.receiptNumber
      });

      // Broadcast to collectors to update pending counts
      req.io.to('exec_5_actors_room').emit('contribution_reviewed', {
        contributionId: contribution._id,
        status: 'PAID',
        contribution
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Kaffaltiin milkaa\'inaan mirkanaa\'eera (Contribution approved successfully).',
      contribution
    });
  } catch (error) {
    console.error('[approveContribution Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to approve contribution'
    });
  }
};

// @desc    Reject a pending contribution
// @route   PATCH /api/contributions/:id/reject
// @access  Private (COLLECTOR, ADMIN, SUPER_ADMIN)
exports.rejectContribution = async (req, res) => {
  try {
    const { rejectionReason } = req.body;

    if (!rejectionReason || !rejectionReason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Sababa kaffaltichi itti hin fudhatamne ibsuun dirqama (Rejection reason is required).'
      });
    }

    const contribution = await Contribution.findById(req.params.id);

    if (!contribution) {
      return res.status(404).json({
        success: false,
        message: 'Galmeen kaffaltii hin argamne (Contribution record not found)'
      });
    }

    if (contribution.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Kaffaltii haala '${contribution.status}' irra jiru diduun hin danda'amu. Kaffaltii 'PENDING' qofatu didama (Only PENDING contributions can be reviewed).`
      });
    }

    // Conflict-of-interest check: nobody can reject their own payment
    if (contribution.member && contribution.member.toString() === req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Walitti bu\'iinsa fedhii: Kaffaltii ofii keessanii diduun hin eeyyamamu (Conflict of interest: You cannot reject your own payment).'
      });
    }

    contribution.status = 'REJECTED';
    contribution.rejectionReason = rejectionReason.trim();
    contribution.reviewedBy = req.user._id;
    contribution.reviewedAt = new Date();
    await contribution.save();

    await contribution.populate([
      { path: 'member', select: 'fullName originChurch address email avatarUrl role department phone' },
      { path: 'reviewedBy', select: 'fullName role' }
    ]);

    // Audit log
    await logAudit(
      req,
      'REJECT_PAYMENT',
      `Rejected payment ${contribution.receiptNumber} (${contribution.amount} ETB) for member ${contribution.member?.fullName}. Reason: ${rejectionReason.trim()}`
    );

    // Create persistent notification for the member
    try {
      const notif = await Notification.create({
        title: {
          om: 'Kaffaltiin Keessan Hin Fudhatamne',
          am: 'ክፍያዎ ውድቅ ተደርጓል',
          en: 'Payment Rejected'
        },
        message: {
          om: `Kaffaltiin qarshii ${contribution.amount} ETB hin fudhatamne. Sababa: ${contribution.rejectionReason}`,
          am: `የ ${contribution.amount} ብር ክፍያዎ ውድቅ ተደርጓል። ምክንያት፡ ${contribution.rejectionReason}`,
          en: `Your payment of ${contribution.amount} ETB was rejected. Reason: ${contribution.rejectionReason}`
        },
        type: 'PAYMENT_REMINDER',
        link: '/dashboard?tab=finance',
        readBy: []
      });

      if (req.io) {
        req.io.to(`user_${contribution.member._id}`).emit('new_notification', {
          ...notif.toObject(),
          isRead: false
        });
      }
    } catch (notifErr) {
      console.warn('[Notification create error]:', notifErr.message);
    }

    // Emit real-time status event to user's personal room
    if (req.io) {
      req.io.to(`user_${contribution.member._id}`).emit('payment_status_updated', {
        contributionId: contribution._id,
        status: 'REJECTED',
        rejectionReason: contribution.rejectionReason,
        contribution,
        receiptNumber: contribution.receiptNumber
      });

      // Broadcast to collectors to update pending counts
      req.io.to('exec_5_actors_room').emit('contribution_reviewed', {
        contributionId: contribution._id,
        status: 'REJECTED',
        contribution
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Kaffaltichi hin fudhatamne (Contribution rejected).',
      contribution
    });
  } catch (error) {
    console.error('[rejectContribution Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to reject contribution'
    });
  }
};

// @desc    Get all contributions with filters
// @route   GET /api/contributions
// @access  Private (COLLECTOR, ADMIN, SUPER_ADMIN)
exports.getContributions = async (req, res) => {
  try {
    const { originChurch, type, status, search, startDate, endDate, ethYear, ethMonth } = req.query;
    const filter = {};

    if (originChurch && originChurch !== 'ALL') {
      filter.originChurch = originChurch;
    }

    if (type && type !== 'ALL') {
      filter.type = type;
    }

    if (status && status !== 'ALL') {
      filter.status = status;
    }

    // Filter by Ethiopian Year and Month if provided
    if (ethYear && ethMonth) {
      const ey = Number(ethYear);
      const em = Number(ethMonth);
      const startGreg = toGregorian(ey, em, 1);
      const endGreg = toGregorian(ey, em, daysInMonth(ey, em));
      const gStart = new Date(Date.UTC(startGreg.year, startGreg.month - 1, startGreg.day, 0, 0, 0));
      const gEnd = new Date(Date.UTC(endGreg.year, endGreg.month - 1, endGreg.day, 23, 59, 59, 999));
      filter.paymentDate = { $gte: gStart, $lte: gEnd };
    } else if (startDate || endDate) {
      filter.paymentDate = {};
      if (startDate) {
        const [sy, sm, sd] = startDate.split('-').map(Number);
        filter.paymentDate.$gte = new Date(Date.UTC(sy, sm - 1, sd, 0, 0, 0));
      }
      if (endDate) {
        const [ey, em, ed] = endDate.split('-').map(Number);
        filter.paymentDate.$lte = new Date(Date.UTC(ey, em - 1, ed, 23, 59, 59, 999));
      }
    }

    let query = Contribution.find(filter)
      .populate('member', 'fullName originChurch address email avatarUrl role department phone')
      .populate('collector', 'fullName originChurch role')
      .populate('reviewedBy', 'fullName role')
      .sort({ createdAt: -1 });

    const contributions = await query.exec();

    // In-memory text search if search query provided
    let results = contributions;
    if (search) {
      const q = search.toLowerCase();
      results = contributions.filter(
        (c) =>
          c.receiptNumber?.toLowerCase().includes(q) ||
          c.member?.fullName?.toLowerCase().includes(q) ||
          c.member?.address?.phone?.includes(q) ||
          c.member?.phone?.includes(q) ||
          c.transactionRef?.toLowerCase().includes(q) ||
          c.originChurch?.toLowerCase().includes(q)
      );
    }

    return res.status(200).json({
      success: true,
      count: results.length,
      contributions: results
    });
  } catch (error) {
    console.error('[getContributions Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch contributions'
    });
  }
};

// @desc    Get contribution summary & metrics
// @route   GET /api/contributions/stats
// @access  Private (COLLECTOR, ADMIN, SUPER_ADMIN)
exports.getContributionStats = async (req, res) => {
  try {
    const allPaid = await Contribution.find({ status: 'PAID' });
    const pendingCount = await Contribution.countDocuments({ status: 'PENDING' });
    const rejectedCount = await Contribution.countDocuments({ status: 'REJECTED' });

    const totalRevenue = allPaid.reduce((acc, c) => acc + (c.amount || 0), 0);
    const count = allPaid.length;

    // By church breakdown
    const churchMap = {};
    allPaid.forEach((c) => {
      const church = c.originChurch || 'Other';
      churchMap[church] = (churchMap[church] || 0) + c.amount;
    });

    // By type breakdown
    const typeMap = {};
    allPaid.forEach((c) => {
      typeMap[c.type] = (typeMap[c.type] || 0) + c.amount;
    });

    // Monthly breakdown grouped by Ethiopian month
    const ethMonthlyMap = {};
    allPaid.forEach((c) => {
      const pDate = c.paymentDate || c.createdAt;
      const eth = toEthiopian(pDate);
      if (eth) {
        const key = `${eth.year}-${String(eth.month).padStart(2, '0')}`;
        ethMonthlyMap[key] = (ethMonthlyMap[key] || 0) + (c.amount || 0);
      }
    });

    return res.status(200).json({
      success: true,
      stats: {
        totalRevenue,
        count,
        pendingCount,
        rejectedCount,
        byChurch: churchMap,
        byType: typeMap,
        byEthMonth: ethMonthlyMap
      }
    });
  } catch (error) {
    console.error('[getContributionStats Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to calculate stats'
    });
  }
};

// @desc    Get current logged in user's contributions
// @route   GET /api/contributions/my
// @access  Private (All authenticated users)
exports.getMyContributions = async (req, res) => {
  try {
    const contributions = await Contribution.find({ member: req.user._id })
      .populate('collector', 'fullName originChurch')
      .populate('reviewedBy', 'fullName role')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: contributions.length,
      contributions
    });
  } catch (error) {
    console.error('[getMyContributions Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch your contributions'
    });
  }
};

// @desc    Get single contribution / receipt details
// @route   GET /api/contributions/:id
// @access  Private
exports.getContributionById = async (req, res) => {
  try {
    const contribution = await Contribution.findById(req.params.id)
      .populate('member', 'fullName originChurch address email avatarUrl department phone')
      .populate('collector', 'fullName originChurch role')
      .populate('reviewedBy', 'fullName role');

    if (!contribution) {
      return res.status(404).json({
        success: false,
        message: 'Contribution not found'
      });
    }

    // Authorization check: Members can only read their own contributions
    const isStaff = ['SUPER_ADMIN', 'ADMIN', 'COLLECTOR'].includes(req.user.role);
    const isOwner =
      contribution.member &&
      (contribution.member._id ? contribution.member._id.toString() : contribution.member.toString()) ===
        req.user._id.toString();

    if (!isStaff && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not authorized to view another member\'s payment record.'
      });
    }

    return res.status(200).json({
      success: true,
      contribution
    });
  } catch (error) {
    console.error('[getContributionById Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch contribution'
    });
  }
};

const SEED_PAYMENT_ACCOUNTS = [
  {
    method: 'TELEBIRR',
    accountName: 'Waldaa Amantoota Qulqulluu Giyoorgisii',
    accountNumber: '0911223344',
    instructions: 'Kaffaltii Telebirr raawwadhaa lakk. dabarsaa (SMS) ykn screenshot dhiyeessaa.'
  },
  {
    method: 'CBE_BIRR',
    accountName: 'Waldaa Amantoota Qulqulluu Giyoorgisii',
    accountNumber: '0911223344',
    instructions: 'Kaffaltii CBE Birr galchaa ragaa screenshot dhiyeessaa.'
  },
  {
    method: 'BANK_TRANSFER',
    accountName: 'Waldaa Qulqulluu Giyoorgisii',
    accountNumber: '1000123456789',
    bankName: 'Commercial Bank of Ethiopia (CBE)',
    instructions: 'Dabarsa Baankii Daldala Itoophiyaa (CBE). Lakk. dabarsaa FT... guutaa.'
  },
  {
    method: 'CASH',
    accountName: 'Kaffaltii Qophaa Callaa (Cash)',
    accountNumber: 'Funaantota Waldichaa Biratti',
    instructions: 'Funaantota beekamoo waldichaatti kallattiin kaffaluun nagahee harkaa fudhadhaa.'
  }
];

// @desc    Get active payment accounts (or all for ADMIN)
// @route   GET /api/contributions/payment-accounts
// @access  Private (All authenticated users)
exports.getPaymentAccounts = async (req, res) => {
  try {
    const count = await PaymentAccount.countDocuments();
    if (count === 0) {
      await PaymentAccount.insertMany(SEED_PAYMENT_ACCOUNTS);
    }

    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(req.user?.role);
    const filter = req.query.all === 'true' && isAdmin ? {} : { active: true };
    const accounts = await PaymentAccount.find(filter).sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      accounts
    });
  } catch (error) {
    console.error('[getPaymentAccounts Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch payment accounts'
    });
  }
};

// @desc    Create a payment account
// @route   POST /api/contributions/payment-accounts
// @access  Private (ADMIN, SUPER_ADMIN)
exports.createPaymentAccount = async (req, res) => {
  try {
    const { method, accountName, accountNumber, bankName, instructions, active } = req.body;

    if (!method || !accountName || !accountNumber) {
      return res.status(400).json({
        success: false,
        message: 'Method, accountName, and accountNumber are required fields.'
      });
    }

    const account = await PaymentAccount.create({
      method,
      accountName: accountName.trim(),
      accountNumber: accountNumber.trim(),
      bankName: bankName ? bankName.trim() : '',
      instructions: instructions ? instructions.trim() : '',
      active: active !== undefined ? active : true
    });

    await logAudit(
      req,
      'CREATE_PAYMENT_ACCOUNT',
      `Created payment account: ${account.method} (${account.accountNumber}) by ${req.user.fullName}`
    );

    return res.status(201).json({
      success: true,
      message: 'Payment account created successfully',
      account
    });
  } catch (error) {
    console.error('[createPaymentAccount Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create payment account'
    });
  }
};

// @desc    Update a payment account
// @route   PUT /api/contributions/payment-accounts/:id
// @access  Private (ADMIN, SUPER_ADMIN)
exports.updatePaymentAccount = async (req, res) => {
  try {
    const account = await PaymentAccount.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Payment account not found'
      });
    }

    await logAudit(
      req,
      'UPDATE_PAYMENT_ACCOUNT',
      `Updated payment account: ${account.method} (${account.accountNumber}) by ${req.user.fullName}`
    );

    return res.status(200).json({
      success: true,
      message: 'Payment account updated successfully',
      account
    });
  } catch (error) {
    console.error('[updatePaymentAccount Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update payment account'
    });
  }
};

// @desc    Delete a payment account
// @route   DELETE /api/contributions/payment-accounts/:id
// @access  Private (ADMIN, SUPER_ADMIN)
exports.deletePaymentAccount = async (req, res) => {
  try {
    const account = await PaymentAccount.findByIdAndDelete(req.params.id);

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Payment account not found'
      });
    }

    await logAudit(
      req,
      'DELETE_PAYMENT_ACCOUNT',
      `Deleted payment account: ${account.method} (${account.accountNumber}) by ${req.user.fullName}`
    );

    return res.status(200).json({
      success: true,
      message: 'Payment account deleted successfully'
    });
  } catch (error) {
    console.error('[deletePaymentAccount Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete payment account'
    });
  }
};
