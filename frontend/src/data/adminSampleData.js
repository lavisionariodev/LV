/**
 * Centralized admin mock/sample data for the Lavisionario admin portal.
 * Pure data + small helpers until corresponding screens are wired to the API.
 *
 * Does **not** include payouts / escrow / live dashboard metrics — use `/api/admin/payouts`,
 * `/api/admin/metrics`, DB tables. Help center copy lives in `app/admin/help/page.jsx`.
 *
 * Still here (mock): disputes list, seller commission preview helper, notifications sample rows.
 *
 * Site content defaults: `@/lib/siteContent/mapping.js`.
 */

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
    title: 'Escrow note',
    message: 'An escrow row was flagged for manual review due to unusual activity.',
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