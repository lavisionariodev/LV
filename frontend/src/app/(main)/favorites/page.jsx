'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import styles from './favorites.module.css'
import { useAuth } from '@/contexts/AuthContext'

export default function FavoritesPage() {
  const router = useRouter()
  const { user, isBuyer, authLoading } = useAuth()

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace(`/buyer/login?redirect=${encodeURIComponent('/favorites')}`)
      return
    }
    if (!isBuyer) {
      router.replace('/buyer/login?redirect=/favorites')
    }
  }, [authLoading, user, isBuyer, router])

  if (authLoading || !user || !isBuyer) {
    return null
  }

  return (
    <section className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <h1 className={styles.heroTitle}>Your Favorites</h1>
          <p className={styles.breadcrumb}>
            <Link href="/" className={styles.crumb}>Home</Link>
            <span className={styles.slash}>/</span>
            <span className={styles.crumbActive}>Favorites</span>
          </p>
        </div>
      </header>

      <div className={styles.content}>
        <div className={styles.emptySection}>
          <div className={styles.emptyIcon} aria-hidden>
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </div>
          <h2 className={styles.emptyTitle}>No favorites yet</h2>
          <p className={styles.emptySub}>Save packages or services you like to find them here later.</p>
          <Link href="/shop" className={styles.emptyLink}>Browse services</Link>
        </div>
      </div>
    </section>
  )
}
