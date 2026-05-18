import { NextResponse } from 'next/server'
import { requireActiveSellerApiUser } from '@/lib/auth/requireApiUser'
import {
  buildSellerWalletSummary,
  fetchPayoutDisbursementsForSeller,
  fetchSellerWalletLedgerEntries,
  fetchSellerWithdrawalsForSeller,
  indexDisbursementsByEscrowId,
  resolveEscrowDisbursementState,
} from '@/lib/payments/wallet'

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
  let disbursements = []
  let withdrawals = []
  let ledgerEntries = []
  try {
    allRows = await fetchAllEscrows(supabaseAdmin, user.id, { from, to })
    const escrowIds = allRows.map((row) => row.id).filter(Boolean)
    disbursements = await fetchPayoutDisbursementsForSeller(supabaseAdmin, {
      sellerUserId: user.id,
      escrowIds: escrowIds.length ? escrowIds : null,
    })
    withdrawals = await fetchSellerWithdrawalsForSeller(supabaseAdmin, user.id)
    ledgerEntries = await fetchSellerWalletLedgerEntries(supabaseAdmin, user.id)
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Failed to load escrow summary.' }, { status: 500 })
  }

  const disbursementByEscrowId = indexDisbursementsByEscrowId(disbursements)

  const enrichedRows = allRows.map((row) => {
    const disbursement = disbursementByEscrowId.get(row.id) ?? null
    return {
      ...row,
      disbursement_status: disbursement?.status ?? null,
      disbursement_state: resolveEscrowDisbursementState(row, disbursement),
      paymongo_transfer_id: disbursement?.paymongo_transfer_id ?? null,
    }
  })

  const rows = enrichedRows.slice(offset, offset + limit)
  if (format === 'csv') {
    const header = [
      'order_id',
      'status',
      'disbursement_state',
      'disbursement_status',
      'gross_amount',
      'commission_rate_percent',
      'commission_amount',
      'net_amount',
      'currency',
      'released_at',
      'release_reference',
      'paymongo_transfer_id',
      'hold_reason',
      'created_at',
    ]
    const body = enrichedRows
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

  const summary = buildSellerWalletSummary(allRows, disbursements, withdrawals, ledgerEntries)
  const ledgerLimit = parsePositiveInt(searchParams.get('ledgerLimit'), 50, 200)
  const ledgerOffset = Math.max(0, parseInt(String(searchParams.get('ledgerOffset') || '0'), 10) || 0)
  const ledgerPageRows = ledgerEntries.slice(ledgerOffset, ledgerOffset + ledgerLimit).map((row) => ({
    id: row.id,
    entryType: row.entry_type,
    amountPhp: row.amount_php,
    currency: row.currency,
    orderId: row.order_id,
    escrowId: row.escrow_id,
    disbursementId: row.disbursement_id,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  }))

  return NextResponse.json(
    {
      summary,
      escrows: rows,
      ledgerEntries: ledgerPageRows,
      ledgerPage: {
        limit: ledgerLimit,
        offset: ledgerOffset,
        total: ledgerEntries.length,
        hasMore: ledgerOffset + ledgerLimit < ledgerEntries.length,
      },
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
