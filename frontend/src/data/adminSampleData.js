// Centralized admin mock data for the Lavisionario admin portal.
// Pure data + small helper functions so we can easily swap this
// file out for real API calls later without changing UI components.

// --- Users (buyers) ---

export const users = [
  {
    id: 'USR-001',
    name: 'Juan Dela Cruz',
    email: 'juan.delacruz@example.com',
    role: 'buyer',
    joinedAt: '2024-09-12',
    status: 'active',
  },
  {
    id: 'USR-002',
    name: 'Maria Santos',
    email: 'maria.santos@example.com',
    role: 'buyer',
    joinedAt: '2024-11-03',
    status: 'active',
  },
  {
    id: 'USR-003',
    name: 'Pedro Reyes',
    email: 'pedro.reyes@example.com',
    role: 'buyer',
    joinedAt: '2025-01-15',
    status: 'suspended',
  },
  {
    id: 'USR-004',
    name: 'Ana Garcia',
    email: 'ana.garcia@example.com',
    role: 'buyer',
    joinedAt: '2025-02-01',
    status: 'pending',
  },
]

// --- Sellers (providers) ---

export const sellers = [
  {
    id: 'SEL-001',
    businessName: 'Heavenly Flowers Co.',
    contactName: 'Ana Garcia',
    email: 'contact@heavenlyflowers.ph',
    phone: '+63 912 345 6789',
    registeredAt: '2024-08-10',
    status: 'active',
    listingCount: 12,
  },
  {
    id: 'SEL-002',
    businessName: 'Memorial Services PH',
    contactName: 'Carlos Bautista',
    email: 'hello@memorialservices.ph',
    phone: '+63 918 765 4321',
    registeredAt: '2024-10-05',
    status: 'active',
    listingCount: 8,
  },
  {
    id: 'SEL-003',
    businessName: 'Peaceful Rest Funeral Home',
    contactName: 'Elena Torres',
    email: 'care@peacefulrest.ph',
    phone: '+63 927 111 2233',
    registeredAt: '2025-01-20',
    status: 'pending',
    listingCount: 3,
  },
  {
    id: 'SEL-004',
    businessName: 'Metro Memorial Services',
    contactName: 'Luis Cruz',
    email: 'support@metromemorial.ph',
    phone: '+63 926 555 8899',
    registeredAt: '2024-07-02',
    status: 'suspended',
    listingCount: 5,
  },
]

// --- Commission (Kita ni LV) ---
// One default rule for the whole platform + optional per‑seller overrides.

export const commission = {
  defaultRule: {
    id: 'COM-DEFAULT',
    name: 'Standard platform commission',
    percentage: 10, // 10% LV share
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

// --- Payments / Transactions ---

export const payments = [
  {
    id: 'TXN-001',
    date: '2025-02-24',
    buyerId: 'USR-001',
    buyerName: 'Juan Dela Cruz',
    sellerId: 'SEL-001',
    sellerName: 'Heavenly Flowers Co.',
    amount: 15000,
    status: 'pending', // pending -> approved -> transferred
    orderRef: 'ORD-101',
  },
  {
    id: 'TXN-002',
    date: '2025-02-23',
    buyerId: 'USR-002',
    buyerName: 'Maria Santos',
    sellerId: 'SEL-002',
    sellerName: 'Memorial Services PH',
    amount: 85000,
    status: 'approved',
    orderRef: 'ORD-099',
  },
  {
    id: 'TXN-003',
    date: '2025-02-22',
    buyerId: 'USR-003',
    buyerName: 'Pedro Reyes',
    sellerId: 'SEL-003',
    sellerName: 'Peaceful Rest Funeral Home',
    amount: 42000,
    status: 'transferred',
    orderRef: 'ORD-098',
  },
  {
    id: 'TXN-004',
    date: '2025-02-20',
    buyerId: 'USR-001',
    buyerName: 'Juan Dela Cruz',
    sellerId: 'SEL-002',
    sellerName: 'Memorial Services PH',
    amount: 98000,
    status: 'failed',
    orderRef: 'ORD-095',
  },
]

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
    status: 'open', // open | under_review | resolved | closed
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

// Site content is stored in DB table `site_content` and edited in admin Content page.
// Default shape when DB is empty is defined in @/lib/siteContent/mapping.js.

// --- Dashboard aggregates ---

export const dashboard = {
  stats: {
    totalSellers: sellers.length,
    totalUsers: users.length,
    transactionsLast30Days: payments.length,
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

// --- Seller service form template (admin-defined) ---
// Admin configures the form fields that sellers see when adding their own service.
// The seller portal renders a form from this template.
export const defaultSellerFormTemplate = [
  { id: 'f1', order: 0, label: 'Service name', type: 'text', required: true, placeholder: 'e.g. Memorial Floral Package' },
  { id: 'f2', order: 1, label: 'Category', type: 'text', required: true, placeholder: 'e.g. Flowers, Memorial Packages' },
  { id: 'f3', order: 2, label: 'Price (₱)', type: 'number', required: true, placeholder: '0' },
  { id: 'f4', order: 3, label: 'Description', type: 'textarea', required: false, placeholder: 'Describe your service...' },
]

// --- Seller products (template for seller CRUD) ---

export const sellerProducts = [
  {
    id: 'PRD-001',
    sellerId: 'SEL-001',
    name: 'Memorial Floral Package A',
    category: 'Flowers',
    price: 3500,
    status: 'active', // draft | active | archived
    description: 'Standard wake floral arrangement with fresh white lilies and roses.',
  },
  {
    id: 'PRD-002',
    sellerId: 'SEL-001',
    name: 'Premium Floral Stand',
    category: 'Flowers',
    price: 6500,
    status: 'draft',
    description: 'Tall premium stand arrangement for chapel or home wakes.',
  },
  {
    id: 'PRD-003',
    sellerId: 'SEL-002',
    name: 'Standard Funeral Package',
    category: 'Memorial Packages',
    price: 85000,
    status: 'active',
    description: 'Chapel viewing, basic casket, and coordination for 3-day wake.',
  },
  {
    id: 'PRD-004',
    sellerId: 'SEL-003',
    name: 'Cremation Service with Urn',
    category: 'Cremation',
    price: 45000,
    status: 'active',
    description: 'Cremation service, standard urn, and basic documentation support.',
  },
]

// --- Helper functions (pure, no side effects) ---

export function getUserById(id) {
  return users.find((u) => u.id === id) || null
}

export function getSellerById(id) {
  return sellers.find((s) => s.id === id) || null
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

export function calculateCommissionSplit(amount, sellerId) {
  const { percentage } = getEffectiveCommissionForSeller(sellerId)
  const lvShare = Math.round((amount * percentage) / 100)
  const sellerShare = amount - lvShare
  return { lvShare, sellerShare, rate: percentage }
}

