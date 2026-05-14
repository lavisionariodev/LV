import { NextResponse } from 'next/server'
import { requireActiveSellerApiUser } from '@/lib/auth/requireApiUser'
import { buildSellerOrderDocumentPdf } from '@/lib/seller/buildSellerOrderDocumentPdf'

const TYPES = new Set(['invoice', 'receipt', 'summary', 'contract'])

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function money(n, currency = 'PHP') {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: currency || 'PHP',
    minimumFractionDigits: 2,
  }).format(Number(n) || 0)
}

function buildHtml({ type, order, seller, payment, items }) {
  const title = {
    invoice: 'Invoice',
    receipt: 'Payment Receipt',
    summary: 'Order Summary',
    contract: 'Service Contract',
  }[type]
  const label = order.order_number || order.id
  const rows = (items.length ? items : [{ name: 'Booking', quantity: 1, price: order.subtotal }])
    .map((item) => {
      const qty = Number(item.quantity) || 1
      const price = Number(item.price) || 0
      return `<tr><td>${esc(item.name)}</td><td>${qty}</td><td>${esc(money(price, order.currency))}</td><td>${esc(money(price * qty, order.currency))}</td></tr>`
    })
    .join('')
  return `<!doctype html><html><head><meta charset="utf-8"/><title>${esc(title)} ${esc(label)}</title>
<style>body{font-family:Arial,sans-serif;background:#faf9f7;color:#16181a;padding:32px}main{max-width:760px;margin:0 auto;background:#fff;border:1px solid #e5e7eb}header{background:#17352a;color:#fff;padding:22px 28px}h1{margin:0;font-size:18px}.body{padding:24px 28px}.grid{display:grid;grid-template-columns:150px 1fr;gap:8px 14px;font-size:13px}.label{font-weight:700;color:#64748b}table{width:100%;border-collapse:collapse;margin-top:24px;font-size:13px}th,td{padding:10px;border-bottom:1px solid #e5e7eb;text-align:left}th{background:#f8fafc;color:#475569}.total{text-align:right;font-weight:700;font-size:16px;margin-top:18px}.note{color:#64748b;font-size:12px;margin-top:24px}</style>
</head><body><main><header><h1>La Visionario · ${esc(title)}</h1></header><section class="body">
<div class="grid">
<div class="label">Order</div><div>${esc(label)}</div>
<div class="label">Issued</div><div>${esc(new Date().toLocaleString('en-PH'))}</div>
<div class="label">Seller</div><div>${esc(seller?.business_name || seller?.contact_name || seller?.email || 'Seller')}</div>
<div class="label">Buyer</div><div>${esc(order.contact_name || 'Buyer')}</div>
<div class="label">Payment</div><div>${esc(order.payment_status || order.status || 'pending')}${payment?.paymongo_reference ? ` · ${esc(payment.paymongo_reference)}` : ''}</div>
<div class="label">Fulfillment</div><div>${esc(order.fulfillment_status || 'pending')}</div>
</div>
<table><thead><tr><th>Description</th><th>Qty</th><th>Unit</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table>
<p class="total">Total: ${esc(money(order.subtotal, order.currency))}</p>
<p class="note">Generated from the seller portal order record.</p>
</section></main></body></html>`
}

export async function GET(request, context) {
  const params = await context.params
  const orderId = String(params?.orderId ?? '').trim()
  const { searchParams } = new URL(request.url)
  const type = String(searchParams.get('type') || 'summary').toLowerCase()
  const format = String(searchParams.get('format') || 'pdf').toLowerCase() === 'html' ? 'html' : 'pdf'

  if (!orderId) return NextResponse.json({ error: 'Missing order id.' }, { status: 400 })
  if (!TYPES.has(type)) return NextResponse.json({ error: 'Invalid document type.' }, { status: 400 })

  const { user, supabaseAdmin, responseError } = await requireActiveSellerApiUser()
  if (responseError) return responseError
  const { data: order, error: orderErr } = await supabaseAdmin
    .from('orders')
    .select('id,buyer_id,seller_user_id,order_number,status,fulfillment_status,payment_status,subtotal,currency,created_at,preferred_date,contact_name,contact_email,contact_phone,notes')
    .eq('id', orderId)
    .maybeSingle()

  if (orderErr || !order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
  if (order.seller_user_id !== user.id) return NextResponse.json({ error: 'Not allowed.' }, { status: 403 })

  const [{ data: items }, { data: seller }, { data: joins }] = await Promise.all([
    supabaseAdmin.from('order_items').select('name,quantity,price').eq('order_id', orderId).order('created_at', { ascending: true }),
    supabaseAdmin.from('sellers').select('business_name,contact_name,email,phone,address').eq('user_id', user.id).maybeSingle(),
    supabaseAdmin.from('payment_orders').select('payment_id').eq('order_id', orderId).limit(1),
  ])

  let payment = null
  const paymentId = joins?.[0]?.payment_id
  if (paymentId) {
    const { data } = await supabaseAdmin
      .from('payments')
      .select('id,status,provider,paymongo_reference,created_at')
      .eq('id', paymentId)
      .maybeSingle()
    payment = data || null
  }

  const label = order.order_number || String(order.id).slice(0, 8)
  const filename = `${type}-${String(label).replace(/[^a-zA-Z0-9-_]+/g, '_')}.${format}`

  if (format === 'html') {
    return new NextResponse(buildHtml({ type, order, seller, payment, items: items || [] }), {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  }

  const bytes = await buildSellerOrderDocumentPdf({ type, order, seller, payment, items: items || [] })
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
