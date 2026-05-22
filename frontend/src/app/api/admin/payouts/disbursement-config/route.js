import { NextResponse } from 'next/server'
import { requireAdminApiUser } from '@/lib/auth/requireAdminRoute'
import { getPaymongoDisbursementEnvStatus, getPaymongoOpsHealth } from '@/lib/payments/disbursement'

/**
 * GET /api/admin/payouts/disbursement-config
 *
 * PayMongo readiness for seller withdrawals (not admin escrow release).
 */
export async function GET() {
  const { responseError } = await requireAdminApiUser()
  if (responseError) return responseError

  const config = getPaymongoDisbursementEnvStatus()
  const opsHealth = getPaymongoOpsHealth()
  return NextResponse.json(
    {
      config: {
        ...config,
        withdrawReady: config.automatedReady,
      },
      opsHealth,
    },
    { status: 200 },
  )
}

export const dynamic = 'force-dynamic'
