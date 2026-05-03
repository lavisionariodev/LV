import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { formatMoney, formatMoneyReceiptPdf } from '@/lib/profile/mapBuyerOrderCard'
import { buildReceiptPdf } from '@/lib/profile/buildReceiptPdf'
import { apiLog, errorMessage } from '@/lib/observability/apiLog'
import { getClientIp, takeToken } from '@/lib/rate-limit/memoryRateLimit'

function escHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function GET(request) {
  const ip = getClientIp(request)
  const rl = takeToken(`receipt:${ip}`, { windowMs: 15 * 60_000, max: 120 })
  if (!rl.ok) {
    apiLog('receipt.ratelimited', { retryAfterSec: rl.retryAfterSec })
    return NextResponse.json(
      { error: 'Too many receipt requests.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec ?? 60) } },
    )
  }

  const supabase = await createClient()
  const supabaseAdmin = getSupabaseAdmin()

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()

  if (userErr || !user) {
    apiLog('receipt.unauthorized', {})
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const orderId = String(searchParams.get('orderId') ?? '').trim()
  let format = String(searchParams.get('format') ?? 'pdf').toLowerCase()
  if (format !== 'pdf' && format !== 'html') format = 'pdf'

  if (!orderId) {
    return NextResponse.json({ error: 'Missing orderId.' }, { status: 400 })
  }

  try {
    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .select(
        [
          'id',
          'buyer_id',
          'order_number',
          'subtotal',
          'currency',
          'payment_status',
          'status',
          'created_at',
          'preferred_date',
          'refund_status',
        ].join(','),
      )
      .eq('id', orderId)
      .maybeSingle()

    if (orderErr || !order) {
      apiLog('receipt.not_found', { format })
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
    }

    if (order.buyer_id !== user.id) {
      apiLog('receipt.forbidden', {})
      return NextResponse.json({ error: 'Not allowed.' }, { status: 403 })
    }

    const isPaid = order.payment_status === 'paid' || order.status === 'paid'
    const rs = order.refund_status ? String(order.refund_status) : ''
    const refundBlocksReceipt =
      order.payment_status === 'refund_pending' ||
      order.payment_status === 'refunded' ||
      ['requested', 'processing', 'completed'].includes(rs)

    if (refundBlocksReceipt) {
      return NextResponse.json(
        {
          error:
            'Receipt is not available while a refund is open or after the order is refunded.',
        },
        { status: 403 },
      )
    }

    if (!isPaid) {
      return NextResponse.json(
        { error: 'Receipt available after payment completes.' },
        { status: 403 },
      )
    }

    const { data: items, error: itemsErr } = await supabaseAdmin
      .from('order_items')
      .select('name,quantity,price')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true })

    if (itemsErr) {
      apiLog('receipt.items_error', { err: errorMessage(itemsErr) })
      return NextResponse.json({ error: 'Failed to load line items.' }, { status: 500 })
    }

    const currency = order.currency || 'PHP'
    let paidPayment = null

    const { data: joinRows } = await supabaseAdmin
      .from('payment_orders')
      .select('payment_id')
      .eq('order_id', orderId)

    const paymentIds = (joinRows ?? []).map((r) => r.payment_id).filter(Boolean)

    if (paymentIds.length > 0) {
      const { data: pays } = await supabaseAdmin
        .from('payments')
        .select('id,paymongo_reference,created_at,status')
        .in('id', paymentIds)
        .eq('buyer_id', user.id)

      const matched = (pays ?? []).find((p) => p.status === 'paid') ?? (pays ?? [])[0]
      if (matched) {
        paidPayment = {
          paymongo_reference: matched.paymongo_reference ?? null,
          created_at: matched.created_at,
        }
      }
    }

    const label = order.order_number || order.id
    const baseName = String(label).replace(/[^a-zA-Z0-9-_]+/g, '_')

    const localeOpts = 'en-PH'
    const issuedAt = escHtml(new Date(order.created_at).toLocaleString(localeOpts))
    const paidAt = paidPayment?.created_at
      ? escHtml(new Date(paidPayment.created_at).toLocaleString(localeOpts))
      : ''

    const itemRowsHtml = (items ?? [])
      .map((it) => {
        const qty = Number(it.quantity) || 1
        const unit = Number(it.price)
        const lineTotal = Number.isFinite(unit) ? unit * qty : null
        const unitCell =
          Number.isFinite(unit) && unit > 0 ? escHtml(formatMoney(unit, currency)) : '—'
        const lineCell =
          lineTotal != null && Number.isFinite(lineTotal)
            ? escHtml(formatMoney(lineTotal, currency))
            : '—'
        return `<tr>
<td>${escHtml(it.name)}</td>
<td class="qty">${qty}</td>
<td class="num">${unitCell}</td>
<td class="num">${lineCell}</td>
</tr>`
      })
      .join('')

    const totalStr = escHtml(formatMoney(Number(order.subtotal) || 0, currency))

    if (format === 'html') {
      const filename = `receipt-${baseName}.html`
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>Receipt ${escHtml(label)}</title>
<style>
*{box-sizing:border-box}
body{
  margin:0;
  padding:32px 20px;
  color:#16181a;
  background:#faf9f7;
  font-family:'Segoe UI',system-ui,'Helvetica Neue',Arial,'DejaVu Sans',sans-serif;
  font-size:13px;
  line-height:1.45;
  -webkit-font-smoothing:antialiased;
}
.sheet{
  max-width:700px;margin:0 auto;background:#fff;
  border:1px solid #e8e5df;
  box-shadow:0 2px 12px rgba(16,28,26,0.06);
}
.header{
  padding:22px 28px 18px;
  border-bottom:2px solid #102820;
  background:linear-gradient(180deg,#1a3829 0%,#102821 100%);
  color:#f4f3ef;
}
.header h1{margin:0 0 4px;font-size:1rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase}
.header .subtitle{margin:0;font-size:0.78rem;opacity:.9;letter-spacing:0.04em;text-align:right;margin-top:-1.35rem;font-weight:500}
.meta-grid{
  display:grid;grid-template-columns:130px 1fr;gap:6px 12px;padding:22px 28px 14px;font-size:12px;color:#454a50;
}
.meta-grid dt{margin:0;font-weight:700;text-transform:uppercase;font-size:.65rem;letter-spacing:.07em;color:#8a8073}
.meta-grid dd{margin:0;color:#252a28}
.section-title{margin:18px 28px 10px;font-size:.68rem;text-transform:uppercase;letter-spacing:.1em;color:#8a8073;font-weight:700}

table{width:100%;border-collapse:collapse;margin:0 0 22px;font-size:12.25px;font-variant-numeric:tabular-nums;}
thead th{padding:11px 12px;text-align:left;font-size:.65rem;text-transform:uppercase;letter-spacing:.08em;color:#5c6561;background:#f3f2ed;border-bottom:1px solid #ddd8cf}
thead th.num, td.num{text-align:right}
thead th.qty, td.qty{text-align:center;width:48px;border-left:1px solid #eae6df;border-right:1px solid #eae6df}

tbody td{padding:11px 12px;border-bottom:1px solid #efece6;vertical-align:top}
tbody td:first-child{padding-left:28px}
tbody td:last-child{padding-right:28px}
tbody tr:last-child td{border-bottom:none}
tfoot td{padding:14px 12px;font-weight:700;border-top:2px solid #d4cfc4;background:#faf9f7}
tfoot td.label{text-transform:uppercase;font-size:.7rem;letter-spacing:.06em;color:#5c554a}
.footer{padding:14px 28px 26px;color:#716a62;font-size:11px;line-height:1.5;border-top:1px solid #efece6;background:#fcfbf9}
strong.total{font-size:1.05rem}
</style>
</head>
<body>
<div class="sheet">
<div class="header">
<h1>La Visionario</h1>
<p class="subtitle">Official payment receipt</p>
</div>
<dl class="meta-grid">
<dt>Order number</dt><dd><strong>${escHtml(label)}</strong></dd>
<dt>Date issued</dt><dd>${issuedAt}</dd>
${paidAt ? `<dt>Payment recorded</dt><dd>${paidAt}</dd>` : ''}
<dt>Currency</dt><dd>${escHtml(String(currency))}</dd>
${paidPayment?.paymongo_reference ? `<dt>Transaction ref.</dt><dd>${escHtml(paidPayment.paymongo_reference)}</dd>` : ''}
<dt>Processor</dt><dd>PayMongo</dd>
</dl>
<p class="section-title">Line items</p>
<table>
<thead><tr>
<th style="padding-left:28px">Description</th>
<th class="qty">Qty</th>
<th class="num" style="width:110px">Unit price</th>
<th class="num" style="width:112px;padding-right:28px">Amount</th>
</tr></thead>
<tbody>${itemRowsHtml || '<tr><td colspan="4">No line items recorded.</td></tr>'}</tbody>
<tfoot><tr>
<td colspan="3" class="label" style="padding-left:28px">Total (paid)</td>
<td class="num" style="padding-right:28px"><strong class="total">${totalStr}</strong></td>
</tr></tfoot>
</table>
<div class="footer">
Thank you for your business. Keep this receipt for your records.</div></div></body>
</html>`

      apiLog('receipt.ok', { format: 'html' })
      return new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    }

    const pdfRows =
      items?.map((it) => {
        const qty = Number(it.quantity) || 1
        const unit = Number(it.price)
        const lineTotal = Number.isFinite(unit) ? unit * qty : null
        return {
          name: `${it.name}`,
          qty,
          unitFmt:
            Number.isFinite(unit) && unit > 0 ? formatMoneyReceiptPdf(unit, currency) : '-',
          lineFmt:
            lineTotal != null && Number.isFinite(lineTotal)
              ? formatMoneyReceiptPdf(lineTotal, currency)
              : '-',
        }
      }) ?? []

    const bytes = await buildReceiptPdf({
      label,
      currency,
      issuedAtIso: new Date(order.created_at).toLocaleString('en-PH'),
      paidAtIso: paidPayment?.created_at
        ? new Date(paidPayment.created_at).toLocaleString('en-PH')
        : null,
      reference: paidPayment?.paymongo_reference ?? null,
      rows: pdfRows,
      totalFmt: formatMoneyReceiptPdf(Number(order.subtotal) || 0, currency),
    })

    apiLog('receipt.ok', { format: 'pdf' })
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="receipt-${baseName}.pdf"`,
      },
    })
  } catch (e) {
    apiLog('receipt.exception', { err: errorMessage(e) })
    return NextResponse.json({ error: 'Failed to generate receipt.' }, { status: 500 })
  }
}
