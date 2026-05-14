import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import {
  QR_LOGIN_PORTAL_SELLER,
  QR_LOGIN_STATUS,
  buildSellerQrApproveUrl,
  generateQrLoginToken,
  getQrLoginExpiryDate,
  hashQrLoginToken,
  sanitizeQrLoginRedirectPath,
} from '@/lib/auth/qrLoginServer'

export async function POST(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const portal = typeof body?.portal === 'string' ? body.portal.trim() : ''
  if (portal !== QR_LOGIN_PORTAL_SELLER) {
    return NextResponse.json({ error: 'Unsupported portal.' }, { status: 400 })
  }

  const redirectPath = sanitizeQrLoginRedirectPath(body?.redirectPath)
  const approveToken = generateQrLoginToken()
  const pollSecret = generateQrLoginToken()
  const expiresAt = getQrLoginExpiryDate()
  const origin = new URL(request.url).origin

  let admin
  try {
    admin = getSupabaseAdmin()
  } catch (error) {
    console.error('[qr/challenge] Missing service role:', error)
    return NextResponse.json(
      { error: 'Server configuration error. Please try again later.' },
      { status: 500 },
    )
  }

  const { data, error } = await admin
    .from('seller_qr_login_challenges')
    .insert({
      portal,
      status: QR_LOGIN_STATUS.PENDING,
      approve_token_hash: hashQrLoginToken(approveToken),
      poll_secret_hash: hashQrLoginToken(pollSecret),
      redirect_path: redirectPath,
      expires_at: expiresAt,
    })
    .select('id')
    .single()

  if (error || !data?.id) {
    console.error('[qr/challenge] insert failed:', error)
    return NextResponse.json({ error: 'Could not start QR login.' }, { status: 500 })
  }

  return NextResponse.json({
    challengeId: data.id,
    pollSecret,
    approveUrl: buildSellerQrApproveUrl(origin, data.id, approveToken),
    expiresAt,
  })
}
