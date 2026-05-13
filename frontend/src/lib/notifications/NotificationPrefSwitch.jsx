'use client'

export function NotificationPrefSwitch({ checked, onToggle, disabled, labelledBy, styles }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      disabled={disabled}
      className={`${styles.notifPrefSwitch} ${checked ? styles.notifPrefSwitchOn : ''} ${disabled ? styles.notifPrefSwitchDisabled : ''}`}
      onClick={() => !disabled && onToggle(!checked)}
    >
      <span className={styles.notifPrefSwitchThumb} aria-hidden />
    </button>
  )
}
