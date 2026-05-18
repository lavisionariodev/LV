/**
 * Curated Philippine banks for seller payout settings and PayMongo BIC resolution.
 */

export const PH_BANKS = [
  { id: 'bdo', label: 'BDO Unibank', bic: 'BNORPHMMXXX', aliases: ['bdo', 'banco de oro'] },
  { id: 'bpi', label: 'Bank of the Philippine Islands (BPI)', bic: 'BOPIPHMMXXX', aliases: ['bpi'] },
  { id: 'metrobank', label: 'Metrobank', bic: 'MBTCPHMMXXX', aliases: ['metrobank', 'metro bank'] },
  { id: 'landbank', label: 'Land Bank of the Philippines', bic: 'TLBPPHMMXXX', aliases: ['landbank', 'land bank'] },
  { id: 'unionbank', label: 'UnionBank', bic: 'UBPHPHMMXXX', aliases: ['unionbank', 'union bank'] },
  { id: 'chinabank', label: 'China Banking Corporation', bic: 'CHBKPHMMXXX', aliases: ['chinabank', 'china bank'] },
  { id: 'security', label: 'Security Bank', bic: 'SETCPHMMXXX', aliases: ['security bank', 'securitybank'] },
  { id: 'eastwest', label: 'EastWest Bank', bic: 'EWBCPHMMXXX', aliases: ['eastwest', 'east west'] },
  { id: 'rcbc', label: 'RCBC', bic: 'RCBCPHMMXXX', aliases: ['rcbc'] },
  { id: 'pnb', label: 'Philippine National Bank (PNB)', bic: 'PNBMPHMMXXX', aliases: ['pnb', 'philippine national bank'] },
]

export const PH_BANK_OPTIONS = PH_BANKS.map((b) => ({ value: b.label, label: b.label }))

/**
 * @param {string} bankNameOrId
 * @returns {{ bank: typeof PH_BANKS[0] | null, bic: string | null, known: boolean }}
 */
export function resolvePhBank(bankNameOrId) {
  const raw = String(bankNameOrId || '').trim()
  if (!raw) return { bank: null, bic: null, known: false }

  const lower = raw.toLowerCase()
  for (const bank of PH_BANKS) {
    if (bank.id === lower || bank.label.toLowerCase() === lower) {
      return { bank, bic: bank.bic, known: true }
    }
    if (bank.aliases.some((a) => lower.includes(a) || a.includes(lower))) {
      return { bank, bic: bank.bic, known: true }
    }
  }
  return { bank: null, bic: null, known: false }
}
