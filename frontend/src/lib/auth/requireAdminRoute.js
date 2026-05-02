import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * @returns {Promise<{ user: import('@supabase/supabase-js').User | null, responseError: Response | null }>}
 */
export async function requireAdminApiUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()

  if (userErr || !user) {
    return {
      user: null,
      responseError: NextResponse.json({ error: 'Not authenticated.' }, { status: 401 }),
    }
  }

  const { data: adminRow, error: adminErr } = await supabase
    .from('admins')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (adminErr) {
    return {
      user: null,
      responseError: NextResponse.json(
        { error: adminErr.message ?? 'Failed to verify admin.' },
        { status: 500 },
      ),
    }
  }

  if (!adminRow) {
    return {
      user: null,
      responseError: NextResponse.json({ error: 'Forbidden.' }, { status: 403 }),
    }
  }

  return { user, responseError: null }
}
