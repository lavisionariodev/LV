import { apiLog } from '@/lib/observability/apiLog'
import { getAppBaseUrl } from '@/lib/email/appBaseUrl'
import {
  createMailTransport,
  escapeAttr,
  escapeHtml,
  getMailFromAddress,
  isSmtpConfigured,
} from '@/lib/email/mailTransport'

/**
 * @param {object} opts
 * @param {string} opts.to
 * @param {string} opts.subject
 * @param {string} opts.text
 * @param {string} [opts.html]
 * @param {string} [opts.actionUrl]
 * @param {string} [opts.actionLabel]
 */
export async function sendNotificationEmail({ to, subject, text, html, actionUrl, actionLabel }) {
  if (!to?.trim()) {
    apiLog('email.notification_skipped', { reason: 'no_recipient' })
    return { sent: false, reason: 'no_recipient' }
  }

  if (!isSmtpConfigured()) {
    apiLog('email.notification_skipped', { reason: 'smtp_not_configured' })
    return { sent: false, reason: 'smtp_not_configured' }
  }

  const safeSubject = String(subject || 'Notification').trim() || 'Notification'
  const safeText = String(text || '').trim()
  const ctaUrl = actionUrl?.trim() || null
  const ctaLabel = actionLabel?.trim() || 'Open in La Visionario'
  const from = getMailFromAddress()

  const htmlBody =
    html ||
    `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:24px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;padding:32px 28px;box-shadow:0 1px 3px rgba(0,0,0,.06);">
          <tr><td style="font-size:18px;font-weight:600;color:#18181b;padding-bottom:8px;">${escapeHtml(safeSubject)}</td></tr>
          <tr><td style="font-size:15px;line-height:1.55;color:#3f3f46;padding-bottom:20px;white-space:pre-wrap;">${escapeHtml(safeText)}</td></tr>
          ${
            ctaUrl
              ? `<tr><td align="center" style="padding-bottom:20px;">
            <a href="${escapeAttr(ctaUrl)}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 28px;border-radius:8px;">
              ${escapeHtml(ctaLabel)}
            </a>
          </td></tr>`
              : ''
          }
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim()

  const transport = createMailTransport()
  await transport.sendMail({
    from,
    to: to.trim(),
    subject: safeSubject,
    text: ctaUrl ? `${safeText}\n\n${ctaLabel}: ${ctaUrl}` : safeText,
    html: htmlBody,
  })

  return { sent: true }
}

/**
 * @param {Record<string, unknown> | null | undefined} metadata
 */
export function notificationActionUrlFromMetadata(metadata) {
  const href = metadata && typeof metadata === 'object' ? metadata.href : null
  if (typeof href === 'string' && href.trim()) {
    const trimmed = href.trim()
    if (/^https?:\/\//i.test(trimmed)) return trimmed
    const base = getAppBaseUrl()
    return `${base}${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`
  }
  return null
}

/**
 * @param {Record<string, unknown> | null | undefined} metadata
 */
export function defaultNotificationInboxPath(metadata) {
  const audience =
    metadata && typeof metadata === 'object' && typeof metadata.audience === 'string'
      ? metadata.audience
      : ''
  if (audience === 'admin') return '/admin/notifications'
  if (audience === 'seller') return '/seller/notifications'
  return '/profile/notifications'
}
