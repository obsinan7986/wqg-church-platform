const SiteSettings = require('../models/SiteSettings');
const { logAudit } = require('../utils/auditLogger');

// Default initial settings matching church identity
const DEFAULT_SETTINGS = {
  emails: ['waldaa.giyoorgisii23@gmail.com', 'contact@waldaagiyoorgisii.org'],
  phones: ['+251911000001', '+251911000002'],
  address: {
    om: 'Finfinnee, Oromiyaa, Itoophiyaa (St. George Hall)',
    am: 'አዲስ አበባ፣ ኦሮሚያ፣ ኢትዮጵያ (ቅዱስ ጊዮርጊስ አዳራሽ)',
    en: 'Addis Ababa, Oromia, Ethiopia (St. George Hall)'
  },
  mapUrl: 'https://maps.google.com/?q=St+George+Church+Addis+Ababa',
  officeHours: {
    om: 'Wiixata - Jimaata: 2:30 - 11:30 | Sanbata: 2:30 - 6:30',
    am: 'ሰኞ - አርብ፡ 2:30 - 11:30 | ቅዳሜ፡ 2:30 - 6:30',
    en: 'Monday - Friday: 8:30 AM - 5:30 PM | Saturday: 8:30 AM - 12:30 PM'
  },
  socialLinks: [
    { platform: 'FACEBOOK', url: 'https://www.facebook.com/WaldaaQulqulluuGiyoorgisii', enabled: true },
    { platform: 'YOUTUBE', url: 'https://www.youtube.com/@WaldaaQulqulluuGiyoorgisii', enabled: true },
    { platform: 'TELEGRAM', url: 'https://t.me/WaldaaQulqulluuGiyoorgisii', enabled: true },
    { platform: 'TIKTOK', url: 'https://www.tiktok.com/@waldaagiyoorgisii', enabled: true },
    { platform: 'INSTAGRAM', url: 'https://www.instagram.com/waldaagiyoorgisii', enabled: true },
    { platform: 'WHATSAPP', url: 'https://wa.me/251911000001', enabled: true }
  ],
  liveMeeting: {
    title: {
      om: 'Sagantaa Kadhannaa fi Lallaba Kallattii',
      am: 'የቀጥታ የጸሎትና የወንጌል ትምህርት መርሐ-ግብር',
      en: 'Online Prayer & Spiritual Teaching Fellowship'
    },
    platform: 'ZOOM',
    url: 'https://zoom.us/j/84920491823',
    meetingId: '849 2049 1823',
    passcode: '777777',
    isLive: false,
    nextStartAt: new Date(Date.now() + 86400000 * 2),
    scheduleText: {
      om: "Kamisa fi Dilbata sa'aatii 12:00 Galgala",
      am: 'ሐሙስ እና እሁድ ከምሽቱ 12:00 ሰዓት',
      en: 'Every Thursday & Sunday at 6:00 PM (Addis Time)'
    },
    visibility: 'PUBLIC'
  }
};

/**
 * Helper to ensure a singleton document exists
 */
const getOrCreateSettings = async () => {
  let settings = await SiteSettings.findOne();
  if (!settings) {
    settings = await SiteSettings.create(DEFAULT_SETTINGS);
  }
  return settings;
};

/**
 * Validate URL protocol and domains according to platform specification
 */
const validatePlatformUrl = (platform, url) => {
  if (!url || typeof url !== 'string') return 'URL is required';
  const trimmed = url.trim();

  // Reject dangerous protocols
  if (/^javascript:/i.test(trimmed) || /^data:/i.test(trimmed) || /^vbscript:/i.test(trimmed)) {
    return 'Invalid URL scheme.';
  }

  if (!trimmed.startsWith('https://')) {
    return 'URL must use secure https:// protocol.';
  }

  let hostname = '';
  try {
    const parsed = new URL(trimmed);
    hostname = parsed.hostname.toLowerCase();
  } catch (_) {
    return 'Invalid URL format.';
  }

  switch (platform) {
    case 'FACEBOOK':
      if (!hostname.includes('facebook.com') && !hostname.includes('fb.com')) {
        return 'Facebook URL must be on facebook.com';
      }
      break;
    case 'YOUTUBE':
      if (!hostname.includes('youtube.com') && !hostname.includes('youtu.be')) {
        return 'YouTube URL must be on youtube.com or youtu.be';
      }
      break;
    case 'TELEGRAM':
      if (!hostname.includes('t.me') && !hostname.includes('telegram.org')) {
        return 'Telegram URL must be on t.me';
      }
      break;
    case 'TIKTOK':
      if (!hostname.includes('tiktok.com')) {
        return 'TikTok URL must be on tiktok.com';
      }
      break;
    case 'INSTAGRAM':
      if (!hostname.includes('instagram.com')) {
        return 'Instagram URL must be on instagram.com';
      }
      break;
    case 'WHATSAPP':
      if (!hostname.includes('wa.me') && !hostname.includes('whatsapp.com')) {
        return 'WhatsApp URL must be on wa.me or whatsapp.com';
      }
      break;
    case 'ZOOM':
      if (!hostname.includes('zoom.us')) {
        return 'Zoom meeting URL must be on zoom.us';
      }
      break;
    case 'MEET':
      if (!hostname.includes('meet.google.com')) {
        return 'Google Meet URL must be on meet.google.com';
      }
      break;
    default:
      break;
  }

  return null;
};

/**
 * Validate Google Maps URL
 */
const validateMapUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  if (!trimmed.startsWith('https://')) {
    return 'Google Maps URL must use https://';
  }

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    const isGoogleMap =
      host.includes('google.com') && (parsed.pathname.includes('/maps') || parsed.pathname.includes('/search')) ||
      host.includes('maps.google.com') ||
      host.includes('goo.gl') ||
      host.includes('maps.app.goo.gl');

    if (!isGoogleMap) {
      return 'Map URL must be a valid Google Maps link (maps.google.com or maps.app.goo.gl).';
    }
  } catch (_) {
    return 'Invalid Google Maps link format.';
  }

  return null;
};

/**
 * GET /api/site-settings/contact (Public, with optional auth)
 * Omit live meeting secrets if visibility is MEMBERS and user is not authenticated.
 */
const getContactSettings = async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    const isUserAuthenticated = Boolean(req.user);

    const doc = settings.toObject();

    // Check visibility for live meeting
    if (doc.liveMeeting?.visibility === 'MEMBERS' && !isUserAuthenticated) {
      // Omit credentials for logged-out visitors
      delete doc.liveMeeting.url;
      delete doc.liveMeeting.meetingId;
      delete doc.liveMeeting.passcode;
      doc.liveMeeting.requiresAuth = true;
    } else if (doc.liveMeeting) {
      doc.liveMeeting.requiresAuth = false;
    }

    return res.status(200).json({
      success: true,
      settings: doc
    });
  } catch (error) {
    console.error('[getContactSettings Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve contact settings.'
    });
  }
};

/**
 * GET /api/site-settings (Admins only)
 * Returns all settings including credentials.
 */
const getAdminSettings = async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    return res.status(200).json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('[getAdminSettings Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve settings.'
    });
  }
};

/**
 * PUT /api/site-settings (SUPER_ADMIN, ADMIN)
 */
const updateSiteSettings = async (req, res) => {
  try {
    const {
      emails,
      phones,
      address,
      mapUrl,
      officeHours,
      socialLinks,
      liveMeeting
    } = req.body;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\+?[0-9\s\-()]{7,25}$/;

    // 1. Validate emails
    if (emails) {
      if (!Array.isArray(emails)) {
        return res.status(400).json({ success: false, message: 'Emails must be an array.' });
      }
      for (const email of emails) {
        if (!email || !emailRegex.test(email.trim())) {
          return res.status(400).json({ success: false, message: `Invalid email address: ${email}` });
        }
      }
    }

    // 2. Validate phones
    if (phones) {
      if (!Array.isArray(phones)) {
        return res.status(400).json({ success: false, message: 'Phones must be an array.' });
      }
      for (const phone of phones) {
        if (!phone || !phoneRegex.test(phone.trim())) {
          return res.status(400).json({ success: false, message: `Invalid phone number: ${phone}` });
        }
      }
    }

    // 3. Validate mapUrl
    if (mapUrl) {
      const mapErr = validateMapUrl(mapUrl);
      if (mapErr) {
        return res.status(400).json({ success: false, message: mapErr });
      }
    }

    // 4. Validate socialLinks
    if (socialLinks) {
      if (!Array.isArray(socialLinks)) {
        return res.status(400).json({ success: false, message: 'Social links must be an array.' });
      }
      for (const item of socialLinks) {
        if (item.enabled && item.url) {
          const err = validatePlatformUrl(item.platform, item.url);
          if (err) {
            return res.status(400).json({ success: false, message: `Social link error (${item.platform}): ${err}` });
          }
        }
      }
    }

    // 5. Validate liveMeeting
    if (liveMeeting) {
      if (liveMeeting.url) {
        const err = validatePlatformUrl(liveMeeting.platform || 'OTHER', liveMeeting.url);
        if (err) {
          return res.status(400).json({ success: false, message: `Live meeting URL error: ${err}` });
        }
      }
    }

    let settings = await getOrCreateSettings();

    if (emails !== undefined) settings.emails = emails.map((e) => e.trim().toLowerCase());
    if (phones !== undefined) settings.phones = phones.map((p) => p.trim());
    if (address !== undefined) settings.address = address;
    if (mapUrl !== undefined) settings.mapUrl = mapUrl.trim();
    if (officeHours !== undefined) settings.officeHours = officeHours;
    if (socialLinks !== undefined) settings.socialLinks = socialLinks;
    if (liveMeeting !== undefined) {
      settings.liveMeeting = {
        ...settings.liveMeeting?.toObject(),
        ...liveMeeting
      };
    }

    settings.updatedBy = req.user._id;
    await settings.save();

    // Audit log
    await logAudit(req, 'UPDATE_SITE_SETTINGS', {
      updatedBy: req.user.fullName,
      role: req.user.role
    });

    // Socket.io real-time broadcast
    const io = req.app.get('io');
    if (io) {
      io.emit('content_updated', { type: 'site_settings' });
    }

    return res.status(200).json({
      success: true,
      message: "Qindaa'inni marsariitii milkaa'inaan haaromfameera. (Settings updated successfully)",
      settings
    });
  } catch (error) {
    console.error('[updateSiteSettings Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update site settings.'
    });
  }
};

/**
 * PUT /api/site-settings/live-toggle (SUPER_ADMIN, ADMIN)
 * Fast toggle for "Go Live" / "End Live"
 */
const toggleLiveMeeting = async (req, res) => {
  try {
    const { isLive } = req.body;
    if (typeof isLive !== 'boolean') {
      return res.status(400).json({ success: false, message: 'isLive must be a boolean.' });
    }

    let settings = await getOrCreateSettings();
    if (!settings.liveMeeting) settings.liveMeeting = {};
    settings.liveMeeting.isLive = isLive;
    settings.updatedBy = req.user._id;
    await settings.save();

    await logAudit(req, isLive ? 'LIVE_MEETING_STARTED' : 'LIVE_MEETING_ENDED', {
      platform: settings.liveMeeting.platform,
      title: settings.liveMeeting.title
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('content_updated', { type: 'site_settings', isLive });
      if (isLive) {
        io.emit('live_meeting_status', { isLive: true, platform: settings.liveMeeting.platform });
      } else {
        io.emit('live_meeting_status', { isLive: false });
      }
    }

    return res.status(200).json({
      success: true,
      isLive,
      message: isLive ? 'Tajaajilli kallattii banameera (Live started)' : 'Tajaajilli kallattii cufameera (Live ended)'
    });
  } catch (error) {
    console.error('[toggleLiveMeeting Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to toggle live meeting.' });
  }
};

module.exports = {
  getContactSettings,
  getAdminSettings,
  updateSiteSettings,
  toggleLiveMeeting
};
