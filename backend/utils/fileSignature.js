const fs = require('fs');

/**
 * Validates real file signature (magic bytes) from disk
 * @param {string} filePath - Absolute path to uploaded file
 * @param {string[]} allowedFormats - ['jpeg', 'png', 'webp', 'pdf']
 * @returns {boolean} - true if magic numbers match allowed formats
 */
const verifyFileSignature = (filePath, allowedFormats = ['jpeg', 'png', 'webp']) => {
  if (!filePath || !fs.existsSync(filePath)) {
    return false;
  }

  let fd = null;
  try {
    const buffer = Buffer.alloc(16);
    fd = fs.openSync(filePath, 'r');
    const bytesRead = fs.readSync(fd, buffer, 0, 16, 0);
    fs.closeSync(fd);
    fd = null;

    if (bytesRead < 4) {
      return false;
    }

    // JPEG: FF D8 FF
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;

    // PNG: 89 50 4E 47 (0x89 'P' 'N' 'G')
    const isPng =
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47;

    // WebP: RIFF (bytes 0-3: 0x52 0x49 0x46 0x46) and WEBP (bytes 8-11: 0x57 0x45 0x42 0x50)
    const isWebp =
      bytesRead >= 12 &&
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50;

    // PDF: %PDF (0x25 0x50 0x44 0x46)
    const isPdf =
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46;

    if (allowedFormats.includes('jpeg') && isJpeg) return true;
    if (allowedFormats.includes('png') && isPng) return true;
    if (allowedFormats.includes('webp') && isWebp) return true;
    if (allowedFormats.includes('pdf') && isPdf) return true;

    return false;
  } catch (err) {
    console.error('[verifyFileSignature Error]:', err.message);
    if (fd !== null) {
      try {
        fs.closeSync(fd);
      } catch (_) {}
    }
    return false;
  }
};

module.exports = {
  verifyFileSignature
};
