// Centralized admin mock data for the Lavisionario admin portal.
// Pure data + small helper functions so we can swap this for API-backed data later
// without changing UI components that still import from here.

// Site content lives in `site_content` (see @/lib/siteContent/mapping.js for defaults).

// --- Commission (Kita ni LV) ---
// One default rule for the whole platform + optional per-seller overrides.

export const commission = {
  defaultRule: {
    id: 'COM-DEFAULT',
    name: 'Standard platform commission',
    percentage: 10,
    effectiveFrom: '2024-01-01',
    effectiveTo: null,
    isActive: true,
  },
  sellerOverrides: [
    {
      id: 'COM-SEL-001',
      sellerId: 'SEL-001',
      percentage: 8,
      effectiveFrom: '2025-01-01',
      effectiveTo: null,
      note: 'Introductory rate for launch partner',
    },
    {
      id: 'COM-SEL-002',
      sellerId: 'SEL-004',
      percentage: 12,
      effectiveFrom: '2024-10-01',
      effectiveTo: null,
      note: 'Higher support requirements',
    },
  ],
}

// --- Disputes ---

export const disputes = [
  {
    id: 'DSP-001',
    orderRef: 'ORD-101',
    transactionId: 'TXN-001',
    openedAt: '2025-02-24',
    complainantId: 'USR-001',
    complainantName: 'Juan Dela Cruz',
    respondentId: 'SEL-001',
    respondentName: 'Heavenly Flowers Co.',
    reason: 'Quality issue',
    status: 'open',
    description:
      'Customer reported that the floral arrangements arrived wilted and incomplete compared to the agreed inclusions.',
  },
  {
    id: 'DSP-002',
    orderRef: 'ORD-099',
    transactionId: 'TXN-002',
    openedAt: '2025-02-21',
    complainantId: 'USR-002',
    complainantName: 'Maria Santos',
    respondentId: 'SEL-002',
    respondentName: 'Memorial Services PH',
    reason: 'Refund request',
    status: 'under_review',
    description:
      'Family requested a partial refund due to schedule changes and reduced service duration.',
  },
  {
    id: 'DSP-003',
    orderRef: 'ORD-090',
    transactionId: null,
    openedAt: '2025-02-10',
    complainantId: 'USR-003',
    complainantName: 'Pedro Reyes',
    respondentId: 'SEL-004',
    respondentName: 'Metro Memorial Services',
    reason: 'Service concern',
    status: 'resolved',
    description:
      'Concern about chapel availability was resolved with an alternative slot and complimentary flowers.',
  },
]

// --- Dashboard aggregates (mock stats + charts; admin dashboard may override with live data) ---

export const dashboard = {
  stats: {
    totalSellers: 4,
    totalUsers: 4,
    transactionsLast30Days: 4,
    openDisputes: disputes.filter((d) => d.status === 'open').length,
  },
  revenueByDay: [
    { date: '2025-02-18', total: 45000 },
    { date: '2025-02-19', total: 52000 },
    { date: '2025-02-20', total: 38000 },
    { date: '2025-02-21', total: 61000 },
    { date: '2025-02-22', total: 74000 },
    { date: '2025-02-23', total: 55000 },
    { date: '2025-02-24', total: 68000 },
  ],
  revenueByCategory: [
    { name: 'Memorial Packages', value: 180000 },
    { name: 'Flowers & Add-ons', value: 65000 },
    { name: 'Transport & Logistics', value: 42000 },
    { name: 'Documentation', value: 28000 },
  ],
  recentActivity: [
    {
      id: 'RA-001',
      date: 'Today',
      type: 'Seller registration',
      detail: 'Peaceful Rest Funeral Home requested verification.',
      status: 'Pending review',
    },
    {
      id: 'RA-002',
      date: 'Yesterday',
      type: 'Transaction review',
      detail: 'TXN-002 manually reviewed and approved.',
      status: 'Resolved',
    },
    {
      id: 'RA-003',
      date: 'Feb 20',
      type: 'Dispute opened',
      detail: 'New dispute DSP-002 regarding refund request.',
      status: 'Open',
    },
  ],
}

export function getDisputeById(id) {
  return disputes.find((d) => d.id === id) || null
}

export function getEffectiveCommissionForSeller(sellerId) {
  const override = commission.sellerOverrides.find((r) => r.sellerId === sellerId)
  const percentage =
    override && override.percentage != null
      ? override.percentage
      : commission.defaultRule.percentage

  return {
    percentage,
    source: override ? 'override' : 'default',
    ruleId: override ? override.id : commission.defaultRule.id,
  }
}

// --- Admin Payouts page (/admin/payouts) — mock listings + generator ---
// Distinct from `commission` above (dashboard/settings model).

export const PAYOUTS_PAGE_SELLERS = [
  { id: 's1', name: 'Heaven Memorial Services', email: 'admin@heavenmemorial.ph', phone: '09171234567' },
  { id: 's2', name: 'Grace Funeral Services', email: 'accounts@gracefuneral.ph', phone: '09281234567' },
  { id: 's3', name: 'Eternal Rest Chapel', email: 'billing@eternalrest.ph', phone: '09391234567' },
  { id: 's4', name: 'Serenity Funeral Home', email: 'finance@serenityfh.ph', phone: '09501234567' },
]

export const PAYOUTS_PAGE_BUYERS = [
  { id: 'b1', name: 'Maria Santos', email: 'maria.santos@gmail.com', phone: '09171112222' },
  { id: 'b2', name: 'Jose Reyes', email: 'jose.reyes@yahoo.com', phone: '09282223333' },
  { id: 'b3', name: 'Ana Cruz', email: 'ana.cruz@outlook.com', phone: '09393334444' },
  { id: 'b4', name: 'Pedro Dela Cruz', email: 'pedro.dc@gmail.com', phone: '09504445555' },
  { id: 'b5', name: 'Lina Gomez', email: 'lina.gomez@gmail.com', phone: '09165556666' },
  { id: 'b6', name: 'Ricardo Lim', email: 'r.lim@business.com', phone: '09276667777' },
]

export const PAYOUTS_PAGE_SERVICES = [
  'Complete Funeral Package – Gold',
  'Basic Cremation Package',
  'Traditional Burial – Standard',
  'Memorial Service Package',
  'Embalming & Viewing Package',
  'Premium Chapel Service',
  'Eco-Friendly Green Burial',
  'Full Service Cremation – Premium',
]

export const PAYOUTS_PAGE_PAYMENT_METHODS = ['GCash', 'Maya', 'Bank Transfer', 'Credit Card', 'Cash']

export function generatePayoutsPageSampleTransactions() {
  const txns = []
  const now = new Date()
  for (let i = 0; i < 32; i++) {
    const seller = PAYOUTS_PAGE_SELLERS[i % PAYOUTS_PAGE_SELLERS.length]
    const buyer = PAYOUTS_PAGE_BUYERS[i % PAYOUTS_PAGE_BUYERS.length]
    const amount = [15000, 22500, 35000, 48000, 12000, 28000, 55000, 18500][i % 8]
    const paymentStatuses = ['paid', 'paid', 'paid', 'pending', 'refunded']
    const payoutStatuses = ['pending', 'processing', 'paid', 'on_hold', 'refunded']
    const paymentStatus = paymentStatuses[i % paymentStatuses.length]
    const payoutStatus = payoutStatuses[i % payoutStatuses.length]
    const daysAgo = i * 3
    const date = new Date(now)
    date.setDate(date.getDate() - daysAgo)

    txns.push({
      id: `TXN-${String(10000 + i).padStart(5, '0')}`,
      orderId: `ORD-${String(20000 + i).padStart(5, '0')}`,
      sellerId: seller.id,
      sellerName: seller.name,
      sellerEmail: seller.email,
      sellerPhone: seller.phone,
      buyerId: buyer.id,
      buyerName: buyer.name,
      buyerEmail: buyer.email,
      buyerPhone: buyer.phone,
      service: PAYOUTS_PAGE_SERVICES[i % PAYOUTS_PAGE_SERVICES.length],
      amount,
      paymentMethod: PAYOUTS_PAGE_PAYMENT_METHODS[i % PAYOUTS_PAGE_PAYMENT_METHODS.length],
      paymentStatus,
      payoutStatus,
      payoutReference: payoutStatus === 'paid' ? `REF-${String(30000 + i).padStart(6, '0')}` : '',
      payoutDate: payoutStatus === 'paid' ? date.toISOString().split('T')[0] : '',
      date: date.toISOString().split('T')[0],
      dateObj: date,
    })
  }
  return txns
}

export const PAYOUTS_PAGE_INITIAL_TRANSACTIONS = generatePayoutsPageSampleTransactions()

export const PAYOUTS_PAGE_INITIAL_COMMISSION_SETTINGS = {
  global: 10,
  sellers: {
    s1: 12,
    s2: 8,
  },
}
