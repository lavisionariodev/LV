import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireAdminApiUser } from '@/lib/auth/requireAdminRoute'
import {
  buildAnalystExportCsv,
  buildAnalystExportSheets,
  getAdminAnalystMetrics,
} from '@/lib/admin/adminAnalystMetrics'
import * as XLSX from 'xlsx'

export async function GET(request) {
  const { responseError } = await requireAdminApiUser()
  if (responseError) return responseError

  const { searchParams } = new URL(request.url)
  const format = String(searchParams.get('format') || '').toLowerCase()
  if (format !== 'csv' && format !== 'xlsx') {
    return NextResponse.json(
      { error: 'Query parameter format must be csv or xlsx.' },
      { status: 400 },
    )
  }

  try {
    const supabaseAdmin = getSupabaseAdmin()
    const metrics = await getAdminAnalystMetrics(supabaseAdmin)
    const { exportRows, analystSummary } = metrics

    if (format === 'csv') {
      const csv = buildAnalystExportCsv(exportRows, analystSummary)
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="admin-analytics-report.csv"',
          'Cache-Control': 'no-store',
        },
      })
    }

    const { monthlySummary, kpiSnapshot } = buildAnalystExportSheets(exportRows, analystSummary)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(monthlySummary),
      'Monthly Summary',
    )
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(kpiSnapshot),
      'KPI Snapshot',
    )
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="admin-analytics-report.xlsx"',
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to export analytics.' },
      { status: 500 },
    )
  }
}

export const dynamic = 'force-dynamic'
