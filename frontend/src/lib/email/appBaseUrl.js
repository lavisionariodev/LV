/**
 * Absolute base URL for links in outbound email (no trailing slash).
 * Set NEXT_PUBLIC_APP_URL in production (e.g. https://yourdomain.com).
 */
export function getAppBaseUrl() {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '')
  if (explicit) return explicit
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, '')}`
  }
  return 'http://localhost:3000'
}
