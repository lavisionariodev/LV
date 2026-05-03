'use client'

import { useState } from 'react'
import purchaseStyles from './purchases.module.css'

export const STATUS_CONFIG = {
  Pending: { color: '#A8894A', bg: 'rgba(168,137,74,0.10)' },
  Confirmed: { color: '#204F38', bg: 'rgba(32,79,56,0.10)' },
  'In Progress': { color: '#2563EB', bg: 'rgba(37,99,235,0.09)' },
  Completed: { color: '#16a34a', bg: 'rgba(22,163,74,0.10)' },
  Cancelled: { color: '#dc2626', bg: 'rgba(220,38,38,0.09)' },
  Refunded: { color: '#57534e', bg: 'rgba(87,83,78,0.10)' },
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/** @param {object} props */
export function PurchaseCard({ purchase, cancellingOrderId }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = STATUS_CONFIG[purchase.status] ?? STATUS_CONFIG.Pending

  const cancelling = cancellingOrderId === purchase.rawOrderId
  const detail = purchase.detail || {}

  return (
    <div className={purchaseStyles.card}>
      <div className={purchaseStyles.cardHeader}>
        <div className={purchaseStyles.cardTop}>
          <div className={purchaseStyles.cardInfo}>
            <span className={purchaseStyles.orderId}>{purchase.id}</span>
            <h3 className={purchaseStyles.serviceName}>{purchase.service}</h3>
            <span className={purchaseStyles.providerName}>{purchase.provider}</span>
          </div>
          <div className={purchaseStyles.badgeColumn}>
            <span
              className={purchaseStyles.statusBadge}
              style={{ color: cfg.color, background: cfg.bg }}
            >
              {purchase.status}
            </span>
            {purchase.statusDetail ? (
              <span className={purchaseStyles.statusDetail}>{purchase.statusDetail}</span>
            ) : null}
          </div>
        </div>
        <div className={purchaseStyles.paymentSubline}>{purchase.paymentMethodLine}</div>

        <div className={purchaseStyles.cardMeta}>
          <span className={purchaseStyles.metaItem}>
            <span className={purchaseStyles.metaLabel}>Booked</span>
            {formatDate(purchase.bookedDate)}
          </span>
          <span className={purchaseStyles.metaDot} />
          <span className={purchaseStyles.metaItem}>
            <span className={purchaseStyles.metaLabel}>Scheduled</span>
            {formatDate(purchase.scheduledDate)}
          </span>
          <span className={purchaseStyles.metaDot} />
          <span className={purchaseStyles.price}>{purchase.formattedTotal}</span>
        </div>
      </div>

      {expanded && (
        <div className={purchaseStyles.cardDetails}>
          <p className={purchaseStyles.detailsHeading}>Included in this package</p>
          <ul className={purchaseStyles.itemsList}>
            {purchase.itemsDetailed.map((row, i) => (
              <li key={i} className={purchaseStyles.itemsListItem}>
                {row.line}
                {row.subtotal ? (
                  <span className={purchaseStyles.itemPrice}> {row.subtotal}</span>
                ) : null}
              </li>
            ))}
          </ul>

          {(detail.serviceLocation ||
            detail.contactName ||
            detail.contactEmail ||
            detail.contactPhone) && (
            <>
              <p className={purchaseStyles.detailsHeading}>Booking / contact</p>
              <dl className={purchaseStyles.detailGrid}>
                {detail.serviceLocation ? (
                  <>
                    <dt>Service location</dt>
                    <dd>{detail.serviceLocation}</dd>
                  </>
                ) : null}
                {detail.contactName ? (
                  <>
                    <dt>Contact name</dt>
                    <dd>{detail.contactName}</dd>
                  </>
                ) : null}
                {detail.contactEmail ? (
                  <>
                    <dt>Email</dt>
                    <dd>{detail.contactEmail}</dd>
                  </>
                ) : null}
                {detail.contactPhone ? (
                  <>
                    <dt>Phone</dt>
                    <dd>{detail.contactPhone}</dd>
                  </>
                ) : null}
              </dl>
            </>
          )}

          {(detail.deceasedName || detail.dateOfDeath || detail.wakeDurationDays != null) && (
            <>
              <p className={purchaseStyles.detailsHeading}>Service details</p>
              <dl className={purchaseStyles.detailGrid}>
                {detail.deceasedName ? (
                  <>
                    <dt>Deceased</dt>
                    <dd>{detail.deceasedName}</dd>
                  </>
                ) : null}
                {detail.dateOfDeath ? (
                  <>
                    <dt>Date of death</dt>
                    <dd>{formatDate(detail.dateOfDeath)}</dd>
                  </>
                ) : null}
                {detail.wakeDurationDays != null && detail.wakeDurationDays !== '' ? (
                  <>
                    <dt>Wake duration</dt>
                    <dd>{String(detail.wakeDurationDays)} days</dd>
                  </>
                ) : null}
              </dl>
            </>
          )}

          {detail.notes ? (
            <>
              <p className={purchaseStyles.detailsHeading}>Notes</p>
              <p className={purchaseStyles.detailNotes}>{detail.notes}</p>
            </>
          ) : null}
        </div>
      )}

      <div className={purchaseStyles.cardActions}>
        <button
          type="button"
          className={purchaseStyles.actionLink}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Hide details' : 'View details'}
        </button>

        <button
          type="button"
          className={purchaseStyles.actionLink}
          disabled={!purchase.canDownloadReceipt}
          onClick={() =>
            purchase.onDownloadReceipt?.(purchase.rawOrderId, purchase.id)
          }
        >
          Download receipt
        </button>

        {purchase.status === 'Completed' ? (
          <button type="button" className={purchaseStyles.actionLink} disabled title="Coming soon">
            Leave a review
          </button>
        ) : null}

        {purchase.showCancelPurchase ? (
          <button
            type="button"
            className={`${purchaseStyles.actionLink} ${purchaseStyles.actionDanger}`}
            disabled={!purchase.canSubmitCancelPurchase || cancelling}
            title={purchase.cancelPurchaseHint ?? undefined}
            onClick={() =>
              purchase.onRequestCancel?.(purchase.rawOrderId, Boolean(purchase.cancelShowsRefundDisclaimer))
            }
          >
            {cancelling ? 'Cancelling…' : 'Cancel purchase'}
          </button>
        ) : null}
      </div>
    </div>
  )
}
