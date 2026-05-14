import { NextResponse } from 'next/server'
import { requireActiveBuyerApiUser } from '@/lib/auth/requireApiUser'
import { listBuyerOrdersForApi } from '@/lib/profile/listBuyerOrdersForApi'

export async function GET() {
  const { user, supabaseAdmin, responseError } = await requireActiveBuyerApiUser()
  if (responseError) return responseError

  const { orders, items, reviewedItemIdsByOrder, error } = await listBuyerOrdersForApi(
    supabaseAdmin,
    user.id,
  )
  if (error) {
    return NextResponse.json({ error }, { status: 500 })
  }

  return NextResponse.json({ orders, items, reviewedItemIdsByOrder }, { status: 200 })
}

export const dynamic = 'force-dynamic'
