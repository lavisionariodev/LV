'use client'

import Link from 'next/link'
import { useCallback, useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { fetchActivePartnersDirectory, formatTenureYearsShort } from '@/lib/partners/client'
import { normalizeSellerSpecialties } from '@/lib/sellers/client'
import styles from './homepage.module.css'

/** Homepage partner cards when seller has no cover or avatar */
const PARTNER_CARD_PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&q=80'

const ABOUT_PARTNERS_SLIDES = [
  {
    image:
      'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&q=80',
    caption: 'Building trusted partnerships with verified funeral service providers',
  },
  {
    image:
      'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&q=80',
    caption: 'Negotiating fair, transparent pricing for every family we serve',
  },
  {
    image:
      'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&q=80',
    caption: 'Connecting families with the right providers across the Philippines',
  },
  {
    image:
      'https://images.unsplash.com/photo-1573497491765-dccce02b29df?w=800&q=80',
    caption: 'Our team ensures every partner meets our standards of dignity and care',
  },
]

export default function LandingPage() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    const hash = window.location.hash || ''
    if (!hash) return

    const lower = hash.toLowerCase()
    const isSupabaseAuthHash =
      lower.includes('type=recovery') ||
      lower.includes('access_token') ||
      lower.includes('refresh_token')

    if (!isSupabaseAuthHash) {
      window.history.replaceState(
        null,
        '',
        window.location.pathname + window.location.search
      )
    }
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [])

  return (
    <>
      <HeroSection />
      <ShopByCategorySection />
      <HowItWorksSection />
      <PartnerHighlightSection />
      <AboutSection />
      <FinalCTASection />
    </>
  )
}

/* ---------------- HERO (static copy — not driven by CMS/site content) ---------------- */
function HeroSection() {
  return (
    <section className={styles.hero}>
      <div className={styles.heroOverlay}></div>

      <div className={styles.inner}>
        <div className={styles.content}>
          <h1 className={styles.title}>
            Dignified Farewells,
            <br />
            Made Simple
          </h1>

          <p className={styles.subheading}>
            Everything you need to honor your loved one, transparent pricing, verified
            providers, and compassionate support
          </p>

          <div className={styles.ctaGroup}>
            <Link href="/shop" className={styles.ctaPrimary}>
              Browse Services
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------------- SHOP BY CATEGORY ---------------- */
function ShopByCategorySection() {
  const categories = [
    { title: 'Funeral Packages', image: '/sample/services/1.jpg', link: '/shop' },
    { title: 'Cremation Services', image: '/sample/services/2.jpg', link: '/shop' },
    { title: 'Burial Services', image: '/sample/services/3.jpg', link: '/shop' },
    { title: 'Memorial & Wake', image: '/sample/services/4.jpg', link: '/shop' },
    { title: 'Flowers & Items', image: '/sample/services/5.jpg', link: '/shop' },
    { title: 'Transport & Docs', image: '/sample/services/6.jpg', link: '/shop' },
  ]

  const loopedCategories = [...categories, ...categories, ...categories]

  const handleScroll = (direction) => {
    const container = document.getElementById('categoryCarousel')
    if (!container) return
    const scrollAmount = 350
    const newPosition =
      direction === 'left'
        ? container.scrollLeft - scrollAmount
        : container.scrollLeft + scrollAmount
    container.scrollTo({ left: newPosition, behavior: 'smooth' })
  }

  return (
    <section className={styles.categorySection}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <h2 className={styles.sectionTitle}>Shop by Category</h2>
        </div>

        <div className={styles.categoryCarouselContainer}>
          <button
            className={`${styles.carouselArrow} ${styles.carouselArrowLeft}`}
            onClick={() => handleScroll('left')}
            aria-label="Scroll left"
          >
            ‹
          </button>

          <div className={styles.categoryGrid} id="categoryCarousel">
            {loopedCategories.map((category, index) => (
              <Link key={index} href={category.link} className={styles.categoryCard}>
                <div className={styles.categoryImageWrapper}>
                  <Image
                    src={category.image}
                    alt={category.title}
                    fill
                    className={styles.categoryImage}
                    sizes="350px"
                  />
                </div>
                <div className={styles.categoryContent}>
                  <h3 className={styles.categoryTitle}>{category.title}</h3>
                </div>
              </Link>
            ))}
          </div>

          <button
            className={`${styles.carouselArrow} ${styles.carouselArrowRight}`}
            onClick={() => handleScroll('right')}
            aria-label="Scroll right"
          >
            ›
          </button>
        </div>
      </div>
    </section>
  )
}

/* ---------------- HOW IT WORKS ---------------- */
function HowItWorksSection() {
  const STEPS = [
    {
      number: '01',
      title: 'Browse & Discover',
      icon: '🔍',
      body: 'Explore verified providers across the Philippines, filtered by location, type, or budget.',
    },
    {
      number: '02',
      title: 'Compare Packages',
      icon: '⚖️',
      body: 'View packages side by side — pricing, inclusions, and details, with no hidden surprises.',
    },
    {
      number: '03',
      title: 'Book a Service',
      icon: '📋',
      body: 'Reserve securely online. We coordinate directly with your chosen provider for a smooth handover.',
    },
    {
      number: '04',
      title: 'Ongoing Support',
      icon: '🤝',
      body: "Our team stays with you before, during, and after — because care doesn't end at booking.",
    },
  ]

  return (
    <section className={styles.howItWorksSection}>
      <div className={styles.inner}>
        <div className={styles.howItWorksHeader}>
          <h2 className={styles.howItWorksTitle}>How It Works</h2>
        </div>

        <div className={styles.howItWorksTimeline}>
          {STEPS.map((step, i) => (
            <div key={step.number} className={styles.howItWorksStep}>
              <div className={styles.howItWorksStepNum}>{step.number}</div>
              <div className={styles.howItWorksDotRow}>
                <div className={styles.howItWorksDot} />
                {i < STEPS.length - 1 && <div className={styles.howItWorksLine} />}
              </div>
              <h3 className={styles.howItWorksCardTitle}>{step.title}</h3>
              <p className={styles.howItWorksCardBody}>{step.body}</p>
            </div>
          ))}
        </div>

        <div className={styles.howItWorksCTA}>
          <Link href="/how-it-works" className={styles.howItWorksBtn}>
            Learn How It Works
            <span className={styles.howItWorksBtnArrow}>›</span>
          </Link>
        </div>
      </div>
    </section>
  )
}

/* ---------------- PARTNER HIGHLIGHT ---------------- */
function mapDirectoryRowToCarouselPartner(row) {
  const cardImage =
    (row.coverPhotoUrl && String(row.coverPhotoUrl).trim()) ||
    (row.avatarUrl && String(row.avatarUrl).trim()) ||
    PARTNER_CARD_PLACEHOLDER_IMAGE
  const yearsShort =
    formatTenureYearsShort(row.businessStartedAt) ||
    formatTenureYearsShort(row.registeredAt) ||
    ''
  const ratingLabel =
    row.avgRating != null && Number.isFinite(Number(row.avgRating))
      ? Number(row.avgRating).toFixed(1)
      : null
  const specialtyTags = normalizeSellerSpecialties(row.specialties ?? []).slice(0, 3)
  return {
    sellerUserId: row.sellerUserId,
    name: row.businessName,
    location: row.address?.trim() ? row.address : '—',
    years: yearsShort || '—',
    ratingLabel,
    specialtyTags,
    businessTypeLabel: row.businessTypeLabel?.trim() || '',
    image: cardImage,
  }
}

function PartnerHighlightSection() {
  const [partners, setPartners] = useState([])
  const [loadState, setLoadState] = useState('loading')
  const [loadError, setLoadError] = useState(null)
  const [active, setActive] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetchActivePartnersDirectory({ bustCache: true })
      .then((rows) => {
        if (cancelled) return
        setLoadError(null)
        setPartners(rows)
        setActive(rows.length >= 2 ? 1 : 0)
        setLoadState('ready')
      })
      .catch((err) => {
        if (!cancelled) {
          setPartners([])
          setLoadError(typeof err?.message === 'string' ? err.message : 'Failed to load partners.')
          setLoadState('error')
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const carouselPartners = partners.map(mapDirectoryRowToCarouselPartner)
  const N = carouselPartners.length

  const prev = () => {
    if (N < 1) return
    setActive((i) => (i - 1 + N) % N)
  }
  const next = () => {
    if (N < 1) return
    setActive((i) => (i + 1) % N)
  }

  const goToPartner = (index) => {
    if (N < 1) return
    setActive(index)
  }

  const slotIndex = (offset) => (active + offset + N) % N
  const slots = [-1, 0, 1]

  return (
    <section className={styles.partnerSection}>
      <div className={styles.inner}>

        <div className={styles.partnerHeader}>
          <span className={styles.partnerEyebrow}>Verified Providers</span>
          <h2 className={styles.partnerSectionTitle}>Funeral Homes &amp; Partnerships</h2>
          <p className={styles.partnerSectionSubtitle}>
            Every provider on our platform is personally vetted for quality, transparency, and
            compassionate service.
          </p>
        </div>

        {loadState === 'loading' && (
          <p className={styles.partnerSectionSubtitle} role="status">
            Loading partners…
          </p>
        )}
        {loadState === 'error' && (
          <div role="alert">
            <p className={styles.partnerSectionSubtitle}>
              We couldn&apos;t load partner highlights. Please try again later.
            </p>
            {loadError ? (
              <p className={styles.partnerSectionSubtitle}>{loadError}</p>
            ) : null}
          </div>
        )}
        {loadState === 'ready' && N === 0 && (
          <p className={styles.partnerSectionSubtitle} role="status">
            No partners to show yet.
          </p>
        )}

        {loadState === 'ready' && N > 0 && (
          <>
            <div className={styles.partnerCarouselRow}>
              <button type="button" onClick={prev} aria-label="Previous partner" className={styles.partnerArrowBtn}>‹</button>

              <div className={styles.partnerCarouselStage}>
                {slots.map((offset) => {
                  const p = carouselPartners[slotIndex(offset)]
                  const isCenter = offset === 0
                  const idx = slotIndex(offset)
                  return (
                    <div
                      key={idx}
                      className={`${styles.partnerCarouselItem} ${isCenter ? styles.partnerCarouselItemCenter : styles.partnerCarouselItemSide}`}
                      onClick={() => {
                        if (!isCenter) goToPartner(idx)
                      }}
                    >
                      <div className={styles.partnerImageWrapper}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.image}
                          alt={p.name}
                          className={styles.partnerImage}
                        />
                        <div className={styles.partnerImageOverlay} />
                        {p.ratingLabel != null ? (
                          <div className={styles.partnerRatingBadge}>★ {p.ratingLabel}</div>
                        ) : null}
                      </div>

                      <div className={styles.partnerContent}>
                        <div className={styles.partnerMeta}>
                          <span className={styles.partnerLocation}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                              <circle cx="12" cy="10" r="3" />
                            </svg>
                            {p.location}
                          </span>
                          <span className={styles.partnerYears}>{p.years}</span>
                        </div>

                        <h3 className={styles.partnerName}>{p.name}</h3>
                        <p className={styles.partnerSpecialty}>
                          {p.businessTypeLabel || '—'}
                        </p>

                        {isCenter && (
                          <>
                            {p.specialtyTags.length > 0 ? (
                              <ul className={styles.partnerServices}>
                                {p.specialtyTags.map((s, j) => (
                                  <li key={`${p.sellerUserId}-tag-${j}`} className={styles.partnerServiceTag}>{s}</li>
                                ))}
                              </ul>
                            ) : null}
                            <Link
                              href={`/seller-profile?seller=${encodeURIComponent(p.sellerUserId)}`}
                              className={styles.viewProviderBtn}
                            >
                              View Profile <span>›</span>
                            </Link>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              <button type="button" onClick={next} aria-label="Next partner" className={styles.partnerArrowBtn}>›</button>
            </div>

            <div className={styles.partnerDots}>
              {carouselPartners.map((p, i) => (
                <button
                  key={p.sellerUserId}
                  type="button"
                  onClick={() => goToPartner(i)}
                  aria-label={`Go to ${p.name}`}
                  className={`${styles.partnerDot} ${i === active ? styles.partnerDotActive : ''}`}
                />
              ))}
            </div>
          </>
        )}

        <div className={styles.partnerCTA}>
          <p className={styles.partnerCTAText}>
            Browse our full network of verified funeral homes across the Philippines.
          </p>
          <Link href="/partners" className={styles.partnerCTABtn}>
            View All Funeral Homes &amp; Partners
            <span className={styles.partnerCTAArrow}>›</span>
          </Link>
        </div>

      </div>
    </section>
  )
}

/* ---------------- ABOUT ---------------- */
function PartnershipSlideshow() {
  const [activeSlide, setActiveSlide] = useState(0)
  const intervalRef = useRef(null)

  const startAutoplay = useCallback(() => {
    intervalRef.current = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % ABOUT_PARTNERS_SLIDES.length)
    }, 3500)
  }, [setActiveSlide])

  useEffect(() => {
    startAutoplay()
    return () => clearInterval(intervalRef.current)
  }, [startAutoplay])

  const goTo = (index) => {
    setActiveSlide(index)
    clearInterval(intervalRef.current)
    startAutoplay()
  }

  return (
    <div className={styles.partnerSlideshow}>
      <div className={styles.slideshowTrack}>
        {ABOUT_PARTNERS_SLIDES.map((slide, i) => (
          <div
            key={i}
            className={`${styles.slide} ${i === activeSlide ? styles.slideActive : ''}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={slide.image} alt={slide.caption} className={styles.slideImage} />
            <div className={styles.slideCaption}>
              <p>{slide.caption}</p>
            </div>
          </div>
        ))}
      </div>
      <div className={styles.slideshowDots}>
        {ABOUT_PARTNERS_SLIDES.map((_, i) => (
          <button
            key={i}
            className={`${styles.slideDot} ${i === activeSlide ? styles.slideDotActive : ''}`}
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}`}
            type="button"
          />
        ))}
      </div>
    </div>
  )
}

function AboutSection() {
  const WHY_CARDS = [
    {
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
      title: 'Why La Visionario',
      body: 'We offer verified providers, clear pricing, and compassionate support so you can focus on honoring your loved one. From packages to documentation, we guide you every step of the way.',
    },
    {
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
      title: 'Our Partners',
      body: 'We work with trusted funeral homes and service providers across the Philippines. Our partners share our commitment to dignity, quality, and fair dealing with families.',
    },
    {
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      ),
      title: 'Our Commitment',
      body: 'We are committed to treating every family with respect and empathy. From your first inquiry to the final arrangements, we prioritize clarity, fairness, and support.',
    },
  ]

  return (
    <section className={styles.aboutSection}>
      <div className={styles.inner}>
        <div className={styles.aboutIntroGrid}>
          <div className={styles.aboutIntroLeft}>
            <span className={styles.aboutEyebrow}>About Us</span>
            <h2 className={styles.aboutTitle}>
              Serving Families
              <br />
              <em>with Dignity</em>
            </h2>
            <p className={styles.aboutBody}>
              La Visionario was created to help families plan funeral services in a simple,
              respectful, and transparent way. We believe that saying goodbye should not be
              stressful or confusing.
            </p>
            <p className={styles.aboutBody}>
              Our mission is to make funeral planning dignified, transparent, and accessible
              for every Filipino family — supported by clarity, care, and trusted partners.
            </p>
            <Link href="/about" className={styles.aboutLink}>
              Our Full Story
              <span className={styles.aboutLinkArrow}>›</span>
            </Link>
          </div>

          <div className={styles.aboutIntroRight}>
            <PartnershipSlideshow />
          </div>
        </div>

        <div className={styles.aboutWhyGrid}>
          {WHY_CARDS.map((card, i) => (
            <div key={i} className={styles.aboutWhyCard}>
              <div className={styles.aboutWhyIcon}>{card.icon}</div>
              <h3 className={styles.aboutWhyTitle}>{card.title}</h3>
              <p className={styles.aboutWhyBody}>{card.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------------- FINAL CTA ---------------- */
const LA_VISIONARIO_FB_URL = 'https://www.facebook.com/profile.php?id=61556533022289'

function FinalCTASection() {
  return (
    <section className={styles.finalCTA}>
      <div className={styles.inner}>
        <div className={styles.ctaContent}>
          <h2 className={styles.ctaTitle}>Ready to Begin?</h2>
          <p className={styles.ctaDescription}>
            Start planning with confidence. Reach out to a compassionate advisor who
            understands what you&apos;re going through.
          </p>
          <div className={styles.ctaButtons}>
            <a
              href={LA_VISIONARIO_FB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.ctaPrimary}
            >
              Need Assistance?
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}