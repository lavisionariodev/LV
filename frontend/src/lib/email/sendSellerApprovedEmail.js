import nodemailer from 'nodemailer'

function isSmtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      (process.env.SMTP_FROM || process.env.SMTP_USER),
  )
}

function createTransport() {
  const port = Number(process.env.SMTP_PORT) || 587
  const secure =
    process.env.SMTP_SECURE === 'true' || process.env.SMTP_SECURE === '1' || port === 465

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

/**
 * @param {object} opts
 * @param {string} opts.to - Recipient (business owner email)
 * @param {string} opts.businessName - Shop / business name for greeting
 * @param {string} opts.loginUrl - Absolute URL to seller login
 */
export async function sendSellerApprovedEmail({ to, businessName, loginUrl }) {
  if (!to?.trim()) {
    console.warn('[email] Seller approval email skipped: no recipient address.')
    return { sent: false, reason: 'no_recipient' }
  }

  if (!isSmtpConfigured()) {
    console.warn(
      '[email] Seller approval email skipped: set SMTP_HOST, SMTP_USER, SMTP_PASS, and SMTP_FROM (or use SMTP_USER as from).',
    )
    return { sent: false, reason: 'smtp_not_configured' }
  }

  const from = process.env.SMTP_FROM?.trim() || process.env.SMTP_USER
  const safeName = (businessName || 'your shop').trim() || 'your shop'
  const subject = 'Your seller account has been approved'

  const text = [
    `Good news — ${safeName} has been approved.`,
    '',
    'You can now log in to your seller dashboard using the account you registered with.',
    '',
    `Log in: ${loginUrl}`,
    '',
    'If you did not apply to sell on this platform, you can ignore this email.',
  ].join('\n')

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:24px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;padding:32px 28px;box-shadow:0 1px 3px rgba(0,0,0,.06);">
          <tr><td style="font-size:18px;font-weight:600;color:#18181b;padding-bottom:8px;">You&apos;re approved</td></tr>
          <tr><td style="font-size:15px;line-height:1.55;color:#3f3f46;padding-bottom:20px;">
            Good news — <strong>${escapeHtml(safeName)}</strong> has been reviewed and approved. You can now sign in as a seller and manage your shop.
          </td></tr>
          <tr><td align="center" style="padding-bottom:20px;">
            <a href="${escapeAttr(loginUrl)}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 28px;border-radius:8px;">
              Log in as seller
            </a>
          </td></tr>
          <tr><td style="font-size:13px;line-height:1.5;color:#71717a;">
            If the button doesn&apos;t work, copy and paste this link into your browser:<br/>
            <a href="${escapeAttr(loginUrl)}" style="color:#2563eb;word-break:break-all;">${escapeHtml(loginUrl)}</a>
          </td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim()

  const transport = createTransport()
  await transport.sendMail({
    from,
    to: to.trim(),
    subject,
    text,
    html,
  })

  return { sent: true }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}
