/**
 * Snapshotted commission split (matches frontend calcAmounts rounding).
 * @param {number} grossAmountPhp
 * @param {number} commissionRatePercent
 * @returns {{ commissionRatePercent: number, grossAmountPhp: number, commissionAmountPhp: number, netAmountPhp: number }}
 */
export function computeCommissionSnapshot(grossAmountPhp, commissionRatePercent) {
  const amount = Number(grossAmountPhp)
  const rate = Number(commissionRatePercent)
  const safeAmount = Number.isFinite(amount) && amount >= 0 ? amount : 0
  const safeRate =
    Number.isFinite(rate) && rate >= 0 && rate <= 100 ? rate : 10

  const commissionAmountPhp = Math.round((safeAmount * safeRate) / 100)
  const netAmountPhp = Math.max(0, safeAmount - commissionAmountPhp)

  return {
    commissionRatePercent: safeRate,
    grossAmountPhp: safeAmount,
    commissionAmountPhp,
    netAmountPhp,
  }
}
