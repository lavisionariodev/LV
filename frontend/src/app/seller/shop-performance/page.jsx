'use client'

import { useMemo } from 'react'
import { payments, calculateCommissionSplit } from '@/data/adminSampleData'

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
    <main style={{ padding: '2rem 1.5rem', maxWidth: 1040, margin: '0 auto' }}>
      <header style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.25rem' }}>Shop Performance</h1>
        <p style={{ fontSize: '0.95rem', color: '#4b5563' }}>
          High-level view of your sales, bookings, commission, and net earnings.
        </p>
      </header>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <StatCard label="Total Sales" value={formatCurrency(stats.totals.totalSales)} />
        <StatCard label="Total Bookings" value={stats.totals.totalBookings} />
        <StatCard label="Commission Deducted" value={formatCurrency(stats.totals.totalCommission)} />
        <StatCard label="Net Earnings" value={formatCurrency(stats.totals.netEarnings)} />
      </section>

      <section
        style={{
          borderRadius: '0.75rem',
          border: '1px solid #e5e7eb',
          padding: '1.25rem 1.5rem',
          backgroundColor: '#ffffff',
        }}
      >
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Recent bookings</h2>
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
    </main>
  )
}

function StatCard({ label, value }) {
  return (
    <div
      style={{
        borderRadius: '0.75rem',
        border: '1px solid #e5e7eb',
        padding: '1rem 1.25rem',
        backgroundColor: '#ffffff',
      }}
    >
      <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#6b7280', marginBottom: '0.25rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>{value}</div>
    </div>
  )
}

