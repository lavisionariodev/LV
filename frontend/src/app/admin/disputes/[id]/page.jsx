'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import layoutStyles from '../../admin.module.css'
import styles from './detail.module.css'
import { getDisputeById } from '@/data/adminSampleData'

const STATUS_FLOW = ['open', 'under_review', 'resolved', 'closed']

export default function AdminDisputeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id
  const dispute = id ? getDisputeById(id) : null

  const [status, setStatus] = useState(dispute?.status ?? 'open')

  if (!dispute) {
    return (
      <div className={layoutStyles.dashWrap}>
        <section className={layoutStyles.panel}>
          <p className={layoutStyles.panelTitle}>Dispute not found</p>
          <p className={styles.notFoundHint}>
            We could not find dispute <code>{id}</code> in the sample data.
          </p>
          <div className={styles.backBtnWrap}>
            <button
              type="button"
              className={layoutStyles.smallBtn}
              onClick={() => router.push('/admin/disputes')}
            >
              Back to disputes
            </button>
          </div>
        </section>
      </div>
    )
  }

  const currentIndex = STATUS_FLOW.indexOf(status)

  const goToNextStatus = () => {
    if (currentIndex === -1 || currentIndex === STATUS_FLOW.length - 1) return
    setStatus(STATUS_FLOW[currentIndex + 1])
  }

  return (
    <div className={layoutStyles.dashWrap}>
      <section className={layoutStyles.panel}>
        <div className={layoutStyles.panelHead}>
          <div className={styles.headLeft}>
            <p className={layoutStyles.panelTitle}>Dispute</p>
            <p className={styles.headRef}>{dispute.id}</p>
          </div>
          <button type="button" className={styles.backBtn} onClick={() => router.push('/admin/disputes')}>
            Back to list
          </button>
        </div>

        <div className={styles.form}>
          <div className={styles.section}>
            <p className={styles.sectionTitle}>Case summary</p>
            <div className={styles.fieldGrid}>
              <div className={styles.field}>
                <span className={styles.label}>Order reference</span>
                <span className={styles.value}>{dispute.orderRef}</span>
              </div>
              <div className={styles.field}>
                <span className={styles.label}>Opened on</span>
                <span className={styles.value}>{dispute.openedAt}</span>
              </div>
              <div className={styles.field}>
                <span className={styles.label}>Reason</span>
                <span className={styles.value}>{dispute.reason}</span>
              </div>
              <div className={styles.field}>
                <span className={styles.label}>Current status</span>
                <span className={styles.value}>
                  <span className={styles.statusPill} data-status={status}>{status.replaceAll('_', ' ')}</span>
                </span>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <p className={styles.sectionTitle}>Parties</p>
            <div className={styles.partyGrid}>
              <div className={styles.partyCard} data-role="complainant">
                <span className={styles.partyKicker}>Complainant</span>
                <span className={styles.partyName}>{dispute.complainantName}</span>
                <span className={styles.partyMeta}>Buyer</span>
              </div>
              <div className={styles.partyCard} data-role="respondent">
                <span className={styles.partyKicker}>Respondent</span>
                <span className={styles.partyName}>{dispute.respondentName}</span>
                <span className={styles.partyMeta}>Seller</span>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <p className={styles.sectionTitle}>Description</p>
            <div className={styles.textAreaLike}>
              {dispute.description}
            </div>
          </div>
        </div>

        <hr className={styles.divider} />

        <div className={styles.demoNote}>
          <p className={styles.demoHint}>
            This is a frontend-only demo. Changing the status updates local state only
            and does not persist anywhere.
          </p>

          <div className={styles.statusActions}>
            {[
              { k: 'open', label: 'Open' },
              { k: 'under_review', label: 'Under review' },
              { k: 'resolved', label: 'Resolved' },
              { k: 'closed', label: 'Closed' },
            ].map((s) => {
              const active = status === s.k
              return (
                <button
                  key={s.k}
                  type="button"
                  className={`${styles.statusBtn} ${active ? styles.statusBtnActive : ''}`}
                  onClick={() => setStatus(s.k)}
                  aria-pressed={active}
                >
                  {s.label}
                </button>
              )
            })}
            {currentIndex !== -1 && currentIndex < STATUS_FLOW.length - 1 && (
              <button type="button" className={styles.nextBtn} onClick={goToNextStatus}>
                Move to next step
              </button>
            )}
          </div>
        </div>

        <hr className={styles.divider} />

        <div className={styles.footerNote}>
          <p>
            In a real implementation this screen would also show the full message
            history, attached evidence, and links to the related transaction and
            payments.
          </p>
          <p>
            For now, use this as a template for the dispute resolution workflow and
            the allowed status transitions.
          </p>
          <p>
            You can always go back to{' '}
            <Link href="/admin/disputes" className={styles.link}>the disputes list</Link> to review other
            records.
          </p>
        </div>
      </section>
    </div>
  )
}

