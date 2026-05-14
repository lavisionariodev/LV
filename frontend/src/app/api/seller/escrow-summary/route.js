import { NextResponse } from 'next/server'
import { requireActiveSellerApiUser } from '@/lib/auth/requireApiUser'

function sum(rows, field, predicate = () => true) {
  return rows.reduce((total, row) => (predicate(row) ? total + (Number(row[field]) || 0) : total), 0)
}

function csvEscape(v) {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function parsePositiveInt(value, fallback, max) {
  const n = parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(n) || n < 1) return fallback
  return Math.min(n, max)
}

function applyFilters(query, userId, { from, to }) {
  let q = query.eq('seller_user_id', userId)
  if (from) q = q.gte('created_at', from)
  if (to) q = q.lte('created_at', to)
  return q
}

async function fetchAllEscrows(supabaseAdmin, userId, filters) {
  const pageSize = 1000
  const rows = []
  for (let offset = 0; offset < 10000; offset += pageSize) {
    const { data, error } = await applyFilters(
      supabaseAdmin
        .from('order_escrows')
        .select('id,order_id,payment_id,gross_amount,commission_rate_percent,commission_amount,net_amount,currency,status,hold_reason,released_at,release_reference,created_at')
        .order('created_at', { ascending: false }),
      userId,
      filters,
    ).range(offset, offset + pageSize - 1)
    if (error) throw error
    rows.push(...(data || []))
    if (!data || data.length < pageSize) break
  }
  return rows
}

export async function GET(request) {
  const { user, supabaseAdmin, responseError } = await requireActiveSellerApiUser()
  if (responseError) return responseError

  const { searchParams } = new URL(request.url)
  const format = String(searchParams.get('format') || 'json').toLowerCase()
  const from = searchParams.get('from') || ''
  const to = searchParams.get('to') || ''
  const limit = parsePositiveInt(searchParams.get('limit'), 500, 500)
  const offset = Math.max(0, parseInt(String(searchParams.get('offset') || '0'), 10) || 0)

  let allRows = []
  try {
    allRows = await fetchAllEscrows(supabaseAdmin, user.id, { from, to })
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Failed to load escrow summary.' }, { status: 500 })
  }

  const rows = allRows.slice(offset, offset + limit)
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
    const body = allRows
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
    count: allRows.length,
    currency: allRows[0]?.currency || 'PHP',
    gross: sum(allRows, 'gross_amount'),
    commission: sum(allRows, 'commission_amount'),
    net: sum(allRows, 'net_amount'),
    escrowedNet: sum(allRows, 'net_amount', (r) => r.status === 'escrowed'),
    heldNet: sum(allRows, 'net_amount', (r) => r.status === 'on_hold'),
    releasedNet: sum(allRows, 'net_amount', (r) => r.status === 'released'),
    refundedNet: sum(allRows, 'net_amount', (r) => r.status === 'refunded'),
  }

  return NextResponse.json(
    {
      summary,
      escrows: rows,
      page: {
        limit,
        offset,
        total: allRows.length,
        hasMore: offset + limit < allRows.length,
      },
    },
    { status: 200 },
  )
}
