import { NextResponse } from 'next/server'
import { requireActiveSellerApiUser } from '@/lib/auth/requireApiUser'
import {
  QR_LOGIN_STATUS,
  hashQrLoginToken,
  isQrLoginExpired,
} from '@/lib/auth/qrLoginServer'

async function loadPendingChallenge(admin, challengeId, approveToken) {
  const { data: challenge, error } = await admin
    .from('seller_qr_login_challenges')
    .select('id, status, approve_token_hash, expires_at')
    .eq('id', challengeId)
    .maybeSingle()

  if (error) {
    return { challenge: null, responseError: NextResponse.json({ error: 'Could not load QR login request.' }, { status: 500 }) }
  }

  if (!challenge) {
    return { challenge: null, responseError: NextResponse.json({ error: 'QR login request not found.' }, { status: 404 }) }
  }

  if (challenge.approve_token_hash !== hashQrLoginToken(approveToken)) {
    return { challenge: null, responseError: NextResponse.json({ error: 'Invalid QR login request.' }, { status: 403 }) }
  }

  if (isQrLoginExpired(challenge.expires_at)) {
    if (challenge.status === QR_LOGIN_STATUS.PENDING) {
      await admin
        .from('seller_qr_login_challenges')
        .update({ status: QR_LOGIN_STATUS.EXPIRED })
        .eq('id', challenge.id)
        .eq('status', QR_LOGIN_STATUS.PENDING)
    }
    return { challenge: null, responseError: NextResponse.json({ error: 'This QR login request has expired.' }, { status: 410 }) }
  }

  if (challenge.status !== QR_LOGIN_STATUS.PENDING) {
    return { challenge: null, responseError: NextResponse.json({ error: 'This QR login request is no longer available.' }, { status: 409 }) }
  }

  return { challenge, responseError: null }
}

export async function POST(request) {
  const { user, supabaseAdmin, responseError } = await requireActiveSellerApiUser()
  if (responseError) return responseError

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const challengeId = typeof body?.challengeId === 'string' ? body.challengeId.trim() : ''
  const approveToken = typeof body?.approveToken === 'string' ? body.approveToken.trim() : ''

  if (!challengeId || !approveToken) {
    return NextResponse.json({ error: 'Missing QR login credentials.' }, { status: 400 })
  }

  const { challenge, responseError: challengeError } = await loadPendingChallenge(
    supabaseAdmin,
    challengeId,
    approveToken,
  )
  if (challengeError) return challengeError

  const email = user.email
  if (!email) {
    return NextResponse.json({ error: 'Seller account email is required to approve login.' }, { status: 400 })
  }

  const origin = new URL(request.url).origin
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: {
      redirectTo: `${origin}/seller`,
    },
  })

  const tokenHash = linkData?.properties?.hashed_token
  if (linkError || !tokenHash) {
    console.error('[qr/approve] generateLink failed:', linkError)
    return NextResponse.json({ error: 'Could not approve this login request.' }, { status: 500 })
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('seller_qr_login_challenges')
    .update({
      status: QR_LOGIN_STATUS.APPROVED,
      approved_user_id: user.id,
      magiclink_token_hash: tokenHash,
      approved_at: new Date().toISOString(),
    })
    .eq('id', challenge.id)
    .eq('status', QR_LOGIN_STATUS.PENDING)
    .select('id')
    .maybeSingle()

  if (updateError || !updated) {
    return NextResponse.json({ error: 'This QR login request is no longer available.' }, { status: 409 })
  }

  return NextResponse.json({ ok: true })
}
