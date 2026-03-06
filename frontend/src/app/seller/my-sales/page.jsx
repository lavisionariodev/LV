'use client'

import { useMemo } from 'react'
import { payments, calculateCommissionSplit } from '@/data/adminSampleData'
import layoutStyles from '../seller.module.css'

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
    <div className={layoutStyles.pageWrap}>
      <header className={layoutStyles.pageHeader}>
        <p className={layoutStyles.pageKicker}>Sales overview</p>
        <h1 className={layoutStyles.pageTitle}>My Sales</h1>
        <p className={layoutStyles.pageSubtitle}>
          View your recent bookings, status, platform commission, and net earnings.
        </p>
      </header>

      {rows.length === 0 ? (
        <div className={layoutStyles.panel} style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ margin: 0, fontSize: '0.95rem', color: '#4D2D18' }}>
            You don&apos;t have any sales yet. Once buyers book your services, they will appear here.
          </p>
        </div>
      ) : (
        <div className={layoutStyles.panel} style={{ overflow: 'hidden', padding: 0 }}>
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
    </div>
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

