import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

/** Standard Helvetica: Basic Latin only. Amount columns must already be ASCII (e.g. "PHP 1,234.00"). */
function pdfAscii(s, maxLen = 280) {
  return String(s ?? '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen)
}

/**
 * @param {import('pdf-lib').PDFPage} page
 * @param {import('pdf-lib').PDFFont} font
 * @param {import('pdf-lib').RGBColor} color
 */
function drawRight(page, font, text, size, color, rightX, y) {
  const t = pdfAscii(text, 72)
  const w = font.widthOfTextAtSize(t, size)
  page.drawText(t, { x: rightX - w, y, size, font, color })
}

/**
 * Structured formal receipt (PDF uses ISO currency codes in amount cells so symbols are never "?" placeholders).
 *
 * @param {{
 *   label: string,
 *   currency: string,
 *   issuedAtIso: string,
 *   paidAtIso: string | null,
 *   reference: string | null,
 *   rows: Array<{ name: string; qty: number; unitFmt: string; lineFmt: string }>,
 *   totalFmt: string,
 * }} p
 */
export async function buildReceiptPdf(p) {
  const doc = await PDFDocument.create()
  doc.setTitle(`Receipt ${pdfAscii(p.label, 96)}`)

  const PAGE_W = 612
  const PAGE_H = 792
  const M = 50
  const bandH = 36

  const font = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)

  const lineCol = rgb(0.82, 0.8, 0.76)
  const ink = rgb(0.1, 0.12, 0.13)
  const muted = rgb(0.42, 0.44, 0.46)
  const bannerBg = rgb(0.089, 0.165, 0.128)
  const bannerMuted = rgb(0.91, 0.9, 0.875)
  const accent = rgb(0.089, 0.165, 0.128)

  let page = doc.addPage([PAGE_W, PAGE_H])

  const contentTop = PAGE_H - M
  const bannerBottom = contentTop - bandH

  page.drawRectangle({
    x: M,
    y: bannerBottom,
    width: PAGE_W - 2 * M,
    height: bandH,
    color: bannerBg,
  })

  const bandTextY = bannerBottom + 11
  page.drawText('LA VISIONARIO', {
    x: M + 12,
    y: bandTextY,
    size: 11,
    font: fontBold,
    color: rgb(0.96, 0.95, 0.93),
  })
  drawRight(page, font, 'Official payment receipt', 9, bannerMuted, PAGE_W - M - 12, bandTextY + 1)

  let y = bannerBottom - 22

  page.drawText(`Order no. ${pdfAscii(p.label, 72)}`, {
    x: M,
    y,
    size: 12,
    font: fontBold,
    color: ink,
  })
  y -= 22

  page.drawLine({
    start: { x: M, y },
    end: { x: PAGE_W - M, y },
    thickness: 0.55,
    color: lineCol,
  })
  y -= 14

  const lx = M
  const vx = M + 100
  const metaSize = 9

  /** @type {Array<[string, string | null | undefined]>} */
  const metaPairs = [
    ['Date issued', p.issuedAtIso],
    p.paidAtIso ? ['Payment date', p.paidAtIso] : null,
    ['Currency', pdfAscii(p.currency, 16)],
    p.reference ? ['Reference', pdfAscii(String(p.reference), 120)] : null,
    ['Processor', 'PayMongo'],
  ].filter(Boolean)

  for (const pair of metaPairs) {
    page.drawText(pair[0], {
      x: lx,
      y,
      size: metaSize,
      font: fontBold,
      color: muted,
    })
    page.drawText(pdfAscii(String(pair[1] ?? '-'), 200), {
      x: vx,
      y,
      size: metaSize,
      font,
      color: ink,
    })
    y -= 14
  }

  y -= 8
  page.drawLine({
    start: { x: M, y },
    end: { x: PAGE_W - M, y },
    thickness: 0.45,
    color: lineCol,
  })
  y -= 18

  const xDesc = M + 4
  const xQty = PAGE_W - M - 200
  const xUnitR = PAGE_W - M - 120
  const xAmtR = PAGE_W - M - 4

  const headY = y
  page.drawRectangle({
    x: M,
    y: headY - 16,
    width: PAGE_W - 2 * M,
    height: 18,
    color: rgb(0.935, 0.932, 0.924),
  })
  page.drawText('DESCRIPTION', { x: xDesc, y: headY - 11, size: 7.5, font: fontBold, color: muted })
  page.drawText('QTY', { x: xQty, y: headY - 11, size: 7.5, font: fontBold, color: muted })
  drawRight(page, fontBold, 'UNIT PRICE', 7.5, muted, xUnitR, headY - 11)
  drawRight(page, fontBold, 'AMOUNT', 7.5, muted, xAmtR, headY - 11)
  y = headY - 28

  const rows = (
    p.rows.length
      ? p.rows
      : [{ name: 'No line items recorded', qty: 0, unitFmt: '-', lineFmt: '-' }]
  ).slice(0, 38)

  const descMaxChars = 70
  const rowStep = 16
  const minY = M + 120

  const drawThinRule = () => {
    page.drawLine({
      start: { x: M, y: y + rowStep - 11 },
      end: { x: PAGE_W - M, y: y + rowStep - 11 },
      thickness: 0.25,
      color: rgb(0.9, 0.89, 0.87),
    })
  }

  for (const row of rows) {
    if (y < minY) {
      page = doc.addPage([PAGE_W, PAGE_H])
      y = PAGE_H - M - 32
      page.drawText('(continued)', { x: M, y: y + 18, size: 8, font, color: muted })
    }

    let desc = pdfAscii(row.name, 500)
    if (desc.length > descMaxChars) desc = `${desc.slice(0, descMaxChars - 3)}...`

    page.drawText(desc, { x: xDesc, y, size: 9.5, font, color: ink })

    const q = Number(row.qty)
    const qtyStr = Number.isFinite(q) && q > 0 ? String(Math.floor(q)) : '-'
    page.drawText(qtyStr, { x: xQty, y, size: 9.5, font, color: ink })

    drawRight(page, font, row.unitFmt, 9.5, ink, xUnitR, y)
    drawRight(page, fontBold, row.lineFmt, 9.5, ink, xAmtR, y)

    drawThinRule()
    y -= rowStep
  }

  y -= 8
  page.drawLine({
    start: { x: xQty - 20, y },
    end: { x: PAGE_W - M, y },
    thickness: 1,
    color: rgb(0.53, 0.51, 0.49),
  })
  y -= 20

  page.drawText('Total (paid)', { x: PAGE_W - M - 196, y, size: 10.5, font: fontBold, color: muted })
  drawRight(page, fontBold, p.totalFmt, 13, accent, xAmtR + 8, y - 3)
  y -= 36

  page.drawText(
    pdfAscii('This receipt confirms payment for this order. PDF amounts show ISO currency codes (e.g. PHP 12,345.67).'),
    {
      x: M,
      y,
      size: 8.5,
      font,
      color: muted,
    },
  )
  y -= 22
  page.drawText(pdfAscii('Thank you.', 80), { x: M, y, size: 9, font, color: ink })
  y -= 26
  page.drawText(pdfAscii('La Visionario  |  Settlement via PayMongo', 220), {
    x: M,
    y,
    size: 8,
    font,
    color: muted,
  })

  const bytes = await doc.save()
  return bytes
}
