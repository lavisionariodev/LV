'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import styles from './payouts.module.css'
import ConfirmModal from '@/components/ui/Modal/ConfirmModal'

function formatMoney(n) {
  const v = Number(n) || 0
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 0 }).format(v)
}

const PAGE_LIMIT = 50

export default function StuckRefundsStrip() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [err, setErr] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [manualRefundConfirmId, setManualRefundConfirmId] = useState(null)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  const fetchPage = useCallback(async ({ offset = 0, append = false } = {}) => {
    setErr('')
    if (!append) setLoading(true)
    else setLoadingMore(true)
    try {
      const url = `/api/admin/refunds/stuck?limit=${PAGE_LIMIT}&offset=${offset}`
      const res = await fetch(url, { cache: 'no-store' })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        setErr(typeof body?.error === 'string' ? body.error : 'Could not load refund queue.')
        if (!append) setOrders([])
        return
      }
      const next = Array.isArray(body?.orders) ? body.orders : []
      setOrders((prev) => (append ? [...prev, ...next] : next))
      setTotal(Number.isFinite(body?.total) ? body.total : next.length)
      setHasMore(Boolean(body?.hasMore))
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  const load = useCallback(() => fetchPage({ offset: 0, append: false }), [fetchPage])

  const loadMore = useCallback(
    () => fetchPage({ offset: orders.length, append: true }),
    [fetchPage, orders.length],
  )

  useEffect(() => {
    queueMicrotask(() => {
      load()
    })
  }, [load])

  const runAction = async (orderId, action) => {
    setBusyId(orderId)
    try {
      const res = await fetch('/api/admin/orders/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, action }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        window.alert(typeof body?.error === 'string' ? body.error : 'Action failed.')
        return
      }
      await load()
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return (
      <section
        className={styles.stuckRefundsWrap}
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label="Loading refunds queue"
      >
        <div className={styles.stuckRefundsHead}>
          <p className={styles.stuckRefundsTitle}>Refunds requiring attention</p>
          <span
            className={styles.tableSkeletonBar}
            style={{ display: 'block', height: 11, width: 'min(100%, 520px)', marginTop: 6, maxWidth: '100%' }}
            aria-hidden
          />
          <span
            className={styles.tableSkeletonBar}
            style={{ display: 'block', height: 11, width: 'min(100%, 380px)', marginTop: 6, maxWidth: '100%' }}
            aria-hidden
          />
        </div>
        <div className={styles.stuckRefundsTableWrap}>
          <table className={styles.stuckRefundsTable}>
            <thead>
              <tr>
                <th>Order</th>
                <th>Refund status</th>
                <th>Payment</th>
                <th>Subtotal</th>
                <th>PayMongo refund</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 3 }).map((_, i) => (
                <tr key={`stuck-sk-${i}`} className={styles.tableSkeletonRow}>
                  <td>
                    <span className={styles.tableSkeletonBar} style={{ width: 88, height: 12 }} aria-hidden />
                  </td>
                  <td>
                    <span className={styles.tableSkeletonBar} style={{ width: 110, height: 12 }} aria-hidden />
                  </td>
                  <td>
                    <span className={styles.tableSkeletonBar} style={{ width: 72, height: 12 }} aria-hidden />
                  </td>
                  <td>
                    <span className={styles.tableSkeletonBar} style={{ width: 64, height: 13 }} aria-hidden />
                  </td>
                  <td>
                    <span className={styles.tableSkeletonBar} style={{ width: 120, height: 12 }} aria-hidden />
                  </td>
                  <td className={styles.stuckRefundsActions}>
                    <span
                      className={styles.tableSkeletonBar}
                      style={{ display: 'inline-block', width: 88, height: 28, borderRadius: 8, marginLeft: 6 }}
                      aria-hidden
                    />
                    <span
                      className={styles.tableSkeletonBar}
                      style={{ display: 'inline-block', width: 132, height: 28, borderRadius: 8, marginLeft: 6 }}
                      aria-hidden
                    />
                    <span
                      className={styles.tableSkeletonBar}
                      style={{ display: 'inline-block', width: 56, height: 22, borderRadius: 8, marginLeft: 6 }}
                      aria-hidden
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    )
  }
  if (err) {
    return (
      <section className={styles.stuckRefundsWrap} aria-live="polite">
        <p className={styles.stuckRefundsTitle}>Refunds requiring attention</p>
        <p className={styles.stuckRefundsError}>{err}</p>
      </section>
    )
  }
  if (!orders.length) return null

  return (
    <>
      <section className={styles.stuckRefundsWrap} aria-labelledby="stuck-refunds-title">
      <div className={styles.stuckRefundsHead}>
        <p id="stuck-refunds-title" className={styles.stuckRefundsTitle}>
          Refunds requiring attention{' '}
          <span style={{ fontWeight: 400, color: '#64748b', fontSize: 13 }}>
            ({orders.length} of {total})
          </span>
        </p>
        <p className={styles.stuckRefundsSub}>
          Orders with refunds in a requested or processing state. Use Retry to re-initiate a refund through the
          payment provider. Use Manual complete only when funds have been returned outside the platform.
        </p>
      </div>
      <div className={styles.stuckRefundsTableWrap}>
        <table className={styles.stuckRefundsTable}>
          <thead>
            <tr>
              <th>Order</th>
              <th>Refund status</th>
              <th>Payment</th>
              <th>Subtotal</th>
              <th>PayMongo refund</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>
                  <span className={styles.stuckRefundsMono}>{o.order_number || o.id}</span>
                </td>
                <td>{o.refund_status}</td>
                <td>{o.payment_status}</td>
                <td>{formatMoney(o.subtotal)}</td>
                <td>
                  <span className={styles.stuckRefundsMono}>{o.paymongo_refund_id || '—'}</span>
                </td>
                <td className={styles.stuckRefundsActions}>
                  <button
                    type="button"
                    className={styles.stuckRefundsBtn}
                    disabled={busyId === o.id}
                    onClick={() => runAction(o.id, 'retry_paymongo_refund')}
                  >
                    Retry refund
                  </button>
                  <button
                    type="button"
                    className={styles.stuckRefundsBtnDanger}
                    disabled={busyId === o.id}
                    onClick={() => setManualRefundConfirmId(o.id)}
                  >
                    Mark refunded manually
                  </button>
                  <Link href={`/admin/payouts?q=${encodeURIComponent(o.order_number || o.id)}`} className={styles.stuckRefundsLink}>
                    Payouts
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hasMore ? (
        <div style={{ marginTop: 12, textAlign: 'center' }}>
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className={styles.stuckRefundsBtn}
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      ) : null}
      </section>

      <ConfirmModal
        open={manualRefundConfirmId != null}
        variant="danger"
        title="Mark refunded manually?"
        message="This marks the order as refunded in the platform only, without contacting the payment provider. Use this only if the funds have already been returned through another channel."
        confirmLabel="Mark refunded"
        confirmLoadingLabel="Applying..."
        cancelLabel="Cancel"
        loading={
          manualRefundConfirmId != null && busyId === manualRefundConfirmId
        }
        onCancel={() => {
          if (busyId) return
          setManualRefundConfirmId(null)
        }}
        onConfirm={async () => {
          if (manualRefundConfirmId == null) return
          try {
            await runAction(manualRefundConfirmId, 'force_complete_manual')
          } finally {
            setManualRefundConfirmId(null)
          }
        }}
      />
    </>
  )
}
