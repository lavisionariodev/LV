export const SELLER_LINK_DEVICE_SCAN_STORAGE_KEY = 'seller-link-device-scan-target'

/**
 * @param {{ challengeId?: string, approveToken?: string }} [params]
 * @returns {string}
 */
export function buildSellerLinkDeviceProfileHref({ challengeId, approveToken } = {}) {
  const params = new URLSearchParams()
  params.set('linkDevice', '1')
  if (challengeId) params.set('challenge', challengeId)
  if (approveToken) params.set('token', approveToken)
  return `/seller/settings/profile?${params.toString()}`
}

/**
 * @returns {{ challengeId: string, approveToken: string } | null}
 */
export function readSellerLinkDeviceScanTarget() {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.sessionStorage.getItem(SELLER_LINK_DEVICE_SCAN_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed?.challengeId && parsed?.approveToken) {
      return {
        challengeId: String(parsed.challengeId),
        approveToken: String(parsed.approveToken),
      }
    }
  } catch {
    return null
  }

  return null
}

/**
 * @param {{ challengeId: string, approveToken: string } | null | undefined} scanTarget
 */
export function persistSellerLinkDeviceScanTarget(scanTarget) {
  if (typeof window === 'undefined') return

  if (!scanTarget) {
    window.sessionStorage.removeItem(SELLER_LINK_DEVICE_SCAN_STORAGE_KEY)
    return
  }

  window.sessionStorage.setItem(
    SELLER_LINK_DEVICE_SCAN_STORAGE_KEY,
    JSON.stringify({
      challengeId: scanTarget.challengeId,
      approveToken: scanTarget.approveToken,
    }),
  )
}

export function clearSellerLinkDeviceScanTarget() {
  persistSellerLinkDeviceScanTarget(null)
}
