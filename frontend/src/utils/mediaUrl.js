/**
 * Resolves a relative or absolute media / avatar URL to a complete browser-accessible URL.
 */
export function resolveMediaUrl(relativeOrFull) {
  if (!relativeOrFull) return '';
  if (
    relativeOrFull.startsWith('http://') ||
    relativeOrFull.startsWith('https://') ||
    relativeOrFull.startsWith('data:') ||
    relativeOrFull.startsWith('blob:')
  ) {
    return relativeOrFull;
  }
  const backendBase =
    import.meta.env.VITE_BACKEND_URL ||
    (import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '')
      : (import.meta.env.DEV ? 'http://localhost:5000' : 'https://wqg-church-platform.onrender.com'));
  return `${backendBase}${relativeOrFull.startsWith('/') ? '' : '/'}${relativeOrFull}`;
}
