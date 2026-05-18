'use client'

import { useState } from 'react'
import Link from 'next/link'
import styles from './help.module.css'
import {
  LuScale,
  LuUserCheck,
  LuChevronDown,
  LuLifeBuoy,
  LuWallet,
  LuClipboardList,
} from 'react-icons/lu'

/** Admin help — plain-language guidance for the people running the marketplace. */
const helpCenterTopics = [
  {
    iconKey: 'LuUserCheck',
    title: 'Sellers',
    desc: 'Review provider applications and manage their status.',
    bullets: [
      'See who is Pending, Active, Rejected, or Suspended',
      'Approve providers whose details and documents check out',
      'Reject with a short reason so the provider knows what to fix',
      'Suspend an active provider if something serious comes up',
    ],
  },
  {
    iconKey: 'LuClipboardList',
    title: 'Listings',
    desc: 'Decide which service packages appear in the public Shop.',
    bullets: [
      'Browse everything providers have submitted',
      'Approve listings that follow our rules and look complete',
      'Reject listings with unclear details, prices, or wording',
      'Only approved listings show up to families on the public site',
    ],
  },
  {
    iconKey: 'LuScale',
    title: 'Disputes',
    desc: 'Help when a family and a provider don’t see eye to eye.',
    bullets: [
      'Statuses: Open, Under Review, Resolved, Closed',
      'Open each case to view attachments uploaded by both sides',
      'A timeline records every status change and resolution note for accountability',
      'Mark Under Review while you are still gathering information, then close once decided',
    ],
  },
  {
    iconKey: 'LuWallet',
    title: 'Payouts',
    desc: 'Track money held in escrow and what goes to each provider.',
    bullets: [
      'Escrow states: Escrowed, On hold, Released',
      'Hold a payout when a dispute or refund is still being reviewed',
      'Release it once the service is complete and there are no issues',
      'Commission can be saved as a platform default, per-provider override, or per-order rate',
    ],
  },
]

const helpCenterFaqs = [
  {
    q: 'Why can’t a provider or admin use buyer checkout while signed into their own portal?',
    a: 'The public storefront only treats a buyer session as signed in for cart, profile, and checkout. Seller Centre and Admin use separate logins; those accounts appear as guests on the main site until the person signs in on the buyer portal. Each portal keeps its own session.',
  },
  {
    q: 'Where do I see all the services on the public shop?',
    a: 'Open Listings → Browse from the sidebar. Anything marked Approved is visible to families on the public Shop. Drafts and rejected items stay hidden.',
  },
  {
    q: 'A provider says their changes aren’t showing—what should I check?',
    a: 'Most provider edits go through approval before they appear live. Open Listings → Approvals and look for a pending submission on that provider. If you don’t see one, the change may still be a draft on their side.',
  },
  {
    q: 'When should I reject a provider application?',
    a: 'Reject if the documents don’t match, the business details look inconsistent, or the provider can’t back up what they claim to offer. Add a short, specific reason so they can fix it and try again.',
  },
  {
    q: 'When should I put a payout on hold?',
    a: 'Put it on hold when there is an open dispute about that booking, a refund is still being worked out, or something doesn’t feel right and you need a colleague to take a second look. Release it once the case is resolved.',
  },
  {
    q: 'Does admin release payout send money to the seller’s bank?',
    a: 'No. Release credits the seller’s platform wallet after you confirm a completed order. The seller withdraws to their bank or GCash when ready (PayMongo must be enabled for withdrawals).',
  },
  {
    q: 'When should I suspend a provider?',
    a: 'Suspend a provider when there are repeated complaints, signs of dishonest behavior, or anything that could hurt the families they serve. Suspended providers can be reactivated later if things are resolved.',
  },
  {
    q: 'How do attachments and the timeline work in a dispute?',
    a: 'When buyers or providers raise a dispute they can upload photos or documents. Open the case in Disputes and you will see the attachments grid (images render as thumbnails, other files appear as links). Below it, the timeline lists every status change and admin resolution note in order, so anyone reviewing the case can see exactly what happened and who acted.',
  },
  {
    q: 'How do commission rates work now?',
    a: 'There is one platform-wide default commission (set in Settings → Billing) that applies to every paid order unless overridden. You can save a per-provider override on the Payouts page so a specific seller always uses a different rate. You can also adjust commission on a single order at any time — that rate is stored on the escrow row and used when calculating the seller’s payout.',
  },
  {
    q: 'What does the Analytics page actually show?',
    a: 'It shows day-to-day signals you can trust: total providers and buyers, paid bookings in the last 30 days, a daily collected sales (GMV) chart that switches between 7, 30, and 90 day windows, top booked services, and recent activity. It is meant as a quick health check, not a deep report.',
  },
]

const helpCenterPlaybooks = [
  {
    title: 'Reviewing a new provider',
    steps: [
      'Open Sellers and filter by Pending.',
      'Click the provider to see their business details and documents.',
      'Approve if everything matches—or reject with a short reason if it does not.',
    ],
  },
  {
    title: 'Working through a dispute',
    steps: [
      'Open the case from Disputes and read both sides first.',
      'Review uploaded attachments and the event timeline to understand the history.',
      'Set the case to Under Review while you collect more information.',
      'Once you have an outcome, add a resolution note, mark it Resolved, and close the case.',
    ],
  },
  {
    title: 'Handling a payout that needs a closer look',
    steps: [
      'Open Payouts and find the booking in question.',
      'Put the payout on hold so the money stays in escrow.',
      'Release it once the booking is complete and any disputes are settled.',
    ],
  },
  {
    title: 'Adjusting commission for a provider or order',
    steps: [
      'For a one-off order: open Payouts → Commission, find the order, and save a per-order rate.',
      'For an ongoing arrangement: set a per-provider override on the same panel so future orders use it automatically.',
      'To change the baseline for everyone: open Settings → Billing and update the platform default commission.',
    ],
  },
]

const helpCenterQuickLinks = [
  { title: 'Sellers', description: 'Review applications, change status, manage commission.', href: '/admin/sellers' },
  { title: 'Listings', description: 'Approve, reject, and browse what families can book.', href: '/admin/listings/approvals' },
  { title: 'Disputes', description: 'Handle cases between families and providers.', href: '/admin/disputes' },
  { title: 'Payouts', description: 'Track escrow, releases, and commission.', href: '/admin/payouts' },
  { title: 'Analytics', description: 'A quick read on platform activity.', href: '/admin/analytics' },
  { title: 'Notifications', description: 'Internal alerts and support messages from sellers.', href: '/admin/notifications' },
]

const HELP_TOPIC_ICON_MAP = {
  LuUserCheck,
  LuClipboardList,
  LuScale,
  LuWallet,
}

/** Mirrors page layout — topic grid, FAQ, playbooks, quick links, support bar. */
function AdminHelpSkeleton() {
  return (
    <div
      className={styles.wrap}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading help center"
    >
      <section className={styles.grid} aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <article key={i} className={styles.card}>
            <div className={styles.cardTop}>
              <span className={`${styles.helpSkBar} ${styles.helpSkIcon}`} />
              <div className={styles.cardText}>
                <span className={`${styles.helpSkBar} ${styles.helpSkCardTitle}`} />
                <span className={`${styles.helpSkBar} ${styles.helpSkCardDesc}`} />
              </div>
            </div>
            <div className={styles.helpSkBullets}>
              {[0, 1, 2, 3].map((j) => (
                <span key={j} className={`${styles.helpSkBar} ${styles.helpSkBullet}`} />
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className={styles.lower} aria-hidden>
        <article className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <span className={`${styles.helpSkBar} ${styles.helpSkPanelTitle}`} />
              <span className={`${styles.helpSkBar} ${styles.helpSkPanelSub}`} />
            </div>
          </div>
          <div className={styles.faqList}>
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className={styles.helpSkFaqItem}>
                <span className={`${styles.helpSkBar} ${styles.helpSkFaqQ}`} />
              </div>
            ))}
          </div>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <span className={`${styles.helpSkBar} ${styles.helpSkPanelTitle}`} />
              <span className={`${styles.helpSkBar} ${styles.helpSkPanelSub}`} />
            </div>
          </div>
          <div className={styles.playbooks}>
            {[0, 1, 2].map((i) => (
              <div key={i} className={styles.helpSkPlaybook}>
                <span className={`${styles.helpSkBar} ${styles.helpSkPlaybookTitle}`} />
                <div className={styles.helpSkSteps}>
                  {[0, 1, 2].map((j) => (
                    <span key={j} className={`${styles.helpSkBar} ${styles.helpSkStep}`} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <span className={`${styles.helpSkBar} ${styles.helpSkPanelTitle}`} />
              <span className={`${styles.helpSkBar} ${styles.helpSkPanelSub}`} />
            </div>
          </div>
          <div className={styles.contactGrid}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={styles.helpSkContactCard}>
                <span className={`${styles.helpSkBar} ${styles.helpSkContactTitle}`} />
                <span className={`${styles.helpSkBar} ${styles.helpSkContactDesc}`} />
                <span className={`${styles.helpSkBar} ${styles.helpSkContactMeta}`} />
              </div>
            ))}
          </div>
          <div className={styles.supportBar}>
            <div className={styles.supportLeft}>
              <span className={`${styles.helpSkBar} ${styles.helpSkSupportIcon}`} />
              <div className={styles.helpSkSupportText}>
                <span className={`${styles.helpSkBar} ${styles.helpSkSupportTitle}`} />
                <span className={`${styles.helpSkBar} ${styles.helpSkSupportSub}`} />
                <span className={`${styles.helpSkBar} ${styles.helpSkSupportSub}`} style={{ width: '88%' }} />
              </div>
            </div>
            <span className={`${styles.helpSkBar} ${styles.helpSkPrimaryBtn}`} />
          </div>
        </article>
      </section>
    </div>
  )
}

export default function AdminHelpCenterPage() {
  const [openFaq, setOpenFaq] = useState(0)

  return (
    <div data-portal-inner-page>
      <div className={styles.wrap}>

      <section className={styles.grid}>
        {helpCenterTopics.map((t) => {
          const Icon = HELP_TOPIC_ICON_MAP[t.iconKey]
          return (
            <article className={styles.card} key={t.title}>
              <div className={styles.cardTop}>
                <div className={styles.icon}>{Icon ? <Icon /> : null}</div>
                <div className={styles.cardText}>
                  <p className={styles.cardTitle}>{t.title}</p>
                  <p className={styles.cardDesc}>{t.desc}</p>
                </div>
              </div>

              <ul className={styles.bullets}>
                {t.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </article>
          )
        })}

      </section>

      <section className={styles.lower}>
        <article className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <p className={styles.panelTitle}>Common questions</p>
              <p className={styles.panelSub}>Quick answers for the things admins ask most often.</p>
            </div>
          </div>

          <div className={styles.faqList}>
            {helpCenterFaqs.map((f, idx) => {
              const isOpen = openFaq === idx
              return (
                <div
                  className={`${styles.faqItem} ${isOpen ? styles.faqItemOpen : ''}`}
                  key={f.q}
                >
                  <button
                    type="button"
                    className={styles.faqBtn}
                    onClick={() => setOpenFaq(isOpen ? -1 : idx)}
                    aria-expanded={isOpen}
                  >
                    <span className={styles.faqQ}>{f.q}</span>
                    <span
                      className={`${styles.chev} ${isOpen ? styles.chevOpen : ''}`}
                      aria-hidden="true"
                    >
                      <LuChevronDown />
                    </span>
                  </button>

                  {isOpen && <div className={styles.faqA}>{f.a}</div>}
                </div>
              )
            })}

          </div>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <p className={styles.panelTitle}>How-to steps</p>
              <p className={styles.panelSub}>Simple, safe steps you can follow when you’re not sure where to start.</p>
            </div>
          </div>

          <div className={styles.playbooks}>
            {helpCenterPlaybooks.map((p) => (
              <div className={styles.playbook} key={p.title}>
                <p className={styles.playbookTitle}>{p.title}</p>
                <ol className={styles.steps}>
                  {p.steps.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <p className={styles.panelTitle}>Where things live</p>
              <p className={styles.panelSub}>Jump straight to the page you need.</p>
            </div>
          </div>

          <div className={styles.contactGrid}>
            {helpCenterQuickLinks.map((link) => (
              <Link className={styles.contactCard} key={link.title} href={link.href}>
                <p className={styles.contactTitle}>{link.title}</p>
                <p className={styles.contactDesc}>{link.description}</p>
                <div className={styles.contactMeta}>Open {link.title} →</div>
              </Link>
            ))}
          </div>

          <div className={styles.supportBar}>
            <div className={styles.supportLeft}>
              <span className={styles.supportIcon} aria-hidden="true">
                <LuLifeBuoy />
              </span>
              <div>
                <p className={styles.supportTitle}>If something feels off</p>
                <p className={styles.supportSub}>
                  Pause before deciding. Put payouts on hold, set the dispute to Under Review,
                  and check with a teammate. It’s better to slow down than to act on incomplete information.
                </p>
              </div>
            </div>

            <Link href="/admin/notifications" className={styles.primaryBtn}>
              View notifications
            </Link>
          </div>
        </article>
      </section>
      </div>
    </div>
  )
}

