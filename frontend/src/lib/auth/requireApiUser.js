import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { ROLE_BUYER, ROLE_SELLER } from '@/lib/auth/roles'

/**
 * @returns {Promise<{
 *   user: import('@supabase/supabase-js').User | null,
 *   supabase: Awaited<ReturnType<typeof createClient>>,
 *   responseError: Response | null
 * }>}
 */
export async function requireActiveBuyerApiUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()

  if (userErr || !user) {
    return {
      user: null,
      supabase,
      responseError: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const supabaseAdmin = getSupabaseAdmin()
  const { data: userRow, error: rowErr } = await supabaseAdmin
    .from('users')
    .select('role, status')
    .eq('id', user.id)
    .maybeSingle()

  if (rowErr) {
    return {
      user: null,
      supabase,
      responseError: NextResponse.json({ error: 'Failed to verify account.' }, { status: 500 }),
    }
  }

  if (!userRow || userRow.role !== ROLE_BUYER) {
    return {
      user: null,
      supabase,
      responseError: NextResponse.json({ error: 'Only buyers can use this feature.' }, { status: 403 }),
    }
  }

  const status = String(userRow.status || 'active').toLowerCase()
  if (status === 'suspended') {
    return {
      user: null,
      supabase,
      responseError: NextResponse.json(
        {
          error:
            'Your buyer account has been suspended. Please contact support if you believe this is in error.',
        },
        { status: 403 },
      ),
    }
  }

  return { user, supabase, responseError: null }
}

/**
 * @returns {Promise<{
 *   user: import('@supabase/supabase-js').User | null,
 *   supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
 *   responseError: Response | null
 * }>}
 */
export async function requireActiveSellerApiUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()

  const supabaseAdmin = getSupabaseAdmin()

  if (userErr || !user) {
    return {
      user: null,
      supabaseAdmin,
      responseError: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const [{ data: userRow, error: userRowErr }, { data: sellerRow, error: sellerErr }] =
    await Promise.all([
      supabaseAdmin.from('users').select('role').eq('id', user.id).maybeSingle(),
      supabaseAdmin.from('sellers').select('status').eq('user_id', user.id).maybeSingle(),
    ])

  if (userRowErr || sellerErr) {
    return {
      user: null,
      supabaseAdmin,
      responseError: NextResponse.json({ error: 'Failed to verify seller account.' }, { status: 500 }),
    }
  }

  if (!userRow || userRow.role !== ROLE_SELLER) {
    return {
      user: null,
      supabaseAdmin,
      responseError: NextResponse.json({ error: 'Seller account required.' }, { status: 403 }),
    }
  }

  if (!sellerRow?.status || String(sellerRow.status).toLowerCase() !== 'active') {
    return {
      user: null,
      supabaseAdmin,
      responseError: NextResponse.json(
        { error: 'Seller account is not allowed to perform this action.' },
        { status: 403 },
      ),
    }
  }

  return { user, supabaseAdmin, responseError: null }
}
