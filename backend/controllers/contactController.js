const ContactMessage = require('../models/ContactMessage');
const Notification = require('../models/Notification');
const { logAudit } = require('../utils/auditLogger');

// In-memory rate limiting map: ip -> Array of timestamps
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_WINDOW = 5;

/**
 * Clean up expired rate-limit timestamps
 */
const checkRateLimit = (ip) => {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];
  const validTimestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (validTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    rateLimitMap.set(ip, validTimestamps);
    return false;
  }

  validTimestamps.push(now);
  rateLimitMap.set(ip, validTimestamps);
  return true;
};

/**
 * POST /api/contact (Public)
 * Rate limit 5/hour/IP, honeypot spam protection, admin notification
 */
const submitContactMessage = async (req, res) => {
  try {
    const ip =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      '127.0.0.1';

    // Honeypot spam check
    const honeypot = req.body._gotcha || req.body.website || req.body.honeypot;
    if (honeypot) {
      console.warn(`[Contact Honeypot Triggered] Spambot detected from IP ${ip}`);
      return res.status(200).json({
        success: true,
        message: "Ergaan keessan milkaa'inaan nu gaheera. Galatoomaa!"
      });
    }

    // Rate limiter
    if (!checkRateLimit(ip)) {
      return res.status(429).json({
        success: false,
        message: "Baay'ee daftanii ergaa ergitan. Sa'aatii tokko booda deebi'aa yaalaa. (Too many requests. Please try again after an hour.)"
      });
    }

    const { name, contact, subject, message } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Maqaa galchuun dirqama. (Name is required)' });
    }

    if (!contact || typeof contact !== 'string' || !contact.trim()) {
      return res.status(400).json({ success: false, message: 'Imeelii ykn bilbila galchuun dirqama. (Email or Phone is required)' });
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Ergaa galchuun dirqama. (Message is required)' });
    }

    const trimmedName = name.trim().slice(0, 100);
    const trimmedContact = contact.trim().slice(0, 150);
    const trimmedSubject = (subject || '').trim().slice(0, 200);
    const trimmedMessage = message.trim().slice(0, 3000);

    const newMsg = await ContactMessage.create({
      name: trimmedName,
      contact: trimmedContact,
      subject: trimmedSubject,
      message: trimmedMessage,
      ip,
      status: 'NEW'
    });

    // Create Admin Notification for the Bell:
    // audience: ["SUPER_ADMIN", "ADMIN"]
    // title: "New contact message"
    // preview: first 80 characters, NO email or phone
    const shortPreview = trimmedMessage.slice(0, 80);

    try {
      const notif = await Notification.create({
        title: {
          om: 'Ergaa Quunnamtii Haaraa',
          am: 'አዲስ የመልእክት ጥያቄ',
          en: 'New contact message'
        },
        message: {
          om: shortPreview,
          am: shortPreview,
          en: shortPreview
        },
        type: 'CONTACT_MESSAGE',
        audience: ['SUPER_ADMIN', 'ADMIN'],
        refType: 'CONTACT_MESSAGE',
        refId: newMsg._id,
        link: `/dashboard?tab=contact-inbox&id=${newMsg._id}`
      });

      const io = req.app?.get('io');
      if (io) {
        // Emit ONLY to the admin room (never to all_users_room or member sockets)
        io.to('admin_room').emit('new_notification', {
          ...notif.toObject(),
          isRead: false
        });
        io.to('admin_room').emit('new_contact_message', {
          id: newMsg._id,
          name: trimmedName,
          subject: trimmedSubject
        });
      }
    } catch (notifErr) {
      console.warn('[Contact notification error]:', notifErr.message);
    }

    return res.status(201).json({
      success: true,
      message: "Ergaan keessan milkaa'inaan nu gaheera. Galatoomaa! (Message submitted successfully!)",
      id: newMsg._id
    });
  } catch (error) {
    console.error('[submitContactMessage Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit contact message. Please try again later.'
    });
  }
};

/**
 * GET /api/contact (SUPER_ADMIN, ADMIN)
 * List contact messages with status filter, search, and pagination
 */
const getContactMessages = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (status && ['NEW', 'READ', 'DONE'].includes(status)) {
      filter.status = status;
    }

    if (search && typeof search === 'string' && search.trim()) {
      const sRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { name: sRegex },
        { contact: sRegex },
        { subject: sRegex },
        { message: sRegex }
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [messages, total, unreadCount] = await Promise.all([
      ContactMessage.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      ContactMessage.countDocuments(filter),
      ContactMessage.countDocuments({ status: 'NEW' })
    ]);

    return res.status(200).json({
      success: true,
      messages,
      total,
      unreadCount,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1
    });
  } catch (error) {
    console.error('[getContactMessages Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve messages.'
    });
  }
};

/**
 * GET /api/contact/:id (SUPER_ADMIN, ADMIN)
 * Get single contact message and auto-mark as READ if NEW
 */
const getContactMessageById = async (req, res) => {
  try {
    const { id } = req.params;
    let msg = await ContactMessage.findById(id);

    if (!msg) {
      return res.status(404).json({ success: false, message: 'Message not found.' });
    }

    if (msg.status === 'NEW') {
      msg.status = 'READ';
      await msg.save();
    }

    return res.status(200).json({
      success: true,
      message: msg
    });
  } catch (error) {
    console.error('[getContactMessageById Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve message.'
    });
  }
};

/**
 * PATCH /api/contact/:id/status (SUPER_ADMIN, ADMIN)
 */
const updateContactMessageStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['NEW', 'READ', 'DONE'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }

    const msg = await ContactMessage.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!msg) {
      return res.status(404).json({ success: false, message: 'Message not found.' });
    }

    await logAudit(req, 'UPDATE_CONTACT_STATUS', { messageId: id, newStatus: status });

    return res.status(200).json({
      success: true,
      message: `Status updated to ${status}`,
      messageItem: msg
    });
  } catch (error) {
    console.error('[updateContactMessageStatus Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update message status.'
    });
  }
};

/**
 * DELETE /api/contact/:id (SUPER_ADMIN, ADMIN)
 */
const deleteContactMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const msg = await ContactMessage.findByIdAndDelete(id);

    if (!msg) {
      return res.status(404).json({ success: false, message: 'Message not found.' });
    }

    await logAudit(req, 'DELETE_CONTACT_MESSAGE', { messageId: id, name: msg.name });

    return res.status(200).json({
      success: true,
      message: "Ergaan haaqameera. (Message deleted successfully)"
    });
  } catch (error) {
    console.error('[deleteContactMessage Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete message.'
    });
  }
};

module.exports = {
  submitContactMessage,
  getContactMessages,
  getContactMessageById,
  updateContactMessageStatus,
  deleteContactMessage
};
