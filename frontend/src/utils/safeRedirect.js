/**
 * Returns a safe redirect path for client-side navigation.
 * Only allows relative paths (starting with /, no protocol or //).
 * Prevents open redirects when using query params like ?redirect=...
 * @param {string | null | undefined} path - Raw redirect path from URL/searchParams
 * @returns {string} Safe path, defaults to "/" if invalid
 */
export function getSafeRedirect(path) {
  if (path == null || typeof path !== 'string') return '/';
  const trimmed = path.trim();
  if (trimmed === '' || trimmed === '/') return '/';
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed;
  return '/';
}
