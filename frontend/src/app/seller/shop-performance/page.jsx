'use client'

import { useMemo } from 'react'
import { payments, calculateCommissionSplit } from '@/data/adminSampleData'
import layoutStyles from '../seller.module.css'

const SELLER_ID = 'SEL-001'

function formatCurrency(value) {
  return `₱${Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
}

export default function SellerShopPerformancePage() {
  const stats = useMemo(() => {
    const sellerPayments = payments.filter((p) => p.sellerId === SELLER_ID)
    const totals = sellerPayments.reduce(
      (acc, p) => {
        const { lvShare, sellerShare } = calculateCommissionSplit(p.amount, p.sellerId)
        acc.totalSales += p.amount
        acc.totalBookings += 1
        acc.totalCommission += lvShare
        acc.netEarnings += sellerShare
        return acc
      },
      {
        totalSales: 0,
        totalBookings: 0,
        totalCommission: 0,
        netEarnings: 0,
      }
    )
    return { totals, sellerPayments }
  }, [])

  return (
    <div className={layoutStyles.pageWrap}>
      <header className={layoutStyles.pageHeader}>
        <p className={layoutStyles.pageKicker}>Performance overview</p>
        <h1 className={layoutStyles.pageTitle}>Shop Performance</h1>
        <p className={layoutStyles.pageSubtitle}>
          High-level view of your sales, bookings, commission, and net earnings.
        </p>
      </header>

      <section
        className={layoutStyles.statsGrid}
        style={{ marginBottom: '1.5rem' }}
      >
        <StatCard label="Total Sales" value={formatCurrency(stats.totals.totalSales)} />
        <StatCard label="Total Bookings" value={stats.totals.totalBookings} />
        <StatCard label="Commission Deducted" value={formatCurrency(stats.totals.totalCommission)} />
        <StatCard label="Net Earnings" value={formatCurrency(stats.totals.netEarnings)} />
      </section>

      <section className={layoutStyles.panel}>
        <h2
          style={{
            fontSize: '1rem',
            fontWeight: 600,
            marginBottom: '0.75rem',
            color: '#102820',
          }}
        >
          Recent bookings
        </h2>
        {stats.sellerPayments.length === 0 ? (
          <p style={{ fontSize: '0.9rem', color: '#6b7280' }}>
            No bookings yet. When buyers book your services, a breakdown will appear here.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {stats.sellerPayments.map((p) => {
              const { lvShare, sellerShare } = calculateCommissionSplit(p.amount, p.sellerId)
              return (
                <li
                  key={p.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem 0',
                    borderTop: '1px solid #f3f4f6',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{p.buyerName}</div>
                    <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                      {p.date} • {p.orderRef}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.85rem', color: '#111827' }}>
                      {formatCurrency(sellerShare)} <span style={{ color: '#9ca3af' }}>net</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      {formatCurrency(lvShare)} commission
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

function StatCard({ label, value }) {
  let backgroundColor = 'rgba(232, 250, 241, 0.7)' // default mint

  if (label === 'Total Sales') {
    backgroundColor = 'rgba(232, 250, 241, 0.7)' // mint
  } else if (label === 'Total Bookings') {
    backgroundColor = 'rgba(247, 244, 239, 0.7)' // soft cream
  } else if (label === 'Commission Deducted') {
    backgroundColor = 'rgba(255, 248, 232, 0.7)' // pale gold
  } else if (label === 'Net Earnings') {
    backgroundColor = 'rgba(230, 242, 255, 0.7)' // light blue
  }

  return (
    <div
      style={{
        borderRadius: '0.9rem',
        border: '1px solid rgba(168, 137, 74, 0.25)',
        padding: '1rem 1.25rem',
        backgroundColor,
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.04)',
      }}
    >
      <div
        style={{
          fontSize: '0.8rem',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: '#4D2D18',
          marginBottom: '0.25rem',
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#102820' }}>{value}</div>
    </div>
  )
}

