const ContactMessage = require('../models/ContactMessage');
const Notification = require('../models/Notification');
const { logAudit } = require('../utils/auditLogger');

// In-memory rate limiting map: IP -> array of timestamps
const rateLimitMap = new Map();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

const checkRateLimit = (ip) => {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];

  // Filter out timestamps older than 1 hour
  const validTimestamps = timestamps.filter((time) => now - time < RATE_LIMIT_WINDOW_MS);

  if (validTimestamps.length >= RATE_LIMIT_MAX) {
    rateLimitMap.set(ip, validTimestamps);
    return false; // Rate limit exceeded
  }

  validTimestamps.push(now);
  rateLimitMap.set(ip, validTimestamps);
  return true;
};

/**
 * POST /api/contact (Public)
 */
const submitContactMessage = async (req, res) => {
  try {
    const ip =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      'unknown';

    // 1. Honeypot check: bots fill hidden fields
    const honeypot = req.body._gotcha || req.body.website || req.body.honeypot;
    if (honeypot) {
      console.warn(`[Contact Honeypot Triggered] Spambot detected from IP ${ip}`);
      // Return 200 to trick spam bots without saving
      return res.status(200).json({
        success: true,
        message: "Ergaan keessan milkaa'inaan dhiyaateera. (Message sent successfully)"
      });
    }

    // 2. IP Rate Limit check (5 messages per hour per IP)
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

    // Create Admin Notification for the Bell
    try {
      const notif = await Notification.create({
        title: {
          om: 'Ergaa Quunnamtii Haaraa',
          am: 'አዲስ የመልዕክት ጥያቄ',
          en: 'New Contact Message'
        },
        message: {
          om: `${trimmedName} (${trimmedContact}) irraa ergaan haaraa dhufeera.`,
          am: `ከ${trimmedName} አዲስ መልእክት ደርሷል።`,
          en: `New message received from ${trimmedName} (${trimmedContact}).`
        },
        type: 'ANNOUNCEMENT',
        link: '/dashboard?tab=contact-inbox'
      });

      const io = req.app.get('io');
      if (io) {
        io.emit('notification', notif);
        io.emit('new_contact_message', { id: newMsg._id, name: trimmedName, contact: trimmedContact });
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
 * List contact messages with status filter and pagination
 */
const getContactMessages = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status && ['NEW', 'READ', 'DONE'].includes(status)) {
      filter.status = status;
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
  updateContactMessageStatus,
  deleteContactMessage
};
