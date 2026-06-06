'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { MdArrowOutward } from 'react-icons/md'
import { TbCreditCard, TbCoins, TbInfoCircle, TbUsers } from 'react-icons/tb'
import { useMediaQuery } from '@/shared/hooks'
import { formatPHPMobile, formatPHPDesktop } from '@/shared/utils'
import layoutStyles from '../admin.module.css'
import earningsStyles from './earnings.module.css'

const CHART_ACCENT = '#1F312B'
const RANGE_OPTIONS = [
  { value: 7, label: '7d' },
  { value: 30, label: '30d' },
]

const DISCLAIMER_MOBILE =
  'Ledger estimates. Cash is in PayMongo; settle commission in PayMongo or Billing.'

const STAT_COPY = {
  earned: {
    label: { desktop: 'Commission earned', mobile: 'Earned' },
    hint: (allTime) => ({
      desktop: `Last 30 days${allTime ? ` · ${allTime} all time` : ''}`,
      mobile: `30d${allTime ? ` · ${allTime} total` : ''}`,
    }),
  },
  pending: {
    label: { desktop: 'Commission pending', mobile: 'Pending' },
    hint: {
      desktop: 'On escrowed / on-hold orders',
      mobile: 'Escrow / on hold',
    },
  },
  escrow: {
    label: { desktop: 'Seller owed — escrow', mobile: 'Seller escrow' },
    hint: {
      desktop: 'Net not yet released to sellers',
      mobile: 'Not released yet',
    },
  },
}

function formatShortDate(dateStr) {
  const d = new Date(`${String(dateStr)}T12:00:00Z`)
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`
}

function utcLastNDaysSeriesZeros(n) {
  const out = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date()
    d.setUTCHours(0, 0, 0, 0)
    d.setUTCDate(d.getUTCDate() - i)
    out.push({ date: d.toISOString().slice(0, 10), total: 0 })
  }
  return out
}

function EarningsPageSkeleton() {
  return (
    <div
      className={earningsStyles.page}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading platform earnings"
    >
      <div className={earningsStyles.earningsSkDisclaimer}>
        <span className={`${layoutStyles.adminSkBar} ${earningsStyles.earningsSkDisclaimerIcon}`} />
        <span className={`${layoutStyles.adminSkBar} ${earningsStyles.earningsSkDisclaimerText}`} />
      </div>

      <div className={`${earningsStyles.dashGrid} ${earningsStyles.earningsSkDashGrid}`}>
        <div className={`${layoutStyles.dashSkPanel} ${earningsStyles.earningsSkChartPanel}`}>
          <div className={earningsStyles.earningsSkChartHead}>
            <span className={`${layoutStyles.adminSkBar} ${earningsStyles.earningsSkChartTitle}`} />
            <span className={`${layoutStyles.adminSkBar} ${earningsStyles.earningsSkChartRange}`} />
          </div>
          <span className={`${layoutStyles.adminSkBar} ${earningsStyles.earningsSkChartSubtitle}`} />
          <span className={`${layoutStyles.adminSkBar} ${layoutStyles.dashSkChart}`} />
        </div>
        <div className={layoutStyles.dashSkStatCol}>
          {[0, 1, 2].map((i) => (
            <div key={i} className={`${layoutStyles.dashSkStatCard} ${earningsStyles.earningsSkStatCard}`}>
              <div className={layoutStyles.dashSkStatTop}>
                <span className={`${layoutStyles.adminSkBar} ${layoutStyles.dashSkStatLabel}`} />
                <span className={`${layoutStyles.adminSkBar} ${layoutStyles.dashSkStatIcon}`} />
              </div>
              <div className={earningsStyles.earningsSkStatBody}>
                <div className={earningsStyles.earningsSkStatValueRow}>
                  <span className={`${layoutStyles.adminSkBar} ${earningsStyles.earningsSkStatIconBox}`} />
                  <span className={`${layoutStyles.adminSkBar} ${earningsStyles.earningsSkStatValueLine}`} />
                </div>
                <span className={`${layoutStyles.adminSkBar} ${earningsStyles.earningsSkStatHintLine}`} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={earningsStyles.earningsSkSettlement}>
        <span className={`${layoutStyles.adminSkBar} ${earningsStyles.earningsSkSettlementTitle}`} />
        <span className={`${layoutStyles.adminSkBar} ${earningsStyles.earningsSkSettlementText}`} />
        <span className={`${layoutStyles.adminSkBar} ${earningsStyles.earningsSkSettlementLink}`} />
      </div>
    </div>
  )
}

function StatCards({ summary, formatAmount, isMobile }) {
  const cardClass = `${layoutStyles.statCard} ${earningsStyles.earningsStatCard}`
  const topClass = `${layoutStyles.statCardTop} ${earningsStyles.earningsStatCardTop}`
  const bodyClass = `${layoutStyles.statCardBody} ${earningsStyles.earningsStatCardBody}`
  const valueRowClass = earningsStyles.earningsStatValueRow
  const allTimeFmt = summary ? formatAmount(summary.commissionReleasedTotal) : ''
  const earnedHint = isMobile
    ? STAT_COPY.earned.hint(allTimeFmt).mobile
    : STAT_COPY.earned.hint(allTimeFmt).desktop

  return (
    <>
      <div className={cardClass}>
        <div className={topClass}>
          <p className={layoutStyles.statLabel}>
            {isMobile ? STAT_COPY.earned.label.mobile : STAT_COPY.earned.label.desktop}
          </p>
          <Link
            href="/admin/payouts?tab=commissions"
            className={layoutStyles.statCardArrow}
            aria-label="View commissions"
          >
            <MdArrowOutward />
          </Link>
        </div>
        <div className={bodyClass}>
          <div className={valueRowClass}>
            <span className={layoutStyles.statCardIcon} aria-hidden>
              <TbCoins />
            </span>
            <p className={layoutStyles.statValue}>
              {formatAmount(summary?.commissionReleased30d)}
            </p>
          </div>
          <p className={`${layoutStyles.statHint} ${earningsStyles.earningsStatHint}`}>{earnedHint}</p>
        </div>
      </div>

      <div className={cardClass}>
        <div className={topClass}>
          <p className={layoutStyles.statLabel}>
            {isMobile ? STAT_COPY.pending.label.mobile : STAT_COPY.pending.label.desktop}
          </p>
          <span className={earningsStyles.earningsStatTopSpacer} aria-hidden />
        </div>
        <div className={bodyClass}>
          <div className={valueRowClass}>
            <span className={layoutStyles.statCardIcon} aria-hidden>
              <TbCreditCard />
            </span>
            <p className={layoutStyles.statValue}>
              {formatAmount(summary?.commissionPending)}
            </p>
          </div>
          <p className={`${layoutStyles.statHint} ${earningsStyles.earningsStatHint}`}>
            {isMobile ? STAT_COPY.pending.hint.mobile : STAT_COPY.pending.hint.desktop}
          </p>
        </div>
      </div>

      <div className={cardClass}>
        <div className={topClass}>
          <p className={layoutStyles.statLabel}>
            {isMobile ? STAT_COPY.escrow.label.mobile : STAT_COPY.escrow.label.desktop}
          </p>
          <Link
            href="/admin/payouts?tab=transactions&payout=escrowed"
            className={layoutStyles.statCardArrow}
            aria-label="View escrows"
          >
            <MdArrowOutward />
          </Link>
        </div>
        <div className={bodyClass}>
          <div className={valueRowClass}>
            <span className={layoutStyles.statCardIcon} aria-hidden>
              <TbUsers />
            </span>
            <p className={layoutStyles.statValue}>
              {formatAmount(summary?.sellerOwedEscrow)}
            </p>
          </div>
          <p className={`${layoutStyles.statHint} ${earningsStyles.earningsStatHint}`}>
            {isMobile ? STAT_COPY.escrow.hint.mobile : STAT_COPY.escrow.hint.desktop}
          </p>
        </div>
      </div>
    </>
  )
}

function CommissionChart({ rangeDays, commissionChartSeries, onRangeChange, isMobile }) {
  return (
    <div
      className={`${layoutStyles.panel} ${layoutStyles.revenueOverviewPanel} ${earningsStyles.chartPanel}`}
    >
      <div className={`${layoutStyles.panelHead} ${earningsStyles.chartPanelHead}`}>
        <p className={layoutStyles.panelTitle}>Commission by day</p>
        <div className={earningsStyles.chartRangeGroup} role="group" aria-label="Date range">
          {RANGE_OPTIONS.map((opt) => {
            const active = rangeDays === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                className={`${earningsStyles.chartRangeBtn}${active ? ` ${earningsStyles.chartRangeBtnActive}` : ''}`}
                aria-pressed={active}
                onClick={() => onRangeChange(opt.value)}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>
      <p className={earningsStyles.chartSubtitle}>
        {isMobile
          ? `${rangeDays}d · released (UTC)`
          : `Last ${rangeDays} days · released escrows (UTC day)`}
      </p>
      <div className={earningsStyles.chartWrap}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={commissionChartSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="earningsCommissionGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_ACCENT} stopOpacity={0.35} />
                <stop offset="100%" stopColor={CHART_ACCENT} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tickFormatter={formatShortDate}
              tick={{ fontSize: 11, fill: '#64748b' }}
            />
            <YAxis
              tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`}
              tick={{ fontSize: 11, fill: '#64748b' }}
              width={44}
            />
            <Tooltip
              formatter={(value) => [`₱ ${Number(value).toLocaleString()}`, 'Commission']}
              labelFormatter={(label) => `Date: ${label}`}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke={CHART_ACCENT}
              strokeWidth={2}
              fill="url(#earningsCommissionGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default function AdminEarningsPage() {
  const isMobile = useMediaQuery('(max-width: 860px)')
  const formatAmount = isMobile ? formatPHPMobile : formatPHPDesktop

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [rangeDays, setRangeDays] = useState(7)
  const [summary, setSummary] = useState(null)
  const [settlement, setSettlement] = useState(null)
  const [disclaimer, setDisclaimer] = useState('')
  const [commissionChartSeries, setCommissionChartSeries] = useState(() => utcLastNDaysSeriesZeros(7))

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/admin/treasury?range=${rangeDays}d`, { credentials: 'include' })
        const body = await res.json().catch(() => null)
        if (cancelled) return
        if (!res.ok) {
          setError(typeof body?.error === 'string' ? body.error : 'Could not load platform earnings.')
          return
        }
        setSummary(body.summary ?? null)
        setSettlement(body.settlement ?? null)
        setDisclaimer(body.disclaimer || '')
        if (Array.isArray(body.commissionChartSeries) && body.commissionChartSeries.length > 0) {
          setCommissionChartSeries(body.commissionChartSeries)
        } else {
          setCommissionChartSeries(utcLastNDaysSeriesZeros(rangeDays))
        }
      } catch {
        if (!cancelled) setError('Could not load platform earnings. Check your connection.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [rangeDays])

  if (loading) {
    return <EarningsPageSkeleton />
  }

  return (
    <div className={earningsStyles.page}>
      {error ? (
        <p className={earningsStyles.loadError} role="alert">
          {error}
        </p>
      ) : null}

      {!loading && disclaimer ? (
        <div className={earningsStyles.disclaimer} role="note">
          <span className={earningsStyles.disclaimerIcon} aria-hidden>
            <TbInfoCircle size={isMobile ? 20 : 22} strokeWidth={1.75} />
          </span>
          <span className={earningsStyles.disclaimerText}>
            {isMobile ? DISCLAIMER_MOBILE : disclaimer}
          </span>
        </div>
      ) : null}

      <div className={earningsStyles.dashGrid}>
        <div className={layoutStyles.desktopChartsCol}>
          <CommissionChart
            loading={loading}
            rangeDays={rangeDays}
            commissionChartSeries={commissionChartSeries}
            onRangeChange={setRangeDays}
            isMobile={isMobile}
          />
        </div>
        <div className={`${layoutStyles.statsGrid} ${earningsStyles.earningsStatsGrid}`}>
          <StatCards
            loading={loading}
            summary={summary}
            formatAmount={formatAmount}
            isMobile={isMobile}
          />
        </div>
      </div>

      <div className={earningsStyles.settlementCard}>
        <h2 className={earningsStyles.settlementCardTitle}>
          {isMobile ? 'Settlement' : 'Settlement destination'}
        </h2>
        <p className={earningsStyles.settlementCardText}>
          {settlement?.configured
            ? settlement.label
            : isMobile
              ? 'Not set — add bank or GCash in Billing.'
              : 'Not configured — add your company bank or GCash where commission should settle.'}
        </p>
        <Link href="/admin/settings/billing" className={earningsStyles.settlementCardLink}>
          {settlement?.configured
            ? isMobile
              ? 'Edit billing'
              : 'Edit in Billing settings'
            : isMobile
              ? 'Set up billing'
              : 'Configure in Billing settings'}
        </Link>
      </div>
    </div>
  )
}
