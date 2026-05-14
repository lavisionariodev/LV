import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdminApiUser } from '@/lib/auth/requireAdminRoute'
import { rowToSiteContent, siteContentToRow } from '@/lib/siteContent/mapping'

const TABLE = 'site_content'
const GLOBAL_ID = 'global'

export async function POST(request) {
  const { responseError } = await requireAdminApiUser()
  if (responseError) return responseError

  const supabase = await createClient()

  const body = await request.json().catch(() => null)
  const content = body?.content
  if (!content || typeof content !== 'object') {
    return NextResponse.json({ error: 'Missing site content payload.' }, { status: 400 })
  }

  const row = siteContentToRow(content)

  const { data, error } = await supabase
    .from(TABLE)
    .upsert(
      {
        id: GLOBAL_ID,
        ...row,
      },
      { onConflict: 'id' },
    )
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message || 'Failed to save site content.' }, { status: 400 })
  }

  return NextResponse.json({ data: rowToSiteContent(data) }, { status: 200 })
}

