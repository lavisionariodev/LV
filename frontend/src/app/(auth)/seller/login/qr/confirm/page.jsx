import { redirect } from 'next/navigation'
import { buildSellerLinkDeviceProfileHref } from '@/lib/auth/sellerLinkDeviceState'
import SellerQrConfirmView from './SellerQrConfirmView'

export const dynamic = 'force-dynamic'

/**
 * @param {{ searchParams: Promise<Record<string, string | string[] | undefined>> }} props
 */
export default async function SellerQrConfirmPage({ searchParams }) {
  const params = await searchParams
  const challengeId = readSearchParam(params.challenge)
  const approveToken = readSearchParam(params.token)
  const fromSettings = readSearchParam(params.from) === 'settings'

  if (fromSettings && challengeId && approveToken) {
    redirect(
      buildSellerLinkDeviceProfileHref({ challengeId, approveToken }),
    )
  }

  return (
    <SellerQrConfirmView
      challengeId={challengeId}
      approveToken={approveToken}
      fromSettings={fromSettings}
    />
  )
}

/**
 * @param {string | string[] | undefined} value
 * @returns {string}
 */
function readSearchParam(value) {
  if (typeof value === 'string') return value.trim()
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0].trim()
  return ''
}
