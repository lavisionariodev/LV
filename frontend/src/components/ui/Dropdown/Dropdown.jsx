'use client'

import { useEffect, useRef, useState } from 'react'

import styles from './Dropdown.module.css'

/**
 * Select-style dropdown for toolbars (admin payouts, sellers, users).
 * Styles live in `./Dropdown.module.css`.
 */
export function Dropdown({ value, onChange, options, placeholder, ariaLabel }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const selected = options.find((o) => o.value === value)

  return (
    <div className={styles.root} ref={ref} aria-label={ariaLabel}>
      <button
        type="button"
        className={`${styles.trigger} ${open ? styles.triggerOpen : ''}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={styles.label}>{selected ? selected.label : placeholder}</span>
        <svg
          className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
          viewBox="0 0 24 24"
          fill="none"
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className={styles.menu}>
          {options.map((opt) => (
            <button
              key={String(opt.value)}
              type="button"
              className={`${styles.item} ${value === opt.value ? styles.itemActive : ''}`}
              onClick={() => {
                onChange(opt.value)
                setOpen(false)
              }}
            >
              {opt.color && (
                <span className={`${styles.dot} ${styles[`dropDot_${opt.color}`]}`} />
              )}
              {opt.label}
              {value === opt.value && (
                <svg className={styles.check} viewBox="0 0 24 24" fill="none">
                  <path
                    d="M5 13l4 4L19 7"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
