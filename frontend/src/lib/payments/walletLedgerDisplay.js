/**
 * Seller-facing labels for raw seller_wallet_ledger entry_type values.
 */

const ENTRY_LABELS = {
  order_payment: 'Payment received',
  held_funds: 'In escrow',
  payout_release: 'Released to wallet',
  withdrawal: 'Withdrawal',
  refund: 'Refund',
  adjustment: 'Adjustment',
}

function shortOrderRef(orderId) {
  if (!orderId) return null
  const id = String(orderId)
  return `Order ${id.slice(0, 8).toUpperCase()}`
}

/**
 * @param {{
 *   entryType?: string,
 *   amountPhp?: number,
 *   orderId?: string | null,
 *   metadata?: Record<string, unknown>,
 *   createdAt?: string,
 * }} entry
 */
export function formatSellerLedgerEntry(entry) {
  const type = String(entry.entryType || '').toLowerCase()
  const amount = Number(entry.amountPhp) || 0
  const orderId = entry.orderId ? String(entry.orderId) : null
  const meta = entry.metadata && typeof entry.metadata === 'object' ? entry.metadata : {}
  const orderRef = shortOrderRef(orderId)

  const label = ENTRY_LABELS[type] || 'Wallet activity'

  let description = 'Wallet movement'
  let amountSign = 'neutral'

  switch (type) {
    case 'order_payment': {
      const commission = Number(meta.commission_amount) || 0
      const rate = Number(meta.commission_rate_percent) || 0
      description = orderRef
        ? `Buyer paid for ${orderRef}${commission > 0 ? ` (platform fee ${rate}% applies)` : ''}`
        : 'Buyer payment recorded for an order'
      amountSign = 'positive'
      break
    }
    case 'held_funds':
      description = orderRef
        ? `${orderRef} — earnings held until the booking is completed and released by admin`
        : 'Earnings held in escrow until admin release'
      amountSign = 'pending'
      break
    case 'payout_release':
      description = orderRef
        ? `${orderRef} — funds are now in your wallet and can be withdrawn`
        : 'Funds released to your wallet'
      amountSign = 'positive'
      break
    case 'withdrawal':
      description =
        meta.withdrawal_id != null
          ? 'Transfer to your saved bank or GCash account'
          : 'Withdrawal from your wallet'
      amountSign = 'negative'
      break
    case 'refund':
      description = orderRef
        ? `Refund processed for ${orderRef}`
        : 'Refund deducted from your earnings'
      amountSign = 'negative'
      break
    case 'adjustment':
      description =
        typeof meta.reason === 'string' && meta.reason.trim()
          ? meta.reason.trim()
          : 'Balance adjustment by platform admin'
      amountSign = amount >= 0 ? 'positive' : 'negative'
      break
    default:
      description = orderRef ? `Activity for ${orderRef}` : 'Wallet activity'
      amountSign = amount >= 0 ? 'positive' : 'negative'
  }

  const displayAmount = amountSign === 'negative' ? -Math.abs(amount) : Math.abs(amount)

  return {
    label,
    description,
    amountSign,
    displayAmount,
    orderId,
    orderRef,
    createdAt: entry.createdAt || null,
  }
}
