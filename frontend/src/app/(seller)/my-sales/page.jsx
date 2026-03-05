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
    <main style={{ padding: '2rem 1.5rem', maxWidth: 1040, margin: '0 auto' }}>
      <header style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.25rem' }}>My Sales</h1>
        <p style={{ fontSize: '0.95rem', color: '#4b5563' }}>
          View your recent bookings, status, platform commission, and net earnings.
        </p>
      </header>

      {rows.length === 0 ? (
        <div
          style={{
            padding: '2rem 1.5rem',
            borderRadius: '0.75rem',
            border: '1px dashed #e5e7eb',
            textAlign: 'center',
            backgroundColor: '#f9fafb',
            fontSize: '0.95rem',
            color: '#6b7280',
          }}
        >
          You don&apos;t have any sales yet. Once buyers book your services, they will appear here.
        </div>
      ) : (
        <div
          style={{
            borderRadius: '0.75rem',
            border: '1px solid #e5e7eb',
            overflow: 'hidden',
            backgroundColor: '#ffffff',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead style={{ backgroundColor: '#f9fafb' }}>
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
  color: '#6b7280',
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
    background = '#fef3c7'
    color = '#92400e'
  } else if (status === 'approved' || status === 'transferred') {
    background = '#dcfce7'
    color = '#166534'
  } else if (status === 'failed' || status === 'cancelled') {
    background = '#fee2e2'
    color = '#b91c1c'
  }

  return {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0.125rem 0.5rem',
    borderRadius: '999px',
    fontSize: '0.75rem',
    fontWeight: 500,
    textTransform: 'capitalize',
    backgroundColor: background,
    color,
  }
}

