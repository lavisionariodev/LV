'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import styles from './homepage.module.css'

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
          <span className={styles.howItWorksEyebrow}>Our Process</span>
          <h2 className={styles.howItWorksTitle}>How It Works</h2>
          <p className={styles.howItWorksSubtitle}>
            From your first search to the final service, we simplify every step so you can
            focus on what matters most.
          </p>
        </div>

        <div className={styles.howItWorksGrid}>
          {STEPS.map((step, i) => (
            <div key={step.number} className={styles.howItWorksCard}>
              <div className={styles.howItWorksCardTop}>
                <span className={styles.howItWorksNumber}>{step.number}</span>
                {i < STEPS.length - 1 && (
                  <span className={styles.howItWorksConnector} aria-hidden="true" />
                )}
              </div>
              <h3 className={styles.howItWorksCardTitle}>{step.title}</h3>
              <p className={styles.howItWorksCardBody}>{step.body}</p>
            </div>
          ))}
        </div>

        <div className={styles.howItWorksCTA}>
          <Link href="/how-it-works" className={styles.howItWorksLink}>
            Learn More About Our Process
            <span className={styles.howItWorksLinkArrow}>›</span>
          </Link>
        </div>
      </div>
    </section>
  )
}

/* ---------------- PARTNER HIGHLIGHT ---------------- */
function PartnerHighlightSection() {
  const partners = [
    {
      name: 'Heritage Funeral Services',
      location: 'Quezon City',
      years: '15 years in service',
      rating: '4.9',
      services: ['Traditional Burial', 'Catholic Rites', 'Embalming'],
      specialty: 'Traditional Catholic ceremonies',
      image: 'https://i.pinimg.com/736x/6e/8b/75/6e8b7560bc2e8538768dcf04b39f76df.jpg',
    },
    {
      name: 'Metro Cremation Care',
      location: 'Makati City',
      years: '10 years in service',
      rating: '4.8',
      services: ['Cremation', 'Memorial Service', 'Urn Selection'],
      specialty: 'Modern cremation services',
      image: 'https://i.pinimg.com/736x/ec/fb/27/ecfb278d5b75bf40ca4e468f309847af.jpg',
    },
    {
      name: 'Eternal Gardens Memorial',
      location: 'Cavite',
      years: '20 years in service',
      rating: '5.0',
      services: ['Memorial Park', 'Garden Burial', 'Wake Services'],
      specialty: 'Memorial park and gardens',
      image: 'https://i.pinimg.com/1200x/84/d5/60/84d56082a8cf35ffd66ed28d57357894.jpg',
    },
  ]

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

        <div className={styles.partnerGrid}>
          {partners.map((partner, i) => (
            <div key={i} className={styles.partnerCard}>
              <div className={styles.partnerImageWrapper}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={partner.image}
                  alt={partner.name}
                  className={styles.partnerImage}
                />
                <div className={styles.partnerImageOverlay} />
                <div className={styles.partnerRatingBadge}>★ {partner.rating}</div>
              </div>

              <div className={styles.partnerContent}>
                <div className={styles.partnerMeta}>
                  <span className={styles.partnerLocation}>
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    {partner.location}
                  </span>
                  <span className={styles.partnerYears}>{partner.years}</span>
                </div>

                <h3 className={styles.partnerName}>{partner.name}</h3>
                <p className={styles.partnerSpecialty}>Specializes in {partner.specialty}</p>

                <ul className={styles.partnerServices}>
                  {partner.services.map((s, j) => (
                    <li key={j} className={styles.partnerServiceTag}>
                      {s}
                    </li>
                  ))}
                </ul>

                <Link href="/partners" className={styles.viewProviderBtn}>
                  View Profile <span aria-hidden="true">›</span>
                </Link>
              </div>
            </div>
          ))}
        </div>

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

  const slides = [
    {
      image: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&q=80',
      caption: 'Building trusted partnerships with verified funeral service providers',
    },
    {
      image: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&q=80',
      caption: 'Negotiating fair, transparent pricing for every family we serve',
    },
    {
      image: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&q=80',
      caption: 'Connecting families with the right providers across the Philippines',
    },
    {
      image: 'https://images.unsplash.com/photo-1573497491765-dccce02b29df?w=800&q=80',
      caption: 'Our team ensures every partner meets our standards of dignity and care',
    },
  ]

  const startAutoplay = () => {
    intervalRef.current = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length)
    }, 3500)
  }

  useEffect(() => {
    startAutoplay()
    return () => clearInterval(intervalRef.current)
  }, [])

  const goTo = (index) => {
    setActiveSlide(index)
    clearInterval(intervalRef.current)
    startAutoplay()
  }

  return (
    <div className={styles.partnerSlideshow}>
      <div className={styles.slideshowTrack}>
        {slides.map((slide, i) => (
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
        {slides.map((_, i) => (
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
