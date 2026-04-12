export function formatPHP(n) {
  return `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export function formatDateRangeLabel(from, to) {
  const opts = { month: 'short', day: 'numeric', year: 'numeric' }
  if (from && to) {
    const a = new Date(`${from}T12:00:00`).toLocaleDateString('en-US', opts)
    const b = new Date(`${to}T12:00:00`).toLocaleDateString('en-US', opts)
    return `${a} – ${b}`
  }
  if (from) return `${new Date(`${from}T12:00:00`).toLocaleDateString('en-US', opts)} – …`
  if (to) return `… – ${new Date(`${to}T12:00:00`).toLocaleDateString('en-US', opts)}`
  return ''
}

export const PAYMENT_STATUS_META = {
  paid:     { label: 'Paid',     color: 'green' },
  pending:  { label: 'Pending',  color: 'amber' },
  refunded: { label: 'Refunded', color: 'red'   },
  failed:   { label: 'Failed',   color: 'red'   },
}

export const PAYOUT_STATUS_META = {
  pending:    { label: 'Pending',    color: 'amber'  },
  processing: { label: 'Processing', color: 'blue'   },
  paid:       { label: 'Paid',       color: 'green'  },
  on_hold:    { label: 'On Hold',    color: 'slate'  },
  refunded:   { label: 'Refunded',   color: 'red'    },
}

export function getCommissionRate(sellerId, settings) {
  return settings.sellers[sellerId] !== undefined
    ? settings.sellers[sellerId]
    : settings.global
}

export function calcAmounts(amount, rate) {
  const commission = Math.round(amount * rate / 100)
  return { commission, sellerEarnings: amount - commission }
}

export function exportToCSV(transactions, settings) {
  const headers = ['Order ID','Txn ID','Date','Buyer','Buyer Email','Seller','Service','Total Amount','Commission %','Commission','Seller Earnings','Payment Status','Payout Status','Payout Reference','Payout Date']
  const rows = transactions.map(t => {
    const rate = getCommissionRate(t.sellerId, settings)
    const { commission, sellerEarnings } = calcAmounts(t.amount, rate)
    return [t.orderId, t.id, t.date, t.buyerName, t.buyerEmail, t.sellerName, t.service, t.amount, `${rate}%`, commission, sellerEarnings, t.paymentStatus, t.payoutStatus, t.payoutReference, t.payoutDate]
  })
  const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `payouts_export_${new Date().toISOString().slice(0,10)}.csv`
  a.click()
}
