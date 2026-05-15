'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { fetchActivePartnersDirectory, fetchPartnersSpotlight } from '@/lib/partners/client'
import styles from './partners.module.css'

export default function PartnershipsPage() {
  return (
    <>
      <PartnerHeroSection />
      <FeaturedPartnersSection />
      <AllPartnersSection />
      <BecomeAPartnerSection />
    </>
  )
}

/* ---------------- PARTNER HERO ---------------- */
function PartnerHeroSection() {
  return (
    <section className={styles.hero}>
      <div className={styles.heroOverlay} />
      <div className={styles.inner}>
        <div className={styles.content}>
          <span className={styles.eyebrow}>Our Trusted Network</span>
          <h1 className={styles.title}>
            Partners in <br />Compassionate Service
          </h1>
          <p className={styles.subheading}>
            La Visionario works alongside verified, experienced providers to
            ensure every family receives dignified, transparent, and caring support.
          </p>
        </div>
      </div>
    </section>
  )
}

/**
 * Spotlight: all Top rated matches (tie rules), then admin-featured sellers who are
 * not already shown as Top rated (no duplicate cards for the same seller).
 */
function FeaturedPartnersSection() {
  const [spotlight, setSpotlight] = useState({ featured: [], topRated: [] })
  const [loadState, setLoadState] = useState('loading')
  const [loadErrorDetail, setLoadErrorDetail] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetchPartnersSpotlight()
      .then((data) => {
        if (cancelled) return
        setSpotlight(data)
        setLoadState('ready')
      })
      .catch((err) => {
        if (!cancelled) {
          const msg =
            typeof err?.message === 'string' ? err.message : 'Failed to load spotlight.'
          setSpotlight({ featured: [], topRated: [] })
          setLoadErrorDetail(msg)
          setLoadState('error')
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const cards = useMemo(() => {
    const top = (spotlight.topRated || []).map((p) => ({ ...p, badge: 'Top Rated' }))
    const topIds = new Set(top.map((p) => p.sellerUserId))
    const feat = (spotlight.featured || [])
      .filter((p) => p.sellerUserId && !topIds.has(p.sellerUserId))
      .map((p) => ({ ...p, badge: 'Featured' }))
    return [...top, ...feat]
  }, [spotlight])

  const showEmpty =
    loadState === 'ready' && cards.length === 0

  return (
    <section className={styles.featuredSection}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <span className={styles.subtitle}>Spotlight</span>
          <h2 className={styles.sectionTitle}>Featured Partners</h2>
          <p className={styles.description}>
            Highlighted for their outstanding service, consistency, and commitment to families in need.
          </p>
        </div>

        {loadState === 'loading' && (
          <p className={styles.featuredGridStatus} role="status">
            Loading spotlight…
          </p>
        )}
        {loadState === 'error' && (
          <div className={styles.featuredGridStatus} role="alert">
            <p className={styles.partnersGridErrorMain}>
              We couldn&apos;t load the spotlight. Please try again later.
            </p>
            {loadErrorDetail ? (
              <p className={styles.partnersGridErrorDetail}>{loadErrorDetail}</p>
            ) : null}
            <p className={styles.partnersGridErrorHint}>
              Apply the migration that defines{' '}
              <code className={styles.partnersInlineCode}>get_partners_spotlight</code> in Supabase
              (see spotlight migrations <code className={styles.partnersInlineCode}>087</code>–
              <code className={styles.partnersInlineCode}>089</code> and listing filter{' '}
              <code className={styles.partnersInlineCode}>091</code>), then reload.
            </p>
          </div>
        )}
        {showEmpty && (
          <p className={styles.featuredEmpty} role="status">
            No partners to show yet.
          </p>
        )}
        {loadState === 'ready' && cards.length > 0 && (
          <div className={styles.featuredGrid}>
            {cards.map((partner) => (
              <div
                key={`${partner.badge}-${partner.sellerUserId}`}
                className={styles.featuredCard}
              >
                <div className={styles.featuredBadge}>{partner.badge}</div>
                <div className={styles.featuredImageWrap}>
                  {partner.avatarUrl ? (
                    <Image
                      src={partner.avatarUrl}
                      alt={partner.businessName}
                      width={96}
                      height={96}
                      className={styles.featuredCircleImage}
                      unoptimized
                    />
                  ) : (
                    <span
                      className={styles.featuredAvatarInitials}
                      aria-hidden
                    >
                      {partnerInitials(partner.businessName)}
                    </span>
                  )}
                </div>
                <div className={styles.featuredBody}>
                  <span className={styles.featuredSpecialty}>
                    {(partner.businessTypeLabel || 'Partner').toUpperCase()}
                  </span>
                  <h3 className={styles.featuredName}>{partner.businessName}</h3>
                  {partner.tagline ? (
                    <p className={styles.featuredTagline}>{partner.tagline}</p>
                  ) : null}
                  <p className={styles.featuredDesc}>{partner.description}</p>
                  <div className={styles.featuredMeta}>
                    <span className={styles.featuredYears}>
                      {partner.yearsLabel || '—'}
                    </span>
                    {partner.avgRating != null ? (
                      <span className={styles.featuredMetaRight}>
                        <span className={styles.featuredRating}>
                          ★ {Number(partner.avgRating).toFixed(1)}
                        </span>
                      </span>
                    ) : null}
                  </div>
                  <Link
                    href={`/seller-profile?seller=${encodeURIComponent(partner.sellerUserId)}`}
                    className={styles.viewBtn}
                  >
                    View Profile
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

/* ---------------- ALL PARTNERS GRID ---------------- */
function partnerInitials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
  }
  return (parts[0]?.charAt(0) || 'P').toUpperCase()
}

function AllPartnersSection() {
  const [filter, setFilter] = useState('All')
  const [partners, setPartners] = useState([])
  const [loadState, setLoadState] = useState('loading')
  const [loadErrorDetail, setLoadErrorDetail] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetchActivePartnersDirectory({ bustCache: true })
      .then((rows) => {
        if (cancelled) return
        setPartners(rows)
        setLoadState('ready')
      })
      .catch((err) => {
        if (!cancelled) {
          const msg =
            typeof err?.message === 'string' ? err.message : 'Failed to load partners.'
          setPartners([])
          setLoadErrorDetail(msg)
          setLoadState('error')
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const categories = useMemo(() => {
    const labels = [
      ...new Set(
        partners.map((p) => (p.businessTypeLabel || '').trim()).filter(Boolean),
      ),
    ].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    return ['All', ...labels]
  }, [partners])

  useEffect(() => {
    if (filter === 'All' || categories.includes(filter)) return
    queueMicrotask(() => {
      setFilter('All')
    })
  }, [categories, filter])

  const filtered = useMemo(() => {
    if (filter === 'All') return partners
    return partners.filter(
      (p) => (p.businessTypeLabel || '').trim().toLowerCase() === filter.toLowerCase(),
    )
  }, [filter, partners])

  return (
    <section className={styles.allPartnersSection}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <span className={styles.subtitle}>Verified Network</span>
          <h2 className={styles.sectionTitle}>All Partners</h2>
          <p className={styles.description}>
            Every provider in our network is individually vetted for service quality,
            reliability, and compassionate practice.
          </p>
        </div>

        {/* Filter Tabs — labels from sellers’ business_type_label */}
        {categories.length > 1 && (
          <div className={styles.filterBar}>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`${styles.filterBtn} ${filter === cat ? styles.filterBtnActive : ''}`}
                onClick={() => setFilter(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Partner Cards Grid */}
        <div className={styles.partnersGrid}>
          {loadState === 'loading' && (
            <p className={styles.partnersGridStatus} role="status">
              Loading partners…
            </p>
          )}
          {loadState === 'error' && (
            <div className={styles.partnersGridStatus} role="alert">
              <p className={styles.partnersGridErrorMain}>
                We couldn&apos;t load the partner list. Please try again later.
              </p>
              {loadErrorDetail ? (
                <p className={styles.partnersGridErrorDetail}>{loadErrorDetail}</p>
              ) : null}
              <p className={styles.partnersGridErrorHint}>
                Typical fix: apply migrations that define{' '}
                <code className={styles.partnersInlineCode}>get_active_partners_directory</code>{' '}
                (including <code className={styles.partnersInlineCode}>090</code>–
                <code className={styles.partnersInlineCode}>091</code>) in Supabase, then reload this page
                (or reload the Schema in the Dashboard API settings if the function existed but RPC still
                404’d).
              </p>
            </div>
          )}
          {loadState === 'ready' && partners.length === 0 && (
            <p className={styles.partnersGridStatus}>No partners to show yet.</p>
          )}
          {loadState === 'ready' && partners.length > 0 && filtered.length === 0 && (
            <p className={styles.partnersGridStatus}>No partners match this filter.</p>
          )}
          {filtered.map((partner) => (
            <div key={partner.sellerUserId} className={styles.partnerCard}>
              <div className={styles.partnerImageWrap}>
                {partner.avatarUrl ? (
                  <Image
                    src={partner.avatarUrl}
                    alt={partner.businessName}
                    width={80}
                    height={80}
                    className={styles.partnerCircleImage}
                    unoptimized
                  />
                ) : (
                  <span
                    className={styles.partnerAvatarInitials}
                    aria-hidden
                  >
                    {partnerInitials(partner.businessName)}
                  </span>
                )}
              </div>
              <div className={styles.partnerCardBody}>
                <span className={styles.partnerTag}>
                  {(partner.businessTypeLabel || 'Partner').toUpperCase()}
                </span>
                <h3 className={styles.partnerName}>{partner.businessName}</h3>
                <p className={styles.partnerDesc}>
                  {partner.tagline || '\u2014'}
                </p>
              </div>
              <div className={styles.partnerCardFooter}>
                <Link
                  href={`/seller-profile?seller=${encodeURIComponent(partner.sellerUserId)}`}
                  className={styles.partnerViewBtn}
                >
                  View Partner
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------------- BECOME A PARTNER CTA ---------------- */
function BecomeAPartnerSection() {
  return (
    <section className={styles.ctaSection}>
      <div className={styles.ctaOverlay} />
      <div className={styles.inner}>
        <div className={styles.ctaContent}>
          <span className={styles.ctaEyebrow}>Join Our Network</span>
          <h2 className={styles.ctaTitle}>Partner with La Visionario</h2>
          <p className={styles.ctaDescription}>
            Join our network of trusted funeral service providers, memorial parks,
            and suppliers — and connect with families who need you most.
          </p>

          <div className={styles.ctaBenefits}>
            {[
              '✦  Thousands of families reached annually',
              '✦  Verified partner badge & profile listing',
              '✦  Dedicated onboarding support',
            ].map((text, i) => (
              <p key={i} className={styles.benefitText}>{text}</p>
            ))}
          </div>

          <div className={styles.ctaButtons}>
            <Link href="/seller/signup" className={styles.ctaPrimary}>
              Apply as Seller
            </Link>
            <Link href="/seller/login" className={styles.ctaSecondary}>
              Become a Service Provider
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}