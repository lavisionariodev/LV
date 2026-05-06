'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import styles from './InstallAppControl.module.css'

function isIOSDevice() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  return /iPad|iPhone|iPod/i.test(ua)
}

function isInStandaloneMode() {
  if (typeof window === 'undefined') return false
  const standaloneMq = window.matchMedia?.('(display-mode: standalone)')?.matches
  // iOS Safari uses navigator.standalone
  const iosStandalone = typeof navigator !== 'undefined' && navigator.standalone === true
  return Boolean(standaloneMq || iosStandalone)
}

export default function InstallAppControl({ variant = 'dark' }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [canInstall, setCanInstall] = useState(false)
  const [installed, setInstalled] = useState(false)
  const [iosHelpOpen, setIosHelpOpen] = useState(false)
  const wrapRef = useRef(null)

  const isIOS = useMemo(() => isIOSDevice(), [])

  useEffect(() => {
    setInstalled(isInStandaloneMode())

    const handleAppInstalled = () => {
      setInstalled(true)
      setCanInstall(false)
      setDeferredPrompt(null)
      setIosHelpOpen(false)
    }

    const handleBeforeInstallPrompt = (e) => {
      // Allow us to trigger the prompt from a user gesture.
      e.preventDefault()
      setDeferredPrompt(e)
      setCanInstall(true)
    }

    const handleDisplayModeChange = () => setInstalled(isInStandaloneMode())

    window.addEventListener('appinstalled', handleAppInstalled)
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.matchMedia?.('(display-mode: standalone)')?.addEventListener?.('change', handleDisplayModeChange)

    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.matchMedia?.('(display-mode: standalone)')?.removeEventListener?.('change', handleDisplayModeChange)
    }
  }, [])

  useEffect(() => {
    const onDocMouseDown = (e) => {
      if (!wrapRef.current) return
      if (!wrapRef.current.contains(e.target)) setIosHelpOpen(false)
    }
    if (iosHelpOpen) document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [iosHelpOpen])

  const showForIOS = isIOS && !installed
  const visible = (!installed && canInstall) || showForIOS

  if (!visible) return null

  const btnClass =
    variant === 'light' ? `${styles.btn} ${styles.btnLightSurface}` : styles.btn

  const label = installed ? 'Installed' : 'Install App'

  const onClick = async () => {
    if (installed) return

    if (showForIOS) {
      setIosHelpOpen((v) => !v)
      return
    }

    if (!deferredPrompt) return

    try {
      await deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      setDeferredPrompt(null)
      setCanInstall(false)
      if (choice?.outcome === 'accepted') setInstalled(true)
    } catch {
      // If the prompt fails, keep the button hidden to avoid repeated attempts.
      setDeferredPrompt(null)
      setCanInstall(false)
    }
  }

  return (
    <span className={styles.wrap} ref={wrapRef}>
      <button type="button" className={btnClass} onClick={onClick} aria-label={label}>
        <span className={styles.icon} aria-hidden="true">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3v12" />
            <path d="m8 11 4 4 4-4" />
            <path d="M4 21h16" />
          </svg>
        </span>
        <span className={styles.btnText}>{label}</span>
      </button>

      {showForIOS && iosHelpOpen && (
        <div className={styles.tooltip} role="dialog" aria-label="Install app on iOS">
          <div className={styles.tooltipTitle}>Install on iPhone/iPad</div>
          <div className={styles.tooltipHint}>Tap Share → Add to Home Screen.</div>
        </div>
      )}
    </span>
  )
}

