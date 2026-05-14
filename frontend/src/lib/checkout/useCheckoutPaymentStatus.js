'use client'

import { useEffect, useState } from 'react'

const POLL_INTERVAL_MS = 2000
const MAX_ATTEMPTS = 30

/**
 * @param {string | null} paymentId
 */
export function useCheckoutPaymentStatus(paymentId) {
  const hasPaymentId = Boolean(paymentId)
  const [status, setStatus] = useState(hasPaymentId ? 'pending' : 'unknown')
  const [settled, setSettled] = useState(!hasPaymentId)
  const [loading, setLoading] = useState(hasPaymentId)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!paymentId) return undefined

    let cancelled = false
    let attempts = 0

    async function poll() {
      while (!cancelled && attempts < MAX_ATTEMPTS) {
        attempts += 1
        try {
          const res = await fetch(`/api/checkout/payments/${encodeURIComponent(paymentId)}/status`, {
            cache: 'no-store',
          })
          const body = await res.json().catch(() => null)
          if (!res.ok) {
            if (!cancelled) {
              setError(body?.error || 'Could not confirm payment status.')
              setLoading(false)
            }
            return
          }

          const nextStatus = String(body?.status || 'pending')
          if (!cancelled) {
            setStatus(nextStatus)
            if (body?.settled) {
              setSettled(true)
              setLoading(false)
              return
            }
          }
        } catch {
          if (!cancelled) {
            setError('Could not confirm payment status.')
            setLoading(false)
          }
          return
        }

        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
      }

      if (!cancelled) {
        setLoading(false)
      }
    }

    poll()
    return () => {
      cancelled = true
    }
  }, [paymentId])

  return { status, settled, loading, error }
}
