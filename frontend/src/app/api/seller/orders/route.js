import { NextResponse } from 'next/server'
import { requireActiveSellerApiUser } from '@/lib/auth/requireApiUser'
import { listSellerOrdersForApi } from '@/lib/seller/listSellerOrdersForApi'

export async function GET() {
  const { user, supabaseAdmin, responseError } = await requireActiveSellerApiUser()
  if (responseError) return responseError

  const { orders, error } = await listSellerOrdersForApi(supabaseAdmin, user.id)
  if (error) {
    return NextResponse.json({ error }, { status: 500 })
  }

  return NextResponse.json({ orders }, { status: 200 })
}

export const dynamic = 'force-dynamic'
