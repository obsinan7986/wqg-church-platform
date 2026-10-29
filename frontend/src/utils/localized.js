/**
 * Safely extracts a displayable string from a localized object { om, am, en } or string.
 * Guarantees that an object is NEVER passed as a React child.
 */
export const getLocalizedText = (val, lang = 'om', fallback = '') => {
  if (!val) return fallback;
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    // Check preferred language first, then fallback to om, am, en
    const text = val[lang] || val.om || val.am || val.en;
    if (typeof text === 'string' && text.trim().length > 0) {
      return text;
    }
    return fallback;
  }
  return String(val);
};

export default getLocalizedText;
