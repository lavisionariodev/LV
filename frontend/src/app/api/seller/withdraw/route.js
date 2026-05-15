import { NextResponse } from 'next/server'
import { requireActiveSellerApiUser } from '@/lib/auth/requireApiUser'
import { loadSellerWalletContext, processSellerWithdrawal } from '@/lib/payments/processSellerWithdrawal'
import { getPaymongoDisbursementEnvStatus } from '@/lib/payments/disbursementConfig'

export async function GET() {
  const { user, supabaseAdmin, responseError } = await requireActiveSellerApiUser()
  if (responseError) return responseError

  try {
    const { summary, withdrawals } = await loadSellerWalletContext(supabaseAdmin, user.id)
    const withdrawConfig = getPaymongoDisbursementEnvStatus()

    return NextResponse.json({
      summary,
      withdrawConfig: {
        ...withdrawConfig,
        withdrawReady: withdrawConfig.automatedReady,
      },
      withdrawals: (withdrawals ?? []).slice(0, 50).map((row) => ({
        id: row.id,
        amountPhp: row.amount_php,
        currency: row.currency,
        status: row.status,
        failureReason: row.failure_reason,
        submittedAt: row.submitted_at,
        settledAt: row.settled_at,
        createdAt: row.created_at,
      })),
    })
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to load withdrawal summary.' },
      { status: 500 },
    )
  }
}

export async function POST(request) {
  const { user, supabaseAdmin, responseError } = await requireActiveSellerApiUser()
  if (responseError) return responseError

  const body = await request.json().catch(() => ({}))
  const amountPhp = Number(body?.amountPhp)
  const idempotencyKey =
    body?.idempotencyKey != null
      ? String(body.idempotencyKey).trim()
      : `client-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

  const result = await processSellerWithdrawal(supabaseAdmin, {
    sellerUserId: user.id,
    amountPhp,
    idempotencyKey,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status || 400 })
  }

  const withdrawal = result.withdrawal
  return NextResponse.json(
    {
      ok: true,
      pending: Boolean(result.pending),
      alreadyProcessed: Boolean(result.alreadyProcessed),
      withdrawal: withdrawal
        ? {
            id: withdrawal.id,
            amountPhp: withdrawal.amount_php,
            currency: withdrawal.currency,
            status: withdrawal.status,
            failureReason: withdrawal.failure_reason,
            paymongoTransferId: withdrawal.paymongo_transfer_id,
          }
        : null,
    },
    { status: result.alreadyProcessed || result.pending ? 200 : 201 },
  )
}
