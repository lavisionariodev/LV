'use client'

import { useMemo, useState } from 'react'
import styles from './help.module.css'
import {
  LuShield,
  LuScale,
  LuUserCheck,
  LuChartBar,
  LuLifeBuoy,
  LuChevronDown,
  LuExternalLink,
} from 'react-icons/lu'

export default function AdminHelpCenterPage() {
  const [openFaq, setOpenFaq] = useState(0)

  const topics = useMemo(
    () => [
      {
        icon: <LuUserCheck />,
        title: 'Seller approvals',
        desc: 'Verify sellers, approve or reject, and understand impact.',
        bullets: [
          'What to check before approval',
          'What happens after approval or rejection',
          'High-risk seller red flags',
        ],
      },
      {
        icon: <LuScale />,
        title: 'Disputes and refunds',
        desc: 'Resolve disputes, refunds, and fraud cases safely.',
        bullets: [
          'Dispute flow and statuses',
          'When to freeze funds',
          'When to escalate or ban',
        ],
      },
      {
        icon: <LuShield />,
        title: 'Policy enforcement',
        desc: 'Handle violations and prohibited items consistently.',
        bullets: [
          'Violation levels and penalties',
          'Repeat offender handling',
          'Content takedown guidelines',
        ],
      },
        {
        icon: <LuChartBar />,
        title: 'Dashboard metrics',
        desc: 'Know what to watch and what it means for the business.',
        bullets: [
            'GMV, conversion, refund rate',
            'Seller health and retention',
            'Fraud signals and spikes',
        ],
        },
    ],
    []
  )

  const faqs = useMemo(
    () => [
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
    ],
    []
  )

    const filteredTopics = topics
    const filteredFaqs = faqs

  const playbooks = useMemo(
    () => [
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
    ],
    []
  )

  return (
    <div className={styles.wrap}>

      <section className={styles.grid}>
        {filteredTopics.map((t) => (
          <article className={styles.card} key={t.title}>
            <div className={styles.cardTop}>
              <div className={styles.icon}>{t.icon}</div>
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
        ))}

        {filteredTopics.length === 0 && (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>No matching topics</p>
            <p className={styles.emptySub}>Try a different keyword.</p>
          </div>
        )}
      </section>

      <section className={styles.lower}>
        <article className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <p className={styles.panelTitle}>Key FAQs</p>
              <p className={styles.panelSub}>Fast answers for common CEO decisions.</p>
            </div>
          </div>

          <div className={styles.faqList}>
            {filteredFaqs.map((f, idx) => {
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

            {filteredFaqs.length === 0 && (
              <div className={styles.faqEmpty}>
                No matching FAQs found for this search.
              </div>
            )}
          </div>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <p className={styles.panelTitle}>Decision playbooks</p>
              <p className={styles.panelSub}>Short, safe actions you can follow.</p>
            </div>
          </div>

          <div className={styles.playbooks}>
            {playbooks.map((p) => (
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
              <p className={styles.panelTitle}>Escalation contacts</p>
              <p className={styles.panelSub}>Use when the case is high risk.</p>
            </div>
          </div>

          <div className={styles.contactGrid}>
            <div className={styles.contactCard}>
              <p className={styles.contactTitle}>Operations</p>
              <p className={styles.contactDesc}>
                Policy cases, seller investigations, dispute escalation.
              </p>
              <div className={styles.contactMeta}>ops@yourcompany.com</div>
            </div>

            <div className={styles.contactCard}>
              <p className={styles.contactTitle}>Security</p>
              <p className={styles.contactDesc}>
                Account breach, fraud spikes, suspicious admin actions.
              </p>
              <div className={styles.contactMeta}>security@yourcompany.com</div>
            </div>

            <div className={styles.contactCard}>
              <p className={styles.contactTitle}>Legal</p>
              <p className={styles.contactDesc}>
                Chargebacks, regulatory concerns, sensitive takedowns.
              </p>
              <div className={styles.contactMeta}>legal@yourcompany.com</div>
            </div>
          </div>

          <div className={styles.supportBar}>
            <div className={styles.supportLeft}>
              <span className={styles.supportIcon} aria-hidden="true">
                <LuLifeBuoy />
              </span>
              <div>
                <p className={styles.supportTitle}>Need help now?</p>
                <p className={styles.supportSub}>
                  For urgent incidents, escalate first, then document the case.
                </p>
              </div>
            </div>

            <button type="button" className={styles.primaryBtn}>
              Open support ticket <LuExternalLink />
            </button>
          </div>
        </article>
      </section>
    </div>
  )
}