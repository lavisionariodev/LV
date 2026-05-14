import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import {
  QR_LOGIN_STATUS,
  hashQrLoginToken,
  isQrLoginExpired,
} from '@/lib/auth/qrLoginServer'

async function markChallengeExpired(admin, challengeId) {
  await admin
    .from('seller_qr_login_challenges')
    .update({ status: QR_LOGIN_STATUS.EXPIRED })
    .eq('id', challengeId)
    .eq('status', QR_LOGIN_STATUS.PENDING)
}

export async function GET(request, { params }) {
  const { id: challengeIdRaw } = await params
  const challengeId = typeof challengeIdRaw === 'string' ? challengeIdRaw.trim() : ''
  const searchParams = new URL(request.url).searchParams
  const pollSecret = (searchParams.get('pollSecret') || '').trim()
  const approveToken = (searchParams.get('approveToken') || '').trim()

  if (!challengeId || (!pollSecret && !approveToken)) {
    return NextResponse.json({ error: 'Missing challenge credentials.' }, { status: 400 })
  }

  if (pollSecret && approveToken) {
    return NextResponse.json({ error: 'Invalid challenge credentials.' }, { status: 400 })
  }

  let admin
  try {
    admin = getSupabaseAdmin()
  } catch (error) {
    console.error('[qr/challenge/:id] Missing service role:', error)
    return NextResponse.json(
      { error: 'Server configuration error. Please try again later.' },
      { status: 500 },
    )
  }

  if (approveToken) {
    const { data: challenge, error } = await admin
      .from('seller_qr_login_challenges')
      .select('id, status, approve_token_hash, expires_at')
      .eq('id', challengeId)
      .maybeSingle()

    if (error) {
      console.error('[qr/challenge/:id] approver load failed:', error)
      return NextResponse.json({ error: 'Could not check QR login status.' }, { status: 500 })
    }

    if (!challenge) {
      return NextResponse.json({ error: 'QR login request not found.' }, { status: 404 })
    }

    if (challenge.approve_token_hash !== hashQrLoginToken(approveToken)) {
      return NextResponse.json({ error: 'Invalid QR login credentials.' }, { status: 403 })
    }

    if (isQrLoginExpired(challenge.expires_at)) {
      if (challenge.status === QR_LOGIN_STATUS.PENDING) {
        await markChallengeExpired(admin, challenge.id)
      }
      return NextResponse.json({ status: QR_LOGIN_STATUS.EXPIRED })
    }

    return NextResponse.json({ status: challenge.status })
  }

  if (!pollSecret) {
    return NextResponse.json({ error: 'Missing challenge credentials.' }, { status: 400 })
  }

  const { data: challenge, error } = await admin
    .from('seller_qr_login_challenges')
    .select(
      'id, status, poll_secret_hash, expires_at, approved_user_id, magiclink_token_hash, redirect_path',
    )
    .eq('id', challengeId)
    .maybeSingle()

  if (error) {
    console.error('[qr/challenge/:id] load failed:', error)
    return NextResponse.json({ error: 'Could not check QR login status.' }, { status: 500 })
  }

  if (!challenge) {
    return NextResponse.json({ error: 'QR login request not found.' }, { status: 404 })
  }

  if (challenge.poll_secret_hash !== hashQrLoginToken(pollSecret)) {
    return NextResponse.json({ error: 'Invalid QR login credentials.' }, { status: 403 })
  }

  if (isQrLoginExpired(challenge.expires_at)) {
    if (challenge.status === QR_LOGIN_STATUS.PENDING) {
      await markChallengeExpired(admin, challenge.id)
    }
    return NextResponse.json({ status: QR_LOGIN_STATUS.EXPIRED })
  }

  if (challenge.status === QR_LOGIN_STATUS.DENIED) {
    return NextResponse.json({ status: QR_LOGIN_STATUS.DENIED })
  }

  if (challenge.status === QR_LOGIN_STATUS.CONSUMED) {
    return NextResponse.json({ status: QR_LOGIN_STATUS.CONSUMED })
  }

  if (challenge.status === QR_LOGIN_STATUS.PENDING) {
    return NextResponse.json({ status: QR_LOGIN_STATUS.PENDING })
  }

  if (challenge.status !== QR_LOGIN_STATUS.APPROVED || !challenge.magiclink_token_hash) {
    return NextResponse.json({ status: QR_LOGIN_STATUS.PENDING })
  }

  const { data: approvedUser, error: approvedUserErr } = await admin.auth.admin.getUserById(
    challenge.approved_user_id,
  )

  if (approvedUserErr || !approvedUser?.user?.email) {
    console.error('[qr/challenge/:id] approved user lookup failed:', approvedUserErr)
    return NextResponse.json({ error: 'Could not complete QR login.' }, { status: 500 })
  }

  const { data: consumedRow, error: consumeErr } = await admin
    .from('seller_qr_login_challenges')
    .update({
      status: QR_LOGIN_STATUS.CONSUMED,
      consumed_at: new Date().toISOString(),
    })
    .eq('id', challenge.id)
    .eq('status', QR_LOGIN_STATUS.APPROVED)
    .select('id')
    .maybeSingle()

  if (consumeErr || !consumedRow) {
    return NextResponse.json({ status: QR_LOGIN_STATUS.CONSUMED })
  }

  return NextResponse.json({
    status: QR_LOGIN_STATUS.APPROVED,
    email: approvedUser.user.email,
    tokenHash: challenge.magiclink_token_hash,
    redirectPath: challenge.redirect_path,
  })
}
