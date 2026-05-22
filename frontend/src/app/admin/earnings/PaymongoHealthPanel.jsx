'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import earningsStyles from './earnings.module.css'

const CHECK_COPY = [
  { key: 'secretKeyConfigured', desktop: 'PayMongo API key', mobile: 'API key' },
  { key: 'webhookSecretConfigured', desktop: 'Webhook secret', mobile: 'Webhook' },
  { key: 'enabled', desktop: 'Seller disbursement enabled', mobile: 'Disbursement' },
  { key: 'sourceAccountConfigured', desktop: 'Wallet source account', mobile: 'Wallet source' },
  { key: 'withdrawReady', desktop: 'Seller withdraw ready', mobile: 'Withdraw ready' },
]

/** @param {typeof CHECK_COPY} items */
function pairCheckRows(items) {
  const rows = []
  for (let i = 0; i < items.length; i += 2) {
    rows.push(items.slice(i, i + 2))
  }
  return rows
}

function StatusBadge({ ok }) {
  return (
    <span
      className={`${earningsStyles.healthStatusBadge} ${
        ok ? earningsStyles.healthStatusOk : earningsStyles.healthStatusWarn
      }`}
    >
      {ok ? 'OK' : 'Missing'}
    </span>
  )
}

/**
 * @param {{ check: { key: string, label: string, ok: boolean } | undefined }} props
 */
function CheckPairCells({ check }) {
  if (!check) {
    return (
      <>
        <span className={earningsStyles.healthRowFiller} aria-hidden />
        <span className={earningsStyles.healthRowFiller} aria-hidden />
      </>
    )
  }
  return (
    <>
      <span className={earningsStyles.healthRowLabel}>{check.label}</span>
      <span className={earningsStyles.healthStatusCell}>
        <StatusBadge ok={check.ok} />
      </span>
    </>
  )
}

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
    key: c.key,
    label: isMobile ? c.mobile : c.desktop,
    ok: Boolean(opsHealth[c.key]),
  }))

  const issues = Array.isArray(opsHealth.issues) ? opsHealth.issues : []
  const checkRows = pairCheckRows(checks)

  return (
    <section className={`${earningsStyles.healthPanel} ${panelClass}`} aria-labelledby="paymongo-health-title">
      <header className={earningsStyles.healthHead}>
        <h2 id="paymongo-health-title" className={earningsStyles.healthTitle}>
          {isMobile ? 'PayMongo' : 'PayMongo & payouts'}
        </h2>
        <span className={`${earningsStyles.healthPill} ${pillClass}`}>
          <span className={earningsStyles.healthPillDot} aria-hidden />
          {pillLabel}
        </span>
      </header>

      <div className={earningsStyles.healthBody}>
        <ul className={earningsStyles.healthCheckTable} aria-label="PayMongo configuration checks">
          <li className={earningsStyles.healthCheckHead}>
            <span>Check</span>
            <span>Status</span>
            <span>Check</span>
            <span>Status</span>
          </li>
          {checkRows.map((pair, rowIndex) => (
            <li
              key={pair.map((c) => c.key).join('-') || `row-${rowIndex}`}
              className={earningsStyles.healthRow}
            >
              <CheckPairCells check={pair[0]} />
              <CheckPairCells check={pair[1]} />
            </li>
          ))}
        </ul>

        {issues.length > 0 ? (
          <ul className={earningsStyles.healthIssues} aria-label="Configuration issues">
            {issues.map((issue) => (
              <li key={String(issue)} className={earningsStyles.healthIssueItem}>
                {String(issue)}
              </li>
            ))}
          </ul>
        ) : null}

        <footer className={earningsStyles.healthFooter}>
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
            <div className={earningsStyles.healthWebhook}>
              <p className={earningsStyles.healthWebhookTitle}>
                {isMobile ? 'Webhook' : 'Webhook URL'}
              </p>
              <div className={earningsStyles.healthWebhookRow}>
                <p className={earningsStyles.webhookUrl}>{String(opsHealth.webhookUrl)}</p>
                <button type="button" className={earningsStyles.copyBtn} onClick={copyWebhook}>
                  {copied ? 'Copied' : 'Copy URL'}
                </button>
              </div>
            </div>
          ) : null}
        </footer>
      </div>
    </section>
  )
}
