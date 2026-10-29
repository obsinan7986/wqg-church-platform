const Event = require('../models/Event');
const Notification = require('../models/Notification');
const { logAudit } = require('../utils/auditLogger');
const { toEthiopian, toGregorian } = require('../utils/ethiopianCalendar');
const {
  uploadImageToCloudinary,
  removeTempFile
} = require('../middleware/contentImageUploadMiddleware');

// @desc    Upload event image
// @route   POST /api/events/upload
// @access  Private (ADMIN, SUPER_ADMIN, SECRETARY)
exports.uploadEventImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image uploaded'
      });
    }

    const uploadRes = await uploadImageToCloudinary(req.file.path, 'wqg/events');

    return res.status(200).json({
      success: true,
      message: 'Event image uploaded',
      url: uploadRes.url,
      publicId: uploadRes.public_id
    });
  } catch (error) {
    removeTempFile(req.file?.path);
    console.error('[uploadEventImage Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload event image'
    });
  }
};

// @desc    Get public events (No login required, safe fields only)
// @route   GET /api/events/public
// @access  Public
exports.getPublicEvents = async (req, res) => {
  try {
    const { upcoming, month, year, limit } = req.query;
    const now = new Date();
    const filter = {
      status: 'PUBLISHED',
      audience: 'ALL'
    };

    if (upcoming === 'true') {
      filter.$or = [
        { endAt: { $gte: now } },
        { startAt: { $gte: now } }
      ];
    }

    if (month && year) {
      const startOfMonth = new Date(Number(year), Number(month) - 1, 1);
      const endOfMonth = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);
      filter.startAt = { $gte: startOfMonth, $lte: endOfMonth };
    }

    const maxLimit = parseInt(limit, 10) || (upcoming === 'true' ? 6 : 50);

    const events = await Event.find(filter)
      .select('_id title description type startAt endAt location imageUrl linkUrl recurrence ethDay ethMonth')
      .sort({ startAt: 1 })
      .lean();

    // Expand recurring church events for the next 90 days
    const expanded = [];
    const windowStart = now;
    const windowEnd = new Date(now.getTime() + 90 * 86400000);

    for (const ev of events) {
      if (!ev.recurrence || ev.recurrence === 'NONE') {
        expanded.push(ev);
        continue;
      }

      // Base event if in window
      if (new Date(ev.startAt) >= windowStart && new Date(ev.startAt) <= windowEnd) {
        expanded.push(ev);
      }

      const durationMs = ev.endAt ? new Date(ev.endAt).getTime() - new Date(ev.startAt).getTime() : 0;
      const originalStart = new Date(ev.startAt);

      // Iterate day by day in 90-day window
      const currentScan = new Date(windowStart);
      while (currentScan <= windowEnd) {
        const ethScan = toEthiopian(currentScan);
        if (ethScan) {
          let matches = false;
          if (ev.recurrence === 'ETH_MONTHLY' && ev.ethDay) {
            if (ethScan.day === Number(ev.ethDay)) matches = true;
          } else if (ev.recurrence === 'ETH_YEARLY' && ev.ethDay && ev.ethMonth) {
            if (ethScan.month === Number(ev.ethMonth) && ethScan.day === Number(ev.ethDay)) matches = true;
          }

          if (matches) {
            const occStart = new Date(currentScan);
            occStart.setUTCHours(originalStart.getUTCHours(), originalStart.getUTCMinutes(), 0, 0);
            const occEnd = durationMs > 0 ? new Date(occStart.getTime() + durationMs) : null;

            const isOriginal = Math.abs(occStart.getTime() - originalStart.getTime()) < 3600000 * 24;
            if (!isOriginal && occStart >= windowStart && occStart <= windowEnd) {
              expanded.push({
                ...ev,
                _id: `${ev._id}_occ_${occStart.toISOString().slice(0, 10)}`,
                startAt: occStart,
                endAt: occEnd,
                isRecurringOccurrence: true
              });
            }
          }
        }
        currentScan.setDate(currentScan.getDate() + 1);
      }
    }

    expanded.sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
    const finalEvents = expanded.slice(0, maxLimit);

    res.set('Cache-Control', 'public, max-age=60');

    return res.status(200).json({
      success: true,
      count: finalEvents.length,
      events: finalEvents
    });
  } catch (error) {
    console.error('[getPublicEvents Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch public events'
    });
  }
};

// @desc    Get all events (Staff Dashboard with filters & search)
// @route   GET /api/events
// @access  Private (SUPER_ADMIN, ADMIN, SECRETARY)
exports.getAdminEvents = async (req, res) => {
  try {
    const { status, type, audience, search } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (type) filter.type = type;
    if (audience) filter.audience = audience;

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { 'title.om': { $regex: q, $options: 'i' } },
        { 'title.am': { $regex: q, $options: 'i' } },
        { 'title.en': { $regex: q, $options: 'i' } },
        { location: { $regex: q, $options: 'i' } }
      ];
    }

    const events = await Event.find(filter)
      .populate('createdBy', 'fullName role originChurch avatarUrl')
      .sort({ startAt: -1 });

    return res.status(200).json({
      success: true,
      count: events.length,
      events
    });
  } catch (error) {
    console.error('[getAdminEvents Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch events'
    });
  }
};

// @desc    Create event
// @route   POST /api/events
// @access  Private (SUPER_ADMIN, ADMIN, SECRETARY - Secretary drafts only)
exports.createEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      startAt,
      endAt,
      location,
      imageUrl,
      imagePublicId,
      linkUrl,
      audience,
      status,
      recurrence,
      ethDay,
      ethMonth,
      notifyMembers
    } = req.body;

    const resolvedTitleOm = (title?.om || title?.am || title?.en || (typeof title === 'string' ? title : '')).trim();
    if (!resolvedTitleOm) {
      return res.status(400).json({
        success: false,
        message: 'Event title is required'
      });
    }

    const resolvedDescOm = (description?.om || description?.am || description?.en || (typeof description === 'string' ? description : '') || resolvedTitleOm).trim();

    if (!startAt) {
      return res.status(400).json({
        success: false,
        message: 'Event start date/time is required'
      });
    }

    if (endAt && new Date(endAt) <= new Date(startAt)) {
      return res.status(400).json({
        success: false,
        message: 'Event end date/time must be after the start date/time'
      });
    }

    // Role check: SECRETARY can only create DRAFT
    let finalStatus = status || 'DRAFT';
    if (req.user.role === 'SECRETARY') {
      finalStatus = 'DRAFT';
    }

    const event = await Event.create({
      title: {
        om: resolvedTitleOm,
        am: title?.am ? title.am.trim() : resolvedTitleOm,
        en: title?.en ? title.en.trim() : resolvedTitleOm
      },
      description: {
        om: resolvedDescOm,
        am: description?.am ? description.am.trim() : resolvedDescOm,
        en: description?.en ? description.en.trim() : resolvedDescOm
      },
      type: type || 'OTHER',
      startAt: new Date(startAt),
      endAt: endAt ? new Date(endAt) : null,
      location: location ? location.trim() : '',
      imageUrl: imageUrl ? imageUrl.trim() : '',
      imagePublicId: imagePublicId ? imagePublicId.trim() : '',
      linkUrl: linkUrl ? linkUrl.trim() : '',
      audience: audience || 'ALL',
      status: finalStatus,
      recurrence: recurrence || 'NONE',
      ethDay: ethDay ? Number(ethDay) : null,
      ethMonth: ethMonth ? Number(ethMonth) : null,
      createdBy: req.user._id
    });

    await event.populate('createdBy', 'fullName role originChurch avatarUrl');

    await logAudit(
      req,
      'CREATE_EVENT',
      `Event created: "${event.title.om}" (${event._id}, Type: ${event.type}, Status: ${event.status})`
    );

    // Option "Notify members" on publish
    if (notifyMembers && event.status === 'PUBLISHED') {
      const notification = await Notification.create({
        title: {
          om: `Sagantaa Haaraa: ${event.title.om}`,
          am: `አዲስ መርሐ-ግብር: ${event.title.am || event.title.om}`,
          en: `New Event: ${event.title.en || event.title.om}`
        },
        message: {
          om: `${event.description.om.substring(0, 150)} (Bakka: ${event.location || 'St. George'})`,
          am: `${(event.description.am || event.description.om).substring(0, 150)} (ቦታ: ${event.location || 'ቅዱስ ጊዮርጊስ'})`,
          en: `${(event.description.en || event.description.om).substring(0, 150)} (Venue: ${event.location || 'St. George'})`
        },
        type: 'ANNOUNCEMENT',
        link: `/events`,
        readBy: [req.user._id]
      });

      if (req.io) {
        req.io.to('all_users_room').emit('new_notification', {
          ...notification.toObject(),
          isRead: false
        });
      }
    }

    if (req.io) {
      req.io.to('all_users_room').emit('content_updated', {
        type: 'EVENT',
        id: event._id
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Event created successfully',
      event
    });
  } catch (error) {
    console.error('[createEvent Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create event'
    });
  }
};

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Private (SUPER_ADMIN, ADMIN)
exports.updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const {
      title,
      description,
      type,
      startAt,
      endAt,
      location,
      imageUrl,
      imagePublicId,
      linkUrl,
      audience,
      status,
      recurrence,
      ethDay,
      ethMonth,
      notifyMembers
    } = req.body;

    const effStart = startAt !== undefined ? new Date(startAt) : event.startAt;
    const effEnd = endAt !== undefined ? (endAt ? new Date(endAt) : null) : event.endAt;
    if (effStart && effEnd && effEnd <= effStart) {
      return res.status(400).json({
        success: false,
        message: 'Event end date/time must be after the start date/time'
      });
    }

    if (title?.om) event.title.om = title.om.trim();
    if (title?.am !== undefined) event.title.am = title.am.trim();
    if (title?.en !== undefined) event.title.en = title.en.trim();

    if (description?.om) event.description.om = description.om.trim();
    if (description?.am !== undefined) event.description.am = description.am.trim();
    if (description?.en !== undefined) event.description.en = description.en.trim();

    if (type !== undefined) event.type = type;
    if (startAt !== undefined) event.startAt = new Date(startAt);
    if (endAt !== undefined) event.endAt = endAt ? new Date(endAt) : null;
    if (location !== undefined) event.location = location.trim();
    if (imageUrl !== undefined) event.imageUrl = imageUrl.trim();
    if (imagePublicId !== undefined) event.imagePublicId = imagePublicId.trim();
    if (linkUrl !== undefined) event.linkUrl = linkUrl.trim();
    if (audience !== undefined) event.audience = audience;
    if (status !== undefined) event.status = status;
    if (recurrence !== undefined) event.recurrence = recurrence;
    if (ethDay !== undefined) event.ethDay = ethDay ? Number(ethDay) : null;
    if (ethMonth !== undefined) event.ethMonth = ethMonth ? Number(ethMonth) : null;

    await event.save();
    await event.populate('createdBy', 'fullName role originChurch avatarUrl');

    await logAudit(
      req,
      'UPDATE_EVENT',
      `Event updated: "${event.title.om}" (${event._id}, Status: ${event.status})`
    );

    if (notifyMembers && event.status === 'PUBLISHED') {
      const notification = await Notification.create({
        title: {
          om: `Sagantaa Haaraa: ${event.title.om}`,
          am: `አዲስ መርሐ-ግብር: ${event.title.am || event.title.om}`,
          en: `New Event: ${event.title.en || event.title.om}`
        },
        message: {
          om: `${event.description.om.substring(0, 150)} (Bakka: ${event.location || 'St. George'})`,
          am: `${(event.description.am || event.description.om).substring(0, 150)} (ቦታ: ${event.location || 'ቅዱስ ጊዮርጊስ'})`,
          en: `${(event.description.en || event.description.om).substring(0, 150)} (Venue: ${event.location || 'St. George'})`
        },
        type: 'ANNOUNCEMENT',
        link: `/events`,
        readBy: [req.user._id]
      });

      if (req.io) {
        req.io.to('all_users_room').emit('new_notification', {
          ...notification.toObject(),
          isRead: false
        });
      }
    }

    if (req.io) {
      req.io.to('all_users_room').emit('content_updated', {
        type: 'EVENT',
        id: event._id
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Event updated successfully',
      event
    });
  } catch (error) {
    console.error('[updateEvent Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update event'
    });
  }
};

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Private (SUPER_ADMIN, ADMIN)
exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    await event.deleteOne();

    await logAudit(
      req,
      'DELETE_EVENT',
      `Event deleted: "${event.title.om}" (${event._id})`
    );

    if (req.io) {
      req.io.to('all_users_room').emit('content_updated', {
        type: 'EVENT',
        id: req.params.id
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('[deleteEvent Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete event'
    });
  }
};
