const ScheduleItem = require('../models/ScheduleItem');
const Notification = require('../models/Notification');
const { logAudit } = require('../utils/auditLogger');

// Helper to convert minutes (0-1439) to HH:mm string
const minutesToHHMM = (m) => {
  if (typeof m !== 'number' || isNaN(m)) return '00:00';
  const bounded = Math.max(0, Math.min(1439, Math.floor(m)));
  const hours = Math.floor(bounded / 60);
  const mins = bounded % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

// Helper to convert HH:mm string or number to minutes
const parseMinutes = (val) => {
  if (typeof val === 'number') {
    return isNaN(val) ? null : Math.floor(val);
  }
  if (!val || typeof val !== 'string') return null;
  const match = val.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
};

// Regex detecting clock time in text (e.g. 12:00, 5:30 - 6:30, 08:00 AM)
const TIME_PATTERN_REGEX = /^\s*(\d{1,2}(:\d{2})?(\s*[-to–]\s*\d{1,2}(:\d{2})?)?(\s*(am|pm|AM|PM))?)\s*$/;

// Comprehensive input validator conforming to API contract
const validateSchedulePayload = (body, isUpdate = false) => {
  const errors = {};
  const {
    group,
    when,
    what,
    startMinutes,
    endMinutes,
    startTime,
    endTime,
    endsNextDay,
    clockType,
    customTime,
    order,
    isActive
  } = body;

  // 1. Group validation
  if (!isUpdate || group !== undefined) {
    if (!group) {
      errors.group = 'Garee sagantaa (group) filachuun dirqama (Group is required)';
    } else if (!['SUNDAY_SERVICE', 'YOUTH', 'LIVE'].includes(group)) {
      errors.group = 'Gareen sagantaa SUNDAY_SERVICE, YOUTH, ykn LIVE ta\'uu qaba';
    }
  }

  // 2. What validation (resolves across languages)
  const resolvedWhatOm = what && typeof what === 'object'
    ? (what.om || what.am || what.en || '').trim()
    : typeof what === 'string' ? what.trim() : '';
  if (!isUpdate || what !== undefined) {
    if (!resolvedWhatOm) {
      errors['what.om'] = 'Gosa tajaajilaa (What) galchuun dirqama (What is required)';
    }
  }

  // 3. When validation (resolves across languages)
  const resolvedWhenOm = when && typeof when === 'object'
    ? (when.om || when.am || when.en || 'Yeroo hunda').trim()
    : typeof when === 'string' && when.trim() ? when.trim() : 'Yeroo hunda';
  if (!isUpdate || when !== undefined) {
    if (!resolvedWhenOm) {
      errors['when.om'] = 'Yeroo (When) galchuun dirqama (When is required)';
    } else if (TIME_PATTERN_REGEX.test(resolvedWhenOm)) {
      errors['when.om'] = 'Yeroon (when) ibsa yeroo ta\'uu qaba (fkn: "Galgalaa yeroo hunda"), sa\'aatii ta\'uu hin danda\'u (When must be a descriptive phrase, not a clock time)';
    }
  }

  // 4. Minutes resolution and validation
  let resolvedStart = null;
  if (startMinutes !== undefined && startMinutes !== null && startMinutes !== '') {
    resolvedStart = parseMinutes(startMinutes);
  } else if (startTime) {
    resolvedStart = parseMinutes(startTime);
  }

  let resolvedEnd = null;
  if (endMinutes !== undefined && endMinutes !== null && endMinutes !== '') {
    resolvedEnd = parseMinutes(endMinutes);
  } else if (endTime) {
    resolvedEnd = parseMinutes(endTime);
  }

  if (!isUpdate || resolvedStart !== null) {
    if (resolvedStart === null || resolvedStart < 0 || resolvedStart > 1439) {
      errors.startMinutes = 'Sa\'aatiin jalqabaa (startMinutes) 0 hanga 1439 gidduu ta\'uu qaba';
    }
  }

  if (!isUpdate || resolvedEnd !== null) {
    if (resolvedEnd === null || resolvedEnd < 0 || resolvedEnd > 1439) {
      errors.endMinutes = 'Sa\'aatiin xumuraa (endMinutes) 0 hanga 1439 gidduu ta\'uu qaba';
    }
  }

  const isEndsNextDay = Boolean(endsNextDay === true || endsNextDay === 'true');

  // 5. Time sequence rule: end > start unless endsNextDay
  if (resolvedStart !== null && resolvedEnd !== null && !errors.startMinutes && !errors.endMinutes) {
    if (!isEndsNextDay && resolvedEnd <= resolvedStart) {
      errors.endMinutes = 'Sa\'aatiin xumuraa sa\'aatii jalqabaa booda ta\'uu qaba ykn "Guyyaa itti aanutti xumurama" (endsNextDay) filadhu';
    }
  }

  // 6. Order validation
  let resolvedOrder = undefined;
  if (order !== undefined && order !== null && order !== '') {
    const parsedOrder = Number(order);
    if (!Number.isInteger(parsedOrder) || parsedOrder < 0) {
      errors.order = 'Tartiibni (order) lakkoofsa guutuu >= 0 ta\'uu qaba';
    } else {
      resolvedOrder = parsedOrder;
    }
  }

  // 7. Active status validation
  let resolvedActive = undefined;
  if (isActive !== undefined) {
    resolvedActive = isActive === true || isActive === 'true';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    data: {
      group,
      when: when ? {
        om: resolvedWhenOm,
        am: (when.am || resolvedWhenOm).trim(),
        en: (when.en || resolvedWhenOm).trim()
      } : undefined,
      what: what ? {
        om: resolvedWhatOm,
        am: (what.am || resolvedWhatOm).trim(),
        en: (what.en || resolvedWhatOm).trim()
      } : undefined,
      startMinutes: resolvedStart,
      endMinutes: resolvedEnd,
      endsNextDay: isEndsNextDay,
      clockType: clockType === 'ETHIOPIAN' ? 'ETHIOPIAN' : 'INTERNATIONAL',
      customTime: customTime !== undefined ? customTime.trim() : undefined,
      order: resolvedOrder,
      isActive: resolvedActive
    }
  };
};

// Initial seed data if collection is empty
const INITIAL_SCHEDULE_SEED = [
  // SUNDAY_SERVICE
  {
    group: 'SUNDAY_SERVICE',
    when: { om: 'Galgalaa yeroo hunda', am: 'ዘወትር ምሽት', en: 'Every Evening' },
    startMinutes: 1050, // 17:30
    endMinutes: 1110,   // 18:30
    time: '17:30 - 18:30',
    startTime: '17:30',
    endTime: '18:30',
    endsNextDay: false,
    clockType: 'INTERNATIONAL',
    what: { om: 'Kadhana', am: 'ጸሎት', en: 'Prayer' },
    order: 1,
    isActive: true
  },
  {
    group: 'SUNDAY_SERVICE',
    when: { om: 'Galgalaa yeroo hunda', am: 'ዘወትር ምሽት', en: 'Every Evening' },
    startMinutes: 900,  // 15:00
    endMinutes: 960,   // 16:00
    time: '15:00 - 16:00',
    startTime: '15:00',
    endTime: '16:00',
    endsNextDay: false,
    clockType: 'INTERNATIONAL',
    what: { om: 'Kadhana', am: 'ጸሎት', en: 'Prayer' },
    order: 2,
    isActive: true
  },
  {
    group: 'SUNDAY_SERVICE',
    when: { om: 'Waree booda yeroo hunda', am: 'ዘወትር ከሰዓት', en: 'Every Afternoon' },
    startMinutes: 660,  // 11:00
    endMinutes: 720,   // 12:00
    time: '11:00 - 12:00',
    startTime: '11:00',
    endTime: '12:00',
    endsNextDay: false,
    clockType: 'INTERNATIONAL',
    what: { om: 'Kadhana', am: 'ጸሎት', en: 'Prayer' },
    order: 3,
    isActive: true
  },
  {
    group: 'SUNDAY_SERVICE',
    when: { om: 'Waree booda yeroo hunda', am: 'ዘወትር ከሰዓት', en: 'Every Afternoon' },
    startMinutes: 540,  // 09:00
    endMinutes: 600,   // 10:00
    time: '09:00 - 10:00',
    startTime: '09:00',
    endTime: '10:00',
    endsNextDay: false,
    clockType: 'INTERNATIONAL',
    what: { om: 'Kadhana', am: 'ጸሎት', en: 'Prayer' },
    order: 4,
    isActive: true
  },
  {
    group: 'SUNDAY_SERVICE',
    when: { om: 'Guyyaa yeroo hunda', am: 'ዘወትር ቀን', en: 'Every Day' },
    startMinutes: 360,  // 06:00
    endMinutes: 420,   // 07:00
    time: '06:00 - 07:00',
    startTime: '06:00',
    endTime: '07:00',
    endsNextDay: false,
    clockType: 'INTERNATIONAL',
    what: { om: 'Kadhana', am: 'ጸሎት', en: 'Prayer' },
    order: 5,
    isActive: true
  },
  {
    group: 'SUNDAY_SERVICE',
    when: { om: 'Ganamaa yeroo hunda', am: 'ዘወትር ጠዋት', en: 'Every Morning' },
    startMinutes: 180,  // 03:00
    endMinutes: 240,   // 04:00
    time: '03:00 - 04:00',
    startTime: '03:00',
    endTime: '04:00',
    endsNextDay: false,
    clockType: 'INTERNATIONAL',
    what: { om: 'Kadhana', am: 'ጸሎት', en: 'Prayer' },
    order: 6,
    isActive: true
  },

  // YOUTH
  {
    group: 'YOUTH',
    when: { om: 'Waree duraa yeroo hunda', am: 'ዘወትር ከሰዓት በፊት', en: 'Every Morning' },
    startMinutes: 300,
    endMinutes: 360,
    time: '05:00 - 06:00',
    startTime: '05:00',
    endTime: '06:00',
    endsNextDay: false,
    clockType: 'INTERNATIONAL',
    what: { om: 'Farfanaa', am: 'ዝማሬ', en: 'Hymn Praise' },
    order: 1,
    isActive: true
  },
  {
    group: 'YOUTH',
    when: { om: 'Waree booda yeroo hunda', am: 'ዘወትር ከሰዓት', en: 'Every Afternoon' },
    startMinutes: 420,
    endMinutes: 480,
    time: '07:00 - 08:00',
    startTime: '07:00',
    endTime: '08:00',
    endsNextDay: false,
    clockType: 'INTERNATIONAL',
    what: { om: 'Faruu shaakalii', am: 'የዝማሬ ልምምድ', en: 'Choir Rehearsal' },
    order: 2,
    isActive: true
  },
  {
    group: 'YOUTH',
    when: { om: 'Waree booda yeroo hunda', am: 'ዘወትር ከሰዓት', en: 'Every Afternoon' },
    startMinutes: 480,
    endMinutes: 540,
    time: '08:00 - 09:00',
    startTime: '08:00',
    endTime: '09:00',
    endsNextDay: false,
    clockType: 'INTERNATIONAL',
    what: { om: 'Yaada waljijiruu', am: 'የሐሳብ ልውውጥ', en: 'Youth Discussion' },
    order: 3,
    isActive: true
  },
  {
    group: 'YOUTH',
    when: { om: 'Waree booda yeroo hunda', am: 'ዘወትር ከሰዓት', en: 'Every Afternoon' },
    startMinutes: 600,
    endMinutes: 660,
    time: '10:00 - 11:00',
    startTime: '10:00',
    endTime: '11:00',
    endsNextDay: false,
    clockType: 'INTERNATIONAL',
    what: { om: 'Gafi fi Debbi', am: 'ጥያቄና መልስ', en: 'Q&A Fellowship' },
    order: 4,
    isActive: true
  },
  {
    group: 'YOUTH',
    when: { om: 'Galgalaa yeroo hunda', am: 'ዘወትር ምሽት', en: 'Every Evening' },
    startMinutes: 720,
    endMinutes: 810,
    time: '12:00 - 13:30',
    startTime: '12:00',
    endTime: '13:30',
    endsNextDay: false,
    clockType: 'INTERNATIONAL',
    what: { om: "Gi'eezii", am: 'ግዕዝ ቋንቋ', en: "Ge'ez Liturgy" },
    order: 5,
    isActive: true
  },

  // LIVE
  {
    group: 'LIVE',
    when: { om: 'Galgalaa yeroo hunda', am: 'ዘወትር ምሽት', en: 'Every Evening' },
    startMinutes: 90,
    endMinutes: 180,
    time: '01:30 - 03:00',
    startTime: '01:30',
    endTime: '03:00',
    endsNextDay: false,
    clockType: 'INTERNATIONAL',
    what: { om: 'Korsii abbaa keenyaa', am: 'የአባቶቻችን ትምህርት', en: 'Church Fathers Course' },
    order: 1,
    isActive: true
  },
  {
    group: 'LIVE',
    when: { om: 'Galagaa yerro hundaa', am: 'ዘወትር ምሽት', en: 'Every Evening' },
    startMinutes: 240,
    endMinutes: 330,
    time: '04:00 - 05:30',
    startTime: '04:00',
    endTime: '05:30',
    endsNextDay: false,
    clockType: 'INTERNATIONAL',
    what: { om: 'Korsii', am: 'መንፈሳዊ ኮርስ', en: 'Spiritual Course' },
    order: 2,
    isActive: true
  },
  {
    group: 'LIVE',
    when: { om: 'Ganama subi', am: 'ንጋት ላይ', en: 'Early Dawn' },
    startMinutes: 360,
    endMinutes: 540,
    time: '06:00 - 09:00',
    startTime: '06:00',
    endTime: '09:00',
    endsNextDay: false,
    clockType: 'INTERNATIONAL',
    what: { om: 'Qidaase', am: 'ቅዳሴ', en: 'Divine Liturgy' },
    order: 3,
    isActive: true
  },
  {
    group: 'LIVE',
    when: { om: 'Ganamaa yeroo hunda', am: 'ዘወትር ጠዋት', en: 'Every Morning' },
    startMinutes: 240,
    endMinutes: 300,
    time: '04:00 - 05:00',
    startTime: '04:00',
    endTime: '05:00',
    endsNextDay: false,
    clockType: 'INTERNATIONAL',
    what: { om: 'Wangeelaa', am: 'ወንጌል ስብከት', en: 'Gospel Preaching' },
    order: 4,
    isActive: true
  }
];

// Ensure initial seed runs if collection is empty
exports.seedIfEmpty = async () => {
  try {
    const count = await ScheduleItem.countDocuments();
    if (count === 0) {
      await ScheduleItem.insertMany(INITIAL_SCHEDULE_SEED);
      console.log('[Schedule] Initial weekly schedule items seeded successfully.');
    }
  } catch (err) {
    console.error('[Schedule Seed Error]:', err.message);
  }
};

// @desc    Get public weekly schedule items grouped by group
// @route   GET /api/schedule/public
// @access  Public
exports.getPublicSchedule = async (req, res) => {
  try {
    const count = await ScheduleItem.countDocuments();
    if (count === 0) {
      await ScheduleItem.insertMany(INITIAL_SCHEDULE_SEED);
    }

    const items = await ScheduleItem.find({ isActive: true })
      .select('_id group when what startMinutes endMinutes endsNextDay clockType customTime time startTime endTime order isActive createdAt')
      .sort({ group: 1, order: 1, createdAt: 1 })
      .lean();

    const grouped = {
      SUNDAY_SERVICE: [],
      YOUTH: [],
      LIVE: []
    };

    items.forEach((item) => {
      if (grouped[item.group]) {
        grouped[item.group].push(item);
      }
    });

    res.set('Cache-Control', 'public, max-age=60');

    return res.status(200).json({
      success: true,
      items,
      grouped
    });
  } catch (error) {
    console.error('[getPublicSchedule Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch public schedule'
    });
  }
};

// @desc    Get all schedule items (Dashboard admin)
// @route   GET /api/schedule
// @access  Private (SUPER_ADMIN, ADMIN, SECRETARY)
exports.getAdminSchedule = async (req, res) => {
  try {
    const { group } = req.query;
    const filter = {};
    if (group) filter.group = group;

    const items = await ScheduleItem.find(filter)
      .sort({ group: 1, order: 1, createdAt: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: items.length,
      items
    });
  } catch (error) {
    console.error('[getAdminSchedule Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch schedule'
    });
  }
};

// @desc    Create schedule item
// @route   POST /api/schedule
// @access  Private (SUPER_ADMIN, ADMIN, SECRETARY)
exports.createScheduleItem = async (req, res) => {
  try {
    const validation = validateSchedulePayload(req.body, false);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: Object.values(validation.errors)[0],
        errors: validation.errors
      });
    }

    const {
      group,
      when,
      what,
      startMinutes,
      endMinutes,
      endsNextDay,
      clockType,
      customTime,
      order,
      isActive
    } = validation.data;

    // Default order = highest order in group + 1
    let finalOrder = order;
    if (finalOrder === undefined) {
      const highestItem = await ScheduleItem.findOne({ group }).sort({ order: -1 }).select('order').lean();
      finalOrder = highestItem && typeof highestItem.order === 'number' ? highestItem.order + 1 : 1;
    }

    const startTime = minutesToHHMM(startMinutes);
    const endTime = minutesToHHMM(endMinutes);
    const effectiveTime = customTime && customTime.trim()
      ? customTime.trim()
      : `${startTime} - ${endTime}${endsNextDay ? ' (+1)' : ''}`;

    const item = await ScheduleItem.create({
      group,
      when,
      what,
      startMinutes,
      endMinutes,
      endsNextDay,
      clockType,
      customTime: customTime || '',
      time: effectiveTime,
      startTime,
      endTime,
      order: finalOrder,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user ? req.user._id : null
    });

    await logAudit(
      req,
      'CREATE_SCHEDULE_ITEM',
      `Schedule item created: "${item.what.om}" (${item.group}, ${item.time})`
    );

    // Option "Notify members" on schedule update
    if (req.body.notifyMembers) {
      const notification = await Notification.create({
        title: {
          om: 'Sagantaa Kadhannaa Haaraa!',
          am: 'አዲስ የጸሎት መርሐ-ግብር!',
          en: 'Updated Weekly Prayer Schedule!'
        },
        message: {
          om: `Sagantaan torbee haaromfameera: ${item.what.om} (${item.when.om}, Sa'aatii ${item.time})`,
          am: `የሳምንቱ መርሐ-ግብር ተሻሽሏል: ${item.what.am || item.what.om} (${item.time})`,
          en: `Weekly schedule updated: ${item.what.en || item.what.om} (${item.time})`
        },
        type: 'NEW_SCHEDULE',
        link: '/',
        readBy: req.user ? [req.user._id] : []
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
        type: 'SCHEDULE',
        id: item._id
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Schedule item created successfully',
      item
    });
  } catch (error) {
    console.error('[createScheduleItem Error]:', error.message);
    return res.status(400).json({
      success: false,
      message: 'Failed to create schedule item. Please verify all fields.',
      errors: { general: error.message }
    });
  }
};

// @desc    Update schedule item
// @route   PUT /api/schedule/:id
// @access  Private (SUPER_ADMIN, ADMIN, SECRETARY)
exports.updateScheduleItem = async (req, res) => {
  try {
    const item = await ScheduleItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Schedule item not found'
      });
    }

    const validation = validateSchedulePayload(req.body, true);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: Object.values(validation.errors)[0],
        errors: validation.errors
      });
    }

    const {
      group,
      when,
      what,
      startMinutes,
      endMinutes,
      endsNextDay,
      clockType,
      customTime,
      order,
      isActive
    } = validation.data;

    if (group !== undefined) item.group = group;
    if (when !== undefined) item.when = when;
    if (what !== undefined) item.what = what;
    if (startMinutes !== null && startMinutes !== undefined) item.startMinutes = startMinutes;
    if (endMinutes !== null && endMinutes !== undefined) item.endMinutes = endMinutes;
    if (endsNextDay !== undefined) item.endsNextDay = endsNextDay;
    if (clockType !== undefined) item.clockType = clockType;
    if (customTime !== undefined) item.customTime = customTime;
    if (order !== undefined) item.order = order;
    if (isActive !== undefined) item.isActive = isActive;

    item.startTime = minutesToHHMM(item.startMinutes);
    item.endTime = minutesToHHMM(item.endMinutes);
    item.time = item.customTime && item.customTime.trim()
      ? item.customTime.trim()
      : `${item.startTime} - ${item.endTime}${item.endsNextDay ? ' (+1)' : ''}`;

    await item.save();

    await logAudit(
      req,
      'UPDATE_SCHEDULE_ITEM',
      `Schedule item updated: "${item.what.om}" (${item._id})`
    );

    if (req.body.notifyMembers) {
      const notification = await Notification.create({
        title: {
          om: 'Sagantaa Kadhannaa Haaraa!',
          am: 'አዲስ የጸሎት መርሐ-ግብር!',
          en: 'Updated Weekly Prayer Schedule!'
        },
        message: {
          om: `Sagantaan torbee haaromfameera: ${item.what.om} (${item.when.om}, Sa'aatii ${item.time})`,
          am: `የሳምንቱ መርሐ-ግብር ተሻሽሏል: ${item.what.am || item.what.om} (${item.time})`,
          en: `Weekly schedule updated: ${item.what.en || item.what.om} (${item.time})`
        },
        type: 'NEW_SCHEDULE',
        link: '/',
        readBy: req.user ? [req.user._id] : []
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
        type: 'SCHEDULE',
        id: item._id
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Schedule item updated successfully',
      item
    });
  } catch (error) {
    console.error('[updateScheduleItem Error]:', error.message);
    return res.status(400).json({
      success: false,
      message: 'Failed to update schedule item. Please verify all fields.',
      errors: { general: error.message }
    });
  }
};

// @desc    Reorder schedule items
// @route   PUT /api/schedule/reorder
// @access  Private (SUPER_ADMIN, ADMIN, SECRETARY)
exports.reorderScheduleItems = async (req, res) => {
  try {
    const { items } = req.body; // array of { id, order }

    if (!Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: 'Items array is required for reordering'
      });
    }

    const bulkOps = items.map((it) => ({
      updateOne: {
        filter: { _id: it.id },
        update: { $set: { order: Number(it.order) } }
      }
    }));

    if (bulkOps.length > 0) {
      await ScheduleItem.bulkWrite(bulkOps);
    }

    await logAudit(
      req,
      'REORDER_SCHEDULE',
      `Reordered ${items.length} schedule items`
    );

    if (req.io) {
      req.io.to('all_users_room').emit('content_updated', {
        type: 'SCHEDULE'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Schedule items reordered successfully'
    });
  } catch (error) {
    console.error('[reorderScheduleItems Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to reorder schedule items'
    });
  }
};

// @desc    Delete schedule item
// @route   DELETE /api/schedule/:id
// @access  Private (SUPER_ADMIN, ADMIN, SECRETARY)
exports.deleteScheduleItem = async (req, res) => {
  try {
    const item = await ScheduleItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Schedule item not found'
      });
    }

    await item.deleteOne();

    await logAudit(
      req,
      'DELETE_SCHEDULE_ITEM',
      `Schedule item deleted: "${item.what.om}" (${item._id})`
    );

    if (req.io) {
      req.io.to('all_users_room').emit('content_updated', {
        type: 'SCHEDULE',
        id: req.params.id
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Schedule item deleted successfully'
    });
  } catch (error) {
    console.error('[deleteScheduleItem Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete schedule item'
    });
  }
};
