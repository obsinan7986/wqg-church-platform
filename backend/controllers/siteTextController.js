const path = require('path');
const fs = require('fs');
const SiteText = require('../models/SiteText');
const { logAudit } = require('../utils/auditLogger');

// In-memory cache for fast GET responses
let cachedOverrides = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

// Load known keys from en.json if available
let knownKeysSet = null;
const loadKnownKeys = () => {
  if (knownKeysSet) return knownKeysSet;
  try {
    const candidates = [
      path.resolve(__dirname, '../../frontend/src/locales/en.json'),
      path.resolve(__dirname, '../locales/en.json'),
      path.resolve(process.cwd(), 'frontend/src/locales/en.json')
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
        const keys = new Set();
        const walk = (obj, prefix = '') => {
          for (const k of Object.keys(obj)) {
            const nextPrefix = prefix ? `${prefix}.${k}` : k;
            if (obj[k] && typeof obj[k] === 'object' && !Array.isArray(obj[k])) {
              walk(obj[k], nextPrefix);
            } else {
              keys.add(nextPrefix);
            }
          }
        };
        walk(raw);
        knownKeysSet = keys;
        return knownKeysSet;
      }
    }
  } catch (err) {
    console.warn('[SiteTextController] Could not load en.json for key validation:', err.message);
  }
  return null;
};

/**
 * @desc    Get all site text overrides (Public, cached)
 * @route   GET /api/site-text
 * @access  Public
 */
exports.getSiteTexts = async (req, res) => {
  try {
    const now = Date.now();
    if (cachedOverrides && now < cacheExpiresAt) {
      res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
      return res.status(200).json({
        success: true,
        source: 'cache',
        count: cachedOverrides.length,
        data: cachedOverrides
      });
    }

    const overrides = await SiteText.find({})
      .populate('updatedBy', 'fullName role email')
      .sort({ key: 1 })
      .lean();

    cachedOverrides = overrides;
    cacheExpiresAt = now + CACHE_TTL_MS;

    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
    return res.status(200).json({
      success: true,
      source: 'database',
      count: overrides.length,
      data: overrides
    });
  } catch (error) {
    console.error('[getSiteTexts Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve site text overrides.',
      error: error.message
    });
  }
};

/**
 * @desc    Create or update a site text override
 * @route   PUT /api/site-text/:key
 * @access  Protected (SUPER_ADMIN, ADMIN)
 */
exports.updateSiteText = async (req, res) => {
  try {
    const rawKey = req.params.key;
    const key = decodeURIComponent(rawKey).trim();

    if (!key) {
      return res.status(400).json({
        success: false,
        message: 'Translation key parameter is required.'
      });
    }

    // Optional validation against known keys from en.json
    const knownKeys = loadKnownKeys();
    if (knownKeys && !knownKeys.has(key)) {
      return res.status(400).json({
        success: false,
        message: `Key '${key}' is not a recognized translation key.`
      });
    }

    const { om, am, en } = req.body;
    if (om === undefined && am === undefined && en === undefined) {
      return res.status(400).json({
        success: false,
        message: 'At least one language translation (om, am, en) must be provided.'
      });
    }

    const updateFields = {
      key,
      updatedBy: req.user?._id || null,
      updatedAt: new Date()
    };
    if (om !== undefined) updateFields.om = typeof om === 'string' ? om.trim() : String(om);
    if (am !== undefined) updateFields.am = typeof am === 'string' ? am.trim() : String(am);
    if (en !== undefined) updateFields.en = typeof en === 'string' ? en.trim() : String(en);

    const siteText = await SiteText.findOneAndUpdate(
      { key },
      { $set: updateFields },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).populate('updatedBy', 'fullName role email');

    // Invalidate cache
    cachedOverrides = null;
    cacheExpiresAt = 0;

    // Log audit
    await logAudit(req, 'UPDATE_SITE_TEXT', {
      key,
      om: updateFields.om,
      am: updateFields.am,
      en: updateFields.en,
      updatedBy: req.user?.fullName
    });

    return res.status(200).json({
      success: true,
      message: `Site text for '${key}' updated successfully.`,
      data: siteText
    });
  } catch (error) {
    console.error('[updateSiteText Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to update site text override.',
      error: error.message
    });
  }
};

/**
 * @desc    Delete a site text override (Reset to default JSON)
 * @route   DELETE /api/site-text/:key
 * @access  Protected (SUPER_ADMIN, ADMIN)
 */
exports.deleteSiteText = async (req, res) => {
  try {
    const rawKey = req.params.key;
    const key = decodeURIComponent(rawKey).trim();

    if (!key) {
      return res.status(400).json({
        success: false,
        message: 'Translation key parameter is required.'
      });
    }

    const deleted = await SiteText.findOneAndDelete({ key });

    // Invalidate cache
    cachedOverrides = null;
    cacheExpiresAt = 0;

    // Log audit
    await logAudit(req, 'RESET_SITE_TEXT', {
      key,
      previousValues: deleted ? { om: deleted.om, am: deleted.am, en: deleted.en } : null,
      resetBy: req.user?.fullName
    });

    return res.status(200).json({
      success: true,
      message: `Site text override for '${key}' deleted (reset to default).`,
      key,
      wasOverridden: !!deleted
    });
  } catch (error) {
    console.error('[deleteSiteText Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to reset site text override.',
      error: error.message
    });
  }
};
