'use client'

import styles from './Logout.module.css'
import { LuLogOut } from 'react-icons/lu'

export default function Logout({ open, onConfirm, onCancel }) {
  if (!open) return null

  const handleOverlayClick = () => {
    onCancel?.()
  }

  const stop = (e) => e.stopPropagation()

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" onClick={handleOverlayClick}>
      <div className={styles.modal} onClick={stop}>
        <div className={styles.iconWrap} aria-hidden="true">
          <div className={styles.iconCircle}>
            <LuLogOut />
          </div>
        </div>

        <p className={styles.title}>Logout Account?</p>
        <p className={styles.subtitle}>Are you sure want to logout your account?</p>

        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={onCancel}>
            Cancel
          </button>

          <button type="button" className={styles.logoutBtn} onClick={onConfirm}>   
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}