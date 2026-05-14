/**
 * @param {string | null | undefined} userAgent
 * @returns {string}
 */
export function describeUserAgent(userAgent) {
  const ua = String(userAgent || '').trim()
  if (!ua) return 'Unknown browser'

  const isMobile = /Mobile|Android|iPhone|iPad|iPod/i.test(ua)
  const platform = /iPhone|iPad|iPod/i.test(ua)
    ? 'iOS'
    : /Android/i.test(ua)
      ? 'Android'
      : /Windows/i.test(ua)
        ? 'Windows'
        : /Mac OS X|Macintosh/i.test(ua)
          ? 'macOS'
          : /Linux/i.test(ua)
            ? 'Linux'
            : 'Unknown platform'

  const browser = /Edg\//i.test(ua)
    ? 'Edge'
    : /Chrome\//i.test(ua) && !/Edg\//i.test(ua)
      ? 'Chrome'
      : /Firefox\//i.test(ua)
        ? 'Firefox'
        : /Safari\//i.test(ua) && !/Chrome\//i.test(ua)
          ? 'Safari'
          : 'Browser'

  return isMobile ? `${browser} on ${platform} (mobile)` : `${browser} on ${platform}`
}
