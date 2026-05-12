import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

function sum(rows, field, predicate = () => true) {
  return rows.reduce((total, row) => (predicate(row) ? total + (Number(row[field]) || 0) : total), 0)
}

function csvEscape(v) {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export async function GET(request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()
  if (userErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const format = String(searchParams.get('format') || 'json').toLowerCase()

  const supabaseAdmin = getSupabaseAdmin()
  const { data, error } = await supabaseAdmin
    .from('order_escrows')
    .select('id,order_id,payment_id,gross_amount,commission_rate_percent,commission_amount,net_amount,currency,status,hold_reason,released_at,release_reference,created_at')
    .eq('seller_user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) {
    return NextResponse.json({ error: error.message || 'Failed to load escrow summary.' }, { status: 500 })
  }

  const rows = data || []
  if (format === 'csv') {
    const header = [
      'order_id',
      'status',
      'gross_amount',
      'commission_rate_percent',
      'commission_amount',
      'net_amount',
      'currency',
      'released_at',
      'release_reference',
      'hold_reason',
      'created_at',
    ]
    const body = rows
      .map((r) =>
        header
          .map((key) => csvEscape(r[key]))
          .join(','),
      )
      .join('\n')
    return new NextResponse(`${header.join(',')}\n${body}`, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="seller-escrow-report.csv"',
        'Cache-Control': 'no-store',
      },
    })
  }

  const summary = {
    count: rows.length,
    currency: rows[0]?.currency || 'PHP',
    gross: sum(rows, 'gross_amount'),
    commission: sum(rows, 'commission_amount'),
    net: sum(rows, 'net_amount'),
    escrowedNet: sum(rows, 'net_amount', (r) => r.status === 'escrowed'),
    heldNet: sum(rows, 'net_amount', (r) => r.status === 'on_hold'),
    releasedNet: sum(rows, 'net_amount', (r) => r.status === 'released'),
    refundedNet: sum(rows, 'net_amount', (r) => r.status === 'refunded'),
  }

  return NextResponse.json({ summary, escrows: rows }, { status: 200 })
}
