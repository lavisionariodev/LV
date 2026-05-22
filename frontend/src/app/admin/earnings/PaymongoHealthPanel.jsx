'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import earningsStyles from './earnings.module.css'

function statusRowClass(ok) {
  return ok ? earningsStyles.healthRowOk : earningsStyles.healthRowWarn
}

const CHECK_COPY = [
  { key: 'secretKeyConfigured', desktop: 'PayMongo API key', mobile: 'API key' },
  { key: 'webhookSecretConfigured', desktop: 'Webhook secret', mobile: 'Webhook' },
  { key: 'enabled', desktop: 'Seller disbursement enabled', mobile: 'Disbursement' },
  { key: 'sourceAccountConfigured', desktop: 'Wallet source account', mobile: 'Wallet source' },
  { key: 'withdrawReady', desktop: 'Seller withdraw ready', mobile: 'Withdraw ready' },
]

/**
 * @param {{ opsHealth: Record<string, unknown> | null, isMobile?: boolean }} props
 */
export default function PaymongoHealthPanel({ opsHealth, isMobile = false }) {
  const [copied, setCopied] = useState(false)

  const copyWebhook = useCallback(async () => {
    const url = String(opsHealth?.webhookUrl || '')
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }, [opsHealth?.webhookUrl])

  if (!opsHealth) return null

  const overall = String(opsHealth.overallStatus || 'attention')
  const panelClass =
    overall === 'ready'
      ? earningsStyles.healthPanelReady
      : overall === 'disabled'
        ? earningsStyles.healthPanelDisabled
        : earningsStyles.healthPanelAttention

  const pillClass =
    overall === 'ready'
      ? earningsStyles.healthPillReady
      : overall === 'disabled'
        ? earningsStyles.healthPillDisabled
        : earningsStyles.healthPillAttention

  const pillLabel =
    overall === 'ready'
      ? 'Payments ready'
      : overall === 'disabled'
        ? 'PayMongo not configured'
        : 'Needs attention'

  const checks = CHECK_COPY.map((c) => ({
    label: isMobile ? c.mobile : c.desktop,
    ok: Boolean(opsHealth[c.key]),
  }))

  return (
    <section className={`${earningsStyles.healthPanel} ${panelClass}`} aria-labelledby="paymongo-health-title">
      <div className={earningsStyles.healthHead}>
        <h2 id="paymongo-health-title" className={earningsStyles.healthTitle}>
          {isMobile ? 'PayMongo' : 'PayMongo & payouts'}
        </h2>
        <span className={`${earningsStyles.healthPill} ${pillClass}`}>
          <span className={earningsStyles.healthPillDot} aria-hidden />
          {pillLabel}
        </span>
      </div>
      <ul className={earningsStyles.healthList}>
        {checks.map((c) => (
          <li key={c.label} className={earningsStyles.healthRow}>
            <span className={earningsStyles.healthRowLabel}>{c.label}</span>
            <span className={statusRowClass(c.ok)}>{c.ok ? 'OK' : 'Missing'}</span>
          </li>
        ))}
      </ul>
      {Array.isArray(opsHealth.issues) && opsHealth.issues.length > 0 ? (
        <ul className={earningsStyles.healthList} style={{ marginTop: 10 }}>
          {opsHealth.issues.map((issue) => (
            <li key={String(issue)} className={earningsStyles.healthRow}>
              <span className={earningsStyles.healthRowWarn}>{String(issue)}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <div className={earningsStyles.healthActions}>
        <a
          href={String(opsHealth.paymongoDashboardUrl || 'https://dashboard.paymongo.com/home')}
          target="_blank"
          rel="noopener noreferrer"
          className={earningsStyles.healthLink}
        >
          {isMobile ? 'PayMongo dashboard' : 'Open PayMongo dashboard'}
        </a>
        <Link href="/admin/payouts" className={earningsStyles.healthLink}>
          {isMobile ? 'Payouts' : 'Payouts console'}
        </Link>
      </div>
      {opsHealth.webhookUrl ? (
        <div style={{ marginTop: 12 }}>
          <p className={earningsStyles.healthRowLabel} style={{ marginBottom: 4 }}>
            {isMobile ? 'Webhook' : 'Webhook URL'}
          </p>
          <p className={earningsStyles.webhookUrl}>{String(opsHealth.webhookUrl)}</p>
          <button type="button" className={earningsStyles.copyBtn} onClick={copyWebhook}>
            {copied ? 'Copied' : 'Copy URL'}
          </button>
        </div>
      ) : null}
    </section>
  )
}
