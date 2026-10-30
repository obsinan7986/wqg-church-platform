/**
 * Resolves a relative or absolute media / avatar URL to a complete browser-accessible URL.
 */
export function resolveMediaUrl(relativeOrFull) {
  if (!relativeOrFull) return '';

  const metaEnv = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};
  const backendBase =
    metaEnv.VITE_BACKEND_URL ||
    (metaEnv.VITE_API_URL
      ? metaEnv.VITE_API_URL.replace(/\/api\/?$/, '')
      : (metaEnv.DEV ? 'http://localhost:5000' : 'https://wqg-church-platform.onrender.com'));

  // Guard against legacy dead sample audio links or wiped ephemeral uploads (e.g. KENNAA)
  if (
    typeof relativeOrFull === 'string' &&
    (relativeOrFull.includes('actions.google.com') ||
      relativeOrFull.toUpperCase().includes('KENNAA'))
  ) {
    return `${backendBase}/uploads/1793125357458-256997120-Chala_Garomsa_KAAMETTII_New_Ethiopian_Oromo_music_.mp3`;
  }

  if (
    relativeOrFull.startsWith('http://') ||
    relativeOrFull.startsWith('https://') ||
    relativeOrFull.startsWith('data:') ||
    relativeOrFull.startsWith('blob:')
  ) {
    return relativeOrFull;
  }
  return `${backendBase}${relativeOrFull.startsWith('/') ? '' : '/'}${relativeOrFull}`;
}
