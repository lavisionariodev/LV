'use client'

import { useMemo } from 'react'
import { payments, calculateCommissionSplit } from '@/data/adminSampleData'

const SELLER_ID = 'SEL-001'

function formatCurrency(value) {
  return `₱${Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
}

export default function SellerMySalesPage() {
  const rows = useMemo(() => {
    const sellerPayments = payments.filter((p) => p.sellerId === SELLER_ID)
    return sellerPayments.map((p) => {
      const { lvShare, sellerShare, rate } = calculateCommissionSplit(p.amount, p.sellerId)
      return {
        ...p,
        commissionRate: rate,
        commissionAmount: lvShare,
        netAmount: sellerShare,
      }
    })
  }, [])

  return (
    <main
      style={{
        padding: '2.5rem 1.5rem 3rem',
        maxWidth: 1120,
        margin: '0 auto',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <header
        style={{
          marginBottom: '1.85rem',
          paddingBottom: '1.25rem',
          borderBottom: '1px solid rgba(168, 137, 74, 0.22)',
        }}
      >
        <p
          style={{
            fontSize: '0.78rem',
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            color: 'var(--color-gold-bright)',
            fontWeight: 700,
            marginBottom: '0.3rem',
          }}
        >
          Sales overview
        </p>
        <h1
          style={{
            fontSize: '1.6rem',
            fontWeight: 650,
            marginBottom: '0.35rem',
            color: '#102820',
          }}
        >
          My Sales
        </h1>
        <p
          style={{
            fontSize: '0.95rem',
            color: '#4D2D18',
            maxWidth: 520,
            lineHeight: 1.6,
          }}
        >
          View your recent bookings, status, platform commission, and net earnings.
        </p>
      </header>

      {rows.length === 0 ? (
        <div
          style={{
            padding: '2rem 1.7rem',
            borderRadius: '0.85rem',
            border: '1px dashed rgba(168, 137, 74, 0.65)',
            textAlign: 'center',
            backgroundColor: '#F7F4EF',
            fontSize: '0.95rem',
            color: '#4D2D18',
          }}
        >
          You don&apos;t have any sales yet. Once buyers book your services, they will appear here.
        </div>
      ) : (
        <div
          style={{
            borderRadius: '0.9rem',
            border: '1px solid rgba(168, 137, 74, 0.25)',
            overflow: 'hidden',
            backgroundColor: '#ffffff',
            boxShadow: '0 18px 40px rgba(0, 0, 0, 0.06)',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead style={{ backgroundColor: 'rgb(232 250 241)' }}>
              <tr>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Order Ref</th>
                <th style={thStyle}>Buyer</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Gross</th>
                <th style={thStyle}>Commission</th>
                <th style={thStyle}>Net</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                  <td style={tdStyle}>{row.date}</td>
                  <td style={tdStyle}>{row.orderRef}</td>
                  <td style={tdStyle}>{row.buyerName}</td>
                  <td style={tdStyle}>
                    <span style={statusPillStyle(row.status)}>{row.status}</span>
                  </td>
                  <td style={tdNumericStyle}>{formatCurrency(row.amount)}</td>
                  <td style={tdNumericStyle}>
                    {formatCurrency(row.commissionAmount)}{' '}
                    <span style={{ color: '#9ca3af', marginLeft: 4 }}>({row.commissionRate}%)</span>
                  </td>
                  <td style={tdNumericStyle}>{formatCurrency(row.netAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}

const thStyle = {
  textAlign: 'left',
  padding: '0.75rem 1rem',
  fontWeight: 500,
  fontSize: '0.8rem',
  textTransform: 'uppercase',
  letterSpacing: '0.03em',
  color: '#4D2D18',
}

const tdStyle = {
  padding: '0.75rem 1rem',
  color: '#111827',
}

const tdNumericStyle = {
  ...tdStyle,
  textAlign: 'right',
  whiteSpace: 'nowrap',
}

function statusPillStyle(status) {
  let background = '#e5e7eb'
  let color = '#374151'

  if (status === 'pending') {
    background = '#FEF3C7'
    color = '#92400E'
  } else if (status === 'approved' || status === 'transferred') {
    background = 'rgb(232 250 241)'
    color = '#204F38'
  } else if (status === 'failed' || status === 'cancelled') {
    background = '#FEE2E2'
    color = '#B91C1C'
  }

  return {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0.125rem 0.5rem',
    borderRadius: '999px',
    fontSize: '0.75rem',
    fontWeight: 600,
    textTransform: 'capitalize',
    backgroundColor: background,
    color,
  }
}

