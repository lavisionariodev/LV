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
          <p className={layoutStyles.panelTitle}>Dispute {dispute.id}</p>
          <button
            type="button"
            className={layoutStyles.smallBtn}
            onClick={() => router.push('/admin/disputes')}
          >
            Back to list
          </button>
        </div>

        <div className={styles.detailGrid}>
          <div>
            <strong>Order reference:</strong> {dispute.orderRef}
          </div>
          <div>
            <strong>Opened on:</strong> {dispute.openedAt}
          </div>
          <div>
            <strong>Complainant:</strong> {dispute.complainantName} (buyer)
          </div>
          <div>
            <strong>Respondent:</strong> {dispute.respondentName} (seller)
          </div>
          <div>
            <strong>Reason:</strong> {dispute.reason}
          </div>
          <div>
            <strong>Current status:</strong>{' '}
            <span className={layoutStyles.badge}>{status}</span>
          </div>
          <div>
            <strong>Description</strong>
            <p className={styles.descriptionBlock}>
              {dispute.description}
            </p>
          </div>
        </div>

        <hr className={styles.divider} />

        <div className={styles.demoNote}>
          <p className={styles.demoHint}>
            This is a frontend-only demo. Changing the status updates local state only
            and does not persist anywhere.
          </p>

          <div className={styles.statusActions}>
            <button
              type="button"
              className={layoutStyles.smallBtn}
              onClick={() => setStatus('open')}
            >
              Mark as open
            </button>
            <button
              type="button"
              className={layoutStyles.smallBtn}
              onClick={() => setStatus('under_review')}
            >
              Mark under review
            </button>
            <button
              type="button"
              className={layoutStyles.smallBtn}
              onClick={() => setStatus('resolved')}
            >
              Mark resolved
            </button>
            <button
              type="button"
              className={layoutStyles.smallBtn}
              onClick={() => setStatus('closed')}
            >
              Close dispute
            </button>
            {currentIndex !== -1 && currentIndex < STATUS_FLOW.length - 1 && (
              <button
                type="button"
                className={layoutStyles.smallBtn}
                onClick={goToNextStatus}
              >
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

