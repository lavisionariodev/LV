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
