'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import styles from './payouts.module.css'

function formatMoney(n) {
  const v = Number(n) || 0
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 0 }).format(v)
}

export default function StuckRefundsStrip() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    setErr('')
    const res = await fetch('/api/admin/refunds/stuck', { cache: 'no-store' })
    const body = await res.json().catch(() => null)
    if (!res.ok) {
      setErr(typeof body?.error === 'string' ? body.error : 'Could not load refund queue.')
      setOrders([])
      setLoading(false)
      return
    }
    setOrders(Array.isArray(body?.orders) ? body.orders : [])
    setLoading(false)
  }, [])

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

  if (loading) return null
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
    <section className={styles.stuckRefundsWrap} aria-labelledby="stuck-refunds-title">
      <div className={styles.stuckRefundsHead}>
        <p id="stuck-refunds-title" className={styles.stuckRefundsTitle}>
          Refunds requiring attention
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
                    onClick={() => {
                      if (
                        !window.confirm(
                          'This will mark the order as refunded in the platform only, without contacting the payment provider. Use this only if the funds have already been returned through another channel. Proceed?',
                        )
                      ) {
                        return
                      }
                      runAction(o.id, 'force_complete_manual')
                    }}
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
    </section>
  )
}
