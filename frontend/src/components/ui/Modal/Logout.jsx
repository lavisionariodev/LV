'use client'

import { useCallback, useEffect, useState } from 'react'
import styles from './Logout.module.css'
import { LuLogOut } from 'react-icons/lu'

export default function Logout({ open, onConfirm, onCancel }) {
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    if (!open) setIsLoggingOut(false)
  }, [open])

  const handleOverlayClick = useCallback(() => {
    if (isLoggingOut) return
    onCancel?.()
  }, [isLoggingOut, onCancel])

  const handleConfirm = useCallback(async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      await Promise.resolve(onConfirm?.())
    } finally {
      setIsLoggingOut(false)
    }
  }, [isLoggingOut, onConfirm])

  if (!open) return null

  const stop = (e) => e.stopPropagation()

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-busy={isLoggingOut}
      onClick={handleOverlayClick}
    >
      <div className={styles.modal} onClick={stop}>
        <div className={styles.iconWrap} aria-hidden="true">
          <div className={styles.iconCircle}>
            <LuLogOut />
          </div>
        </div>

        <p className={styles.title}>Logout Account?</p>
        <p className={styles.subtitle}>Are you sure want to logout your account?</p>

        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={onCancel} disabled={isLoggingOut}>
            Cancel
          </button>

          <button type="button" className={styles.logoutBtn} onClick={handleConfirm} disabled={isLoggingOut}>
            {isLoggingOut ? 'Logging out' : 'Logout'}
          </button>
        </div>
      </div>
    </div>
  )
}