'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { fetchActivePartnersDirectory } from '@/lib/partners/client'
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

/* ---------------- FEATURED PARTNERS ---------------- */
function FeaturedPartnersSection() {
  const featured = [
    {
      name: 'Serenity Memorial Services',
      tagline: 'Complete Care. Every Step.',
      description:
        'Providing complete funeral arrangements with compassion and care. Trusted by thousands of families across Metro Manila for over 18 years.',
      specialty: 'Full Funeral Arrangements',
      yearsActive: '18 years in service',
      rating: '4.9',
      badge: 'Top Rated',
      image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=200&h=200&fit=crop&auto=format',
    },
    {
      name: 'Eternal Peace Chapels',
      tagline: 'Spaces of Quiet & Dignity',
      description:
        'Modern chapel spaces designed for peaceful and respectful services. Facilities available 24/7 with full amenity support for families.',
      specialty: 'Chapel & Wake Facilities',
      yearsActive: '12 years in service',
      rating: '4.8',
      badge: 'Featured',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&auto=format',
    },
  ]

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

        <div className={styles.featuredGrid}>
          {featured.map((partner, i) => (
            <div key={i} className={styles.featuredCard}>
              <div className={styles.featuredBadge}>{partner.badge}</div>
              <div className={styles.featuredImageWrap}>
                <img
                  src={partner.image}
                  alt={partner.name}
                  className={styles.featuredCircleImage}
                />
              </div>
              <div className={styles.featuredBody}>
                <span className={styles.featuredSpecialty}>{partner.specialty}</span>
                <h3 className={styles.featuredName}>{partner.name}</h3>
                <p className={styles.featuredTagline}>{partner.tagline}</p>
                <p className={styles.featuredDesc}>{partner.description}</p>
                <div className={styles.featuredMeta}>
                  <span className={styles.featuredYears}>{partner.yearsActive}</span>
                  <span className={styles.featuredRating}>★ {partner.rating}</span>
                </div>
                <button className={styles.viewBtn}>View Profile</button>
              </div>
            </div>
          ))}
        </div>
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
  const [loadState, setLoadState] = useState('idle')
  const [loadErrorDetail, setLoadErrorDetail] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoadState('loading')
    setLoadErrorDetail(null)
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
    if (filter !== 'All' && !categories.includes(filter)) {
      setFilter('All')
    }
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
                in Supabase, then reload this page (or reload the Schema in the Dashboard API
                settings if the function existed but RPC still 404’d).
              </p>
            </div>
          )}
          {loadState === 'ready' && partners.length === 0 && (
            <p className={styles.partnersGridStatus}>
              No registered sellers to show yet. When sellers join La Visionario, they will appear here.
            </p>
          )}
          {loadState === 'ready' && partners.length > 0 && filtered.length === 0 && (
            <p className={styles.partnersGridStatus}>No partners match this filter.</p>
          )}
          {filtered.map((partner) => (
            <div key={partner.sellerUserId} className={styles.partnerCard}>
              <div className={styles.partnerImageWrap}>
                {partner.avatarUrl ? (
                  <img
                    src={partner.avatarUrl}
                    alt={partner.businessName}
                    className={styles.partnerCircleImage}
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