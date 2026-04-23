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
  {
    id: 'DSP-004',
    orderRef: 'ORD-110',
    transactionId: 'TXN-004',
    openedAt: '2025-03-02',
    complainantId: 'USR-004',
    complainantName: 'Ana Cruz',
    respondentId: 'SEL-003',
    respondentName: 'Serenity Funeral Home',
    reason: 'Late delivery',
    status: 'open',
    description:
      'Buyer reported the service team arrived beyond the agreed schedule, causing delays during the viewing.',
  },
  {
    id: 'DSP-005',
    orderRef: 'ORD-112',
    transactionId: 'TXN-005',
    openedAt: '2025-03-05',
    complainantId: 'USR-005',
    complainantName: 'Jose Lim',
    respondentId: 'SEL-001',
    respondentName: 'Heavenly Flowers Co.',
    reason: 'Incomplete inclusions',
    status: 'under_review',
    description:
      'Customer claimed several inclusions listed in the package were missing and requested adjustments or refund.',
  },
  {
    id: 'DSP-006',
    orderRef: 'ORD-115',
    transactionId: 'TXN-006',
    openedAt: '2025-03-08',
    complainantId: 'USR-006',
    complainantName: 'Lina Gomez',
    respondentId: 'SEL-002',
    respondentName: 'Memorial Services PH',
    reason: 'Billing discrepancy',
    status: 'resolved',
    description:
      'A discrepancy in quoted vs billed add-on fees was clarified and corrected, closing the case.',
  },
  {
    id: 'DSP-007',
    orderRef: 'ORD-118',
    transactionId: 'TXN-007',
    openedAt: '2025-03-12',
    complainantId: 'USR-007',
    complainantName: 'Ricardo Santos',
    respondentId: 'SEL-004',
    respondentName: 'Metro Memorial Services',
    reason: 'Service quality',
    status: 'closed',
    description:
      'Complaint about staff coordination was reviewed; parties agreed to close after follow-up and apology.',
  },
  {
    id: 'DSP-008',
    orderRef: 'ORD-121',
    transactionId: 'TXN-008',
    openedAt: '2025-03-18',
    complainantId: 'USR-008',
    complainantName: 'Camille Reyes',
    respondentId: 'SEL-003',
    respondentName: 'Serenity Funeral Home',
    reason: 'Reschedule request',
    status: 'under_review',
    description:
      'Family requested rescheduling due to venue constraints; admin is reviewing policy and seller response timeline.',
  },
]

/** Disputes that still need admin attention (open or under review). Swap for an API count later. */
export function countDisputesNeedingAdminAttention() {
  return disputes.filter((d) => d.status === 'open' || d.status === 'under_review').length
}

// --- Dashboard aggregates (mock stats + charts; admin dashboard may override with live data) ---

export const dashboard = {
  stats: {
    totalSellers: 4,
    totalBuyers: 4,
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

export function generatePayoutsPageSampleChangeLog(nowTs = Date.now()) {
  return [
    { id: 1, type: 'global', label: 'Global rate', from: 10, to: 10, ts: nowTs - 3600000 * 24 },
    { id: 2, type: 'seller', label: 'Heaven Memorial Services', from: 10, to: 12, ts: nowTs - 3600000 * 12 },
    { id: 3, type: 'seller', label: 'Grace Funeral Services', from: 10, to: 8, ts: nowTs - 3600000 * 2 },
  ]
}

// --- Help center (/admin/help) — static copy + topic metadata (icons resolved in page) ---

export const helpCenterTopics = [
  {
    iconKey: 'LuUserCheck',
    title: 'Seller approvals',
    desc: 'Verify sellers, approve or reject, and understand impact.',
    bullets: [
      'What to check before approval',
      'What happens after approval or rejection',
      'High-risk seller red flags',
      'Submitted listings are listed under Admin → Listings for review',
    ],
  },
  {
    iconKey: 'LuScale',
    title: 'Disputes and refunds',
    desc: 'Resolve disputes, refunds, and fraud cases safely.',
    bullets: [
      'Dispute flow and statuses',
      'When to freeze funds',
      'When to escalate or ban',
    ],
  },
  {
    iconKey: 'LuShield',
    title: 'Policy enforcement',
    desc: 'Handle violations and prohibited items consistently.',
    bullets: [
      'Violation levels and penalties',
      'Repeat offender handling',
      'Content takedown guidelines',
    ],
  },
  {
    iconKey: 'LuChartBar',
    title: 'Dashboard metrics',
    desc: 'Know what to watch and what it means for the business.',
    bullets: [
      'GMV, conversion, refund rate',
      'Seller health and retention',
      'Fraud signals and spikes',
    ],
  },
]

export const helpCenterFaqs = [
  {
    q: 'Where can I see what sellers have listed on the shop?',
    a: 'Open Listings in the admin sidebar (or Quick actions → View Listings on the dashboard). Active listings appear on the public shop; drafts do not. Ensure database migration 038 is applied so admins can read seller_listings.',
  },
  {
    q: 'Why are changes not showing in the live platform?',
    a: 'Most updates require approval or publishing. Check if there is a pending submission, scheduled publish time, or blocked content due to policy.',
  },
  {
    q: 'When should I reject a seller application?',
    a: 'Reject when identity or documents fail verification, the business profile is inconsistent, there are repeated compliance issues, or the category is high-risk without strong proof.',
  },
  {
    q: 'When should I freeze funds during disputes?',
    a: 'Freeze funds when fraud is suspected, there is a high-value claim, or multiple complaints indicate a pattern. Release only after resolution or verified evidence.',
  },
  {
    q: 'When is a permanent ban appropriate?',
    a: 'Use permanent bans for repeated fraud, prohibited items, chargeback abuse patterns, or serious policy violations that create customer harm.',
  },
  {
    q: 'What should I do if disputes spike suddenly?',
    a: 'Treat it as a risk event. Review top categories, top sellers involved, and refund rate trend. If fraud is suspected, freeze payouts for impacted sellers and escalate to operations or security.',
  },
]

export const helpCenterPlaybooks = [
  {
    title: 'Approve high-risk sellers',
    steps: [
      'Require stronger documentation and proof of inventory source.',
      'Limit category access initially, then expand after clean history.',
      'Monitor refund and dispute rate for the first 14 days.',
    ],
  },
  {
    title: 'Handle viral complaints',
    steps: [
      'Confirm facts first: order IDs, timestamps, and evidence.',
      'Pause risky actions: freeze payouts if fraud is possible.',
      'Publish a clear internal resolution note for the support team.',
    ],
  },
  {
    title: 'Respond to security incidents',
    steps: [
      'Lock affected accounts and rotate admin credentials.',
      'Review audit logs for access anomalies and bulk actions.',
      'Escalate to security and document actions taken.',
    ],
  },
]

export const helpCenterEscalationContacts = [
  {
    title: 'Operations',
    description: 'Policy cases, seller investigations, dispute escalation.',
    email: 'ops@yourcompany.com',
  },
  {
    title: 'Security',
    description: 'Account breach, fraud spikes, suspicious admin actions.',
    email: 'security@yourcompany.com',
  },
  {
    title: 'Legal',
    description: 'Chargebacks, regulatory concerns, sensitive takedowns.',
    email: 'legal@yourcompany.com',
  },
]

// --- Notifications (/admin/notifications) — mock rows (icons resolved in page via iconKey) ---

export const notificationsPageSampleRows = [
  {
    id: 1,
    type: 'order',
    title: 'New order received',
    message: 'You have a new booking from Maria Santos for Hair & Makeup Package.',
    time: '2 min ago',
    read: false,
    iconKey: 'LuShoppingBag',
    iconColor: 'blue',
  },
  {
    id: 2,
    type: 'approval',
    title: 'Seller account approved',
    message: 'Bloom Beauty Studio has been approved and is now active on the platform.',
    time: '1 hr ago',
    read: false,
    iconKey: 'LuUserCheck',
    iconColor: 'green',
  },
  {
    id: 3,
    type: 'alert',
    title: 'Dispute opened',
    message: 'A dispute has been filed for Order #10482. Please review within 48 hours.',
    time: '3 hr ago',
    read: false,
    iconKey: 'TbAlertTriangle',
    iconColor: 'red',
  },
  {
    id: 4,
    type: 'announcement',
    title: 'Platform maintenance scheduled',
    message: 'Scheduled downtime on March 15, 2:00–4:00 AM for system upgrades.',
    time: 'Yesterday',
    read: true,
    iconKey: 'LuMegaphone',
    iconColor: 'gold',
  },
  {
    id: 5,
    type: 'order',
    title: 'Order completed',
    message: 'Order #10479 by Juan dela Cruz has been marked as completed.',
    time: 'Yesterday',
    read: true,
    iconKey: 'LuShoppingBag',
    iconColor: 'blue',
  },
  {
    id: 6,
    type: 'approval',
    title: 'New seller registration',
    message: 'Glow Lab PH has submitted their seller application and is awaiting review.',
    time: '2 days ago',
    read: true,
    iconKey: 'LuUserCheck',
    iconColor: 'green',
  },
  {
    id: 7,
    type: 'alert',
    title: 'Payout flagged',
    message: 'Payout #PP-2041 has been flagged for manual review due to unusual activity.',
    time: '3 days ago',
    read: true,
    iconKey: 'TbAlertTriangle',
    iconColor: 'red',
  },
  {
    id: 8,
    type: 'announcement',
    title: 'New feature: Vouchers',
    message: 'Sellers can now create and manage discount vouchers from their dashboard.',
    time: '5 days ago',
    read: true,
    iconKey: 'LuMegaphone',
    iconColor: 'gold',
  },
]

export const notificationsPageFilterTabs = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'order', label: 'Orders' },
  { id: 'approval', label: 'Approvals' },
  { id: 'alert', label: 'Alerts' },
  { id: 'announcement', label: 'Announcements' },
]