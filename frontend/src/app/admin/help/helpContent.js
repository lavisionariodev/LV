/**
 * Admin help center static copy (kept next to the help page, not in shared mock data).
 */

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
    bullets: ['Dispute flow and statuses', 'When to freeze funds', 'When to escalate or ban'],
  },
  {
    iconKey: 'LuShield',
    title: 'Policy enforcement',
    desc: 'Handle violations and prohibited items consistently.',
    bullets: ['Violation levels and penalties', 'Repeat offender handling', 'Content takedown guidelines'],
  },
  {
    iconKey: 'LuChartBar',
    title: 'Dashboard metrics',
    desc: 'Know what to watch and what it means for the business.',
    bullets: ['GMV, conversion, refund rate', 'Seller health and retention', 'Fraud signals and spikes'],
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
