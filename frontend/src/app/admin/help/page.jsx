'use client'

import { useState } from 'react'
import styles from './help.module.css'
import {
  LuShield,
  LuScale,
  LuUserCheck,
  LuChartBar,
  LuChevronDown,
  LuExternalLink,
  LuLifeBuoy,
} from 'react-icons/lu'
import {
  helpCenterTopics,
  helpCenterFaqs,
  helpCenterPlaybooks,
  helpCenterEscalationContacts,
} from './helpContent'

const HELP_TOPIC_ICON_MAP = {
  LuUserCheck,
  LuScale,
  LuShield,
  LuChartBar,
}

export default function AdminHelpCenterPage() {
  const [openFaq, setOpenFaq] = useState(0)

  return (
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
              <p className={styles.panelTitle}>Key FAQs</p>
              <p className={styles.panelSub}>Fast answers for common CEO decisions.</p>
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
              <p className={styles.panelTitle}>Decision playbooks</p>
              <p className={styles.panelSub}>Short, safe actions you can follow.</p>
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
              <p className={styles.panelTitle}>Escalation contacts</p>
              <p className={styles.panelSub}>Use when the case is high risk.</p>
            </div>
          </div>

          <div className={styles.contactGrid}>
            {helpCenterEscalationContacts.map((c) => (
              <div className={styles.contactCard} key={c.title}>
                <p className={styles.contactTitle}>{c.title}</p>
                <p className={styles.contactDesc}>{c.description}</p>
                <div className={styles.contactMeta}>{c.email}</div>
              </div>
            ))}
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
