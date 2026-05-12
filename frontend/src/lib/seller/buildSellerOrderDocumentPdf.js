import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

function ascii(s, maxLen = 220) {
  return String(s ?? '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen)
}

function money(n, currency = 'PHP') {
  const amount = Number(n) || 0
  return `${ascii(currency, 8)} ${amount.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function drawRight(page, font, text, size, color, rightX, y) {
  const t = ascii(text, 96)
  const w = font.widthOfTextAtSize(t, size)
  page.drawText(t, { x: rightX - w, y, size, font, color })
}

const TITLE_BY_TYPE = {
  invoice: 'Invoice',
  receipt: 'Payment Receipt',
  summary: 'Order Summary',
  contract: 'Service Contract',
}

/**
 * @param {{
 *   type: 'invoice' | 'receipt' | 'summary' | 'contract',
 *   order: Record<string, any>,
 *   seller: Record<string, any> | null,
 *   payment: Record<string, any> | null,
 *   items: Array<Record<string, any>>,
 * }} p
 */
export async function buildSellerOrderDocumentPdf(p) {
  const doc = await PDFDocument.create()
  const title = TITLE_BY_TYPE[p.type] || 'Order Document'
  const label = p.order.order_number || p.order.id
  doc.setTitle(`${title} ${ascii(label, 80)}`)

  const page = doc.addPage([612, 792])
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const ink = rgb(0.1, 0.12, 0.13)
  const muted = rgb(0.42, 0.44, 0.46)
  const line = rgb(0.84, 0.82, 0.78)
  const accent = rgb(0.09, 0.17, 0.13)
  const M = 50
  const right = 562
  let y = 742

  page.drawRectangle({ x: M, y: y - 32, width: 512, height: 44, color: accent })
  page.drawText('LA VISIONARIO', { x: M + 14, y: y - 14, size: 11, font: bold, color: rgb(0.96, 0.95, 0.93) })
  drawRight(page, font, title.toUpperCase(), 10, rgb(0.91, 0.9, 0.87), right - 14, y - 13)
  y -= 62

  page.drawText(`${title} for order ${ascii(label, 80)}`, { x: M, y, size: 14, font: bold, color: ink })
  y -= 24
  page.drawLine({ start: { x: M, y }, end: { x: right, y }, thickness: 0.6, color: line })
  y -= 18

  const sellerName = p.seller?.business_name || p.seller?.contact_name || p.seller?.email || 'Seller'
  const buyerName = p.order.contact_name || 'Buyer'
  const metaPairs = [
    ['Issued', new Date().toLocaleString('en-PH')],
    ['Order date', p.order.created_at ? new Date(p.order.created_at).toLocaleString('en-PH') : '-'],
    ['Service date', p.order.preferred_date || '-'],
    ['Payment status', p.order.payment_status || p.order.status || '-'],
    ['Fulfillment', p.order.fulfillment_status || 'pending'],
    ['Payment reference', p.payment?.paymongo_reference || '-'],
  ]

  for (const [k, v] of metaPairs) {
    page.drawText(ascii(k, 32), { x: M, y, size: 9, font: bold, color: muted })
    page.drawText(ascii(v, 140), { x: M + 112, y, size: 9, font, color: ink })
    y -= 14
  }

  y -= 10
  page.drawText('SELLER', { x: M, y, size: 8, font: bold, color: muted })
  page.drawText('BUYER', { x: 320, y, size: 8, font: bold, color: muted })
  y -= 14
  page.drawText(ascii(sellerName, 80), { x: M, y, size: 10, font: bold, color: ink })
  page.drawText(ascii(buyerName, 80), { x: 320, y, size: 10, font: bold, color: ink })
  y -= 14
  page.drawText(ascii(p.seller?.email || '', 80), { x: M, y, size: 8.5, font, color: muted })
  page.drawText(ascii(p.order.contact_email || '', 80), { x: 320, y, size: 8.5, font, color: muted })
  y -= 28

  page.drawRectangle({ x: M, y: y - 16, width: 512, height: 20, color: rgb(0.94, 0.93, 0.91) })
  page.drawText('DESCRIPTION', { x: M + 8, y: y - 10, size: 7.5, font: bold, color: muted })
  page.drawText('QTY', { x: 360, y: y - 10, size: 7.5, font: bold, color: muted })
  drawRight(page, bold, 'UNIT', 7.5, muted, 452, y - 10)
  drawRight(page, bold, 'AMOUNT', 7.5, muted, right - 8, y - 10)
  y -= 30

  const rows = p.items.length ? p.items : [{ name: 'Booking', quantity: 1, price: p.order.subtotal }]
  for (const item of rows.slice(0, 24)) {
    const qty = Number(item.quantity) || 1
    const price = Number(item.price) || 0
    page.drawText(ascii(item.name, 58), { x: M + 8, y, size: 9, font, color: ink })
    page.drawText(String(qty), { x: 362, y, size: 9, font, color: ink })
    drawRight(page, font, money(price, p.order.currency), 9, ink, 452, y)
    drawRight(page, bold, money(price * qty, p.order.currency), 9, ink, right - 8, y)
    y -= 17
  }

  y -= 8
  page.drawLine({ start: { x: 330, y }, end: { x: right, y }, thickness: 0.8, color: line })
  y -= 20
  page.drawText('Total', { x: 350, y, size: 10.5, font: bold, color: muted })
  drawRight(page, bold, money(p.order.subtotal, p.order.currency), 13, accent, right, y - 3)
  y -= 34

  const notes =
    p.type === 'contract'
      ? 'This document summarizes the service agreement between the buyer and seller for the listed booking. Service delivery remains subject to platform policies and any written notes attached to the order.'
      : p.type === 'summary'
        ? 'This summary is generated from the current order record for seller operational use.'
        : p.type === 'invoice'
          ? 'This invoice reflects the order amount recorded on the platform.'
          : 'This receipt confirms payment status according to the platform payment record.'

  page.drawText(ascii(notes, 130), { x: M, y, size: 8.5, font, color: muted })
  y -= 16
  if (p.order.notes) {
    page.drawText('Order notes', { x: M, y, size: 9, font: bold, color: muted })
    y -= 13
    page.drawText(ascii(p.order.notes, 160), { x: M, y, size: 8.5, font, color: ink })
  }

  const bytes = await doc.save()
  return bytes
}
