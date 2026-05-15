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

/** Labels kept short for admin payouts table (fixed column width). */
export const PAYMENT_STATUS_META = {
  paid: { label: 'Paid', color: 'green' },
  pending: { label: 'Pending', color: 'amber' },
  unpaid: { label: 'Unpaid', color: 'slate' },
  failed: { label: 'Failed', color: 'red' },
  expired: { label: 'Expired', color: 'slate' },
  refund_pending: { label: 'Refunding', color: 'amber' },
  refunded: { label: 'Refunded', color: 'red' },
}

/** Escrow / payout lifecycle shown on admin payouts (matches `order_escrows.status`). */
export const PAYOUT_STATUS_META = {
  escrowed: { label: 'Escrowed', color: 'amber' },
  on_hold: { label: 'On Hold', color: 'slate' },
  released: { label: 'Released', color: 'green' },
}

export const DISBURSEMENT_STATE_META = {
  none: { label: 'No payout attempt', color: 'slate' },
  pending: { label: 'Payout pending', color: 'amber' },
  submitted: { label: 'PayMongo submitted', color: 'amber' },
  succeeded: { label: 'Paid out', color: 'green' },
  failed: { label: 'Payout failed', color: 'red' },
  cancelled: { label: 'Payout cancelled', color: 'red' },
  legacy_manual: { label: 'Manual', color: 'slate' },
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

/** Prefer API snapshot fields when present (live escrows). */
export function getTxnCommissionParts(t, settings) {
  if (t && t.commission_amount != null && t.net_amount != null && t.commission_rate_percent != null) {
    return {
      rate: Number(t.commission_rate_percent),
      commission: Number(t.commission_amount),
      sellerEarnings: Number(t.net_amount),
    }
  }
  const rate = getCommissionRate(t.sellerId, settings)
  const { commission, sellerEarnings } = calcAmounts(t.amount, rate)
  return { rate, commission, sellerEarnings }
}

export function exportToCSV(transactions, settings) {
  const headers = ['Order ID','Txn ID','Date','Buyer','Buyer Email','Seller','Service','Total Amount','Commission %','Commission','Seller Earnings','Payment Status','Payout Status','Disbursement Status','Payout Reference','Payout Date']
  const rows = transactions.map(t => {
    const { rate, commission, sellerEarnings } = getTxnCommissionParts(t, settings)
    const disbursementLabel = DISBURSEMENT_STATE_META[t.disbursementState]?.label || t.disbursementState || ''
    return [t.orderId, t.id, t.date, t.buyerName, t.buyerEmail, t.sellerName, t.service, t.amount, `${rate}%`, commission, sellerEarnings, t.paymentStatus, t.payoutStatus, disbursementLabel, t.payoutReference, t.payoutDate]
  })
  const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `payouts_export_${new Date().toISOString().slice(0,10)}.csv`
  a.click()
}
