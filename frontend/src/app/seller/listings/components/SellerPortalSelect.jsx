'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMediaQuery } from '@/shared/hooks'
import styles from '../listings.module.css'

function asInputValue(value) {
  if (value == null) return ''
  return String(value)
}

export default function SellerPortalSelect({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select',
  disabled = false,
  className = '',
}) {
  const isNarrow = useMediaQuery('(max-width: 640px)')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [desktopOpen, setDesktopOpen] = useState(false)
  const desktopDropdownRef = useRef(null)
  const rawValue = asInputValue(value)
  const opts = Array.isArray(options) ? options : []

  useEffect(() => {
    if (!sheetOpen) return
    const onKey = (event) => {
      if (event.key === 'Escape') setSheetOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sheetOpen])

  useEffect(() => {
    if (!desktopOpen || isNarrow) return
    const handleClickOutside = (event) => {
      if (desktopDropdownRef.current && !desktopDropdownRef.current.contains(event.target)) {
        setDesktopOpen(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [desktopOpen, isNarrow])

  useEffect(() => {
    if (!sheetOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [sheetOpen])

  const selectedLabel = opts.find((option) => option.value === rawValue)?.label || placeholder

  const handleSelect = (nextValue) => {
    if (disabled) return
    onChange(nextValue)
    setDesktopOpen(false)
    setSheetOpen(false)
  }

  if (!isNarrow) {
    return (
      <div
        className={`${styles.filterDropdownWrap} ${styles.modalDropdownWrap} ${
          desktopOpen ? styles.filterDropdownOpen : ''
        } ${className}`.trim()}
        ref={desktopDropdownRef}
      >
        <button
          type="button"
          className={styles.filterDropdownTrigger}
          onClick={() => {
            if (disabled) return
            setDesktopOpen((prev) => !prev)
          }}
          aria-haspopup="listbox"
          aria-expanded={desktopOpen}
          aria-label={label}
          disabled={disabled}
        >
          <span className={styles.filterDropdownLabel}>{selectedLabel}</span>
          <span className={styles.filterDropdownChevron} aria-hidden>
            ▾
          </span>
        </button>
        {desktopOpen && !disabled ? (
          <div className={styles.filterDropdownPanel} role="listbox" aria-label={`${label} options`}>
            {opts.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={rawValue === option.value}
                className={`${styles.filterDropdownOption} ${
                  rawValue === option.value ? styles.filterDropdownOptionSelected : ''
                }`}
                onClick={() => handleSelect(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    )
  }

  const sheet = sheetOpen ? (
    <div className={styles.listingFormSelectSheetRoot}>
      <button
        type="button"
        className={styles.listingFormSelectSheetBackdrop}
        onClick={() => setSheetOpen(false)}
        tabIndex={-1}
        aria-label="Dismiss"
      />
      <div
        className={styles.listingFormSelectSheet}
        role="dialog"
        aria-modal="true"
        aria-label={label}
      >
        <div className={styles.listingFormSelectSheetHeader}>
          <span className={styles.listingFormSelectSheetTitle}>{label}</span>
          <button
            type="button"
            className={styles.listingFormSelectSheetClose}
            onClick={() => setSheetOpen(false)}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className={styles.listingFormSelectSheetList} role="listbox">
          {opts.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={rawValue === option.value}
              className={`${styles.listingFormSelectSheetRow} ${
                rawValue === option.value ? styles.listingFormSelectSheetRowActive : ''
              }`}
              onClick={() => handleSelect(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  ) : null

  return (
    <>
      <button
        type="button"
        className={`${styles.listingFormSelect} ${styles.listingFormSelectTrigger} ${className}`.trim()}
        onClick={() => {
          if (disabled) return
          setSheetOpen(true)
        }}
        aria-haspopup="listbox"
        aria-expanded={sheetOpen}
        aria-label={label}
        disabled={disabled}
      >
        <span className={styles.listingFormSelectTriggerLabel}>{selectedLabel}</span>
        <span className={styles.listingFormSelectTriggerCaret} aria-hidden>
          ▾
        </span>
      </button>
      {typeof document !== 'undefined' && sheet ? createPortal(sheet, document.body) : null}
    </>
  )
}
