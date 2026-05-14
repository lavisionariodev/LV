import { NextResponse } from 'next/server'
import { requireAdminApiUser } from '@/lib/auth/requireAdminRoute'
import { getPaymongoDisbursementEnvStatus } from '@/lib/payments/disbursementConfig'

/**
 * GET /api/admin/payouts/disbursement-config
 *
 * Read-only PayMongo disbursement readiness for admin payout tooling.
 */
export async function GET() {
  const { responseError } = await requireAdminApiUser()
  if (responseError) return responseError

  return NextResponse.json({ config: getPaymongoDisbursementEnvStatus() }, { status: 200 })
}

export const dynamic = 'force-dynamic'
