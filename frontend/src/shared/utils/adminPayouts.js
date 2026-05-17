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

/** Wallet / legacy bank payout state for admin payouts table. */
export const DISBURSEMENT_STATE_META = {
  none: { label: 'In escrow', color: 'slate' },
  wallet_credited: { label: 'In seller wallet', color: 'green' },
  legacy_paid: { label: 'Paid (legacy)', color: 'slate' },
}

function getCommissionRate(sellerId, settings) {
  return settings.sellers[sellerId] !== undefined
    ? settings.sellers[sellerId]
    : settings.global
}

function calcAmounts(amount, rate) {
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
