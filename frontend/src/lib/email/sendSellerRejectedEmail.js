import {
  createMailTransport,
  escapeHtml,
  getMailFromAddress,
  isSmtpConfigured,
} from '@/lib/email/mailTransport'

/**
 * @param {object} opts
 * @param {string} opts.to
 * @param {string} opts.businessName
 * @param {string} opts.reason - Admin-provided rejection note (shown in email body)
 */
export async function sendSellerRejectedEmail({ to, businessName, reason }) {
  if (!to?.trim()) {
    console.warn('[email] Seller rejection email skipped: no recipient address.')
    return { sent: false, reason: 'no_recipient' }
  }

  if (!isSmtpConfigured()) {
    console.warn(
      '[email] Seller rejection email skipped: set SMTP_HOST, SMTP_USER, SMTP_PASS, and SMTP_FROM (or use SMTP_USER as from).',
    )
    return { sent: false, reason: 'smtp_not_configured' }
  }

  const trimmedReason = typeof reason === 'string' ? reason.trim() : ''
  if (!trimmedReason) {
    console.warn('[email] Seller rejection email skipped: missing reason.')
    return { sent: false, reason: 'no_reason' }
  }

  const from = getMailFromAddress()
  const safeName = (businessName || 'your seller application').trim() || 'your seller application'
  const subject = 'Update on your seller application'

  const text = [
    `We were unable to approve ${safeName} at this time.`,
    '',
    `Reason:`,
    trimmedReason,
    '',
    "You may revise your details from Seller Onboarding and submit again when you're ready. If you have questions, reply to this email or contact support.",
  ].join('\n')

  const reasonsWithBreaks = trimmedReason
    .split(/\r?\n/)
    .map((line) => escapeHtml(line))
    .join('<br/>')

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:24px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;padding:32px 28px;box-shadow:0 1px 3px rgba(0,0,0,.06);">
          <tr><td style="font-size:18px;font-weight:600;color:#18181b;padding-bottom:8px;">Application not approved</td></tr>
          <tr><td style="font-size:15px;line-height:1.55;color:#3f3f46;padding-bottom:14px;">
            We&apos;re unable to approve <strong>${escapeHtml(safeName)}</strong> on the platform right now.
          </td></tr>
          <tr><td style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#71717a;padding:0 0 6px;">Reason</td></tr>
          <tr><td style="font-size:15px;line-height:1.55;color:#18181b;padding:12px 14px;background:#fafafa;border:1px solid #e4e4e7;border-radius:8px;margin-bottom:16px;">
            ${reasonsWithBreaks}
          </td></tr>
          <tr><td style="font-size:14px;line-height:1.5;color:#52525b;">
            You can review and update your information from Seller Onboarding, then submit again when you&apos;re ready.
          </td></tr>
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
    subject,
    text,
    html,
  })

  return { sent: true }
}
