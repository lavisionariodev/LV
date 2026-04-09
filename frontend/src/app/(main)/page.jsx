'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import styles from './homepage.module.css'
import { useSiteContent } from '@/lib/siteContent/client'

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

/* ---------------- HERO ---------------- */
function HeroSection() {
  const { data: siteContent } = useSiteContent()
  const hero = siteContent?.hero

  return (
    <section className={styles.hero}>
      <div className={styles.heroOverlay}></div>

      <div className={styles.inner}>
        <div className={styles.content}>
          <h1 className={styles.title}>
            {hero?.title || (
              <>
                Dignified Farewells,<br />
                Made Simple
              </>
            )}
          </h1>

          <p className={styles.subheading}>
            {hero?.subheading ||
              'Everything you need to honor your loved one, transparent pricing, verified providers, and compassionate support'}
          </p>

          <div className={styles.ctaGroup}>
            <Link href="/shop" className={styles.ctaPrimary}>
              {hero?.primaryCta || 'Browse Services'}
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
    { title: 'Funeral Packages',    image: '/sample/services/1.jpg', link: '/shop' },
    { title: 'Cremation Services',  image: '/sample/services/2.jpg', link: '/shop' },
    { title: 'Burial Services',     image: '/sample/services/3.jpg', link: '/shop' },
    { title: 'Memorial & Wake',     image: '/sample/services/4.jpg', link: '/shop' },
    { title: 'Flowers & Items',     image: '/sample/services/5.jpg', link: '/shop' },
    { title: 'Transport & Docs',    image: '/sample/services/6.jpg', link: '/shop' },
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
      lead: 'Find the right service for your loved one',
      body: 'Explore our curated directory of verified funeral service providers across the Philippines. Filter by location, service type, or budget to find providers that match your needs.',
    },
    {
      number: '02',
      title: 'Compare Packages',
      lead: 'Make informed decisions with full transparency',
      body: 'Compare funeral homes, cremation services, memorial packages, and more — side by side with full transparency on what\'s included, so there are no surprises.',
    },
    {
      number: '03',
      title: 'Book a Service',
      lead: 'Reserve with confidence, fully guided',
      body: 'Once you\'ve chosen a provider and package, booking is simple and secure. Our team coordinates directly with your chosen partner to ensure a smooth handover.',
    },
    {
      number: '04',
      title: 'Ongoing Support',
      lead: 'Secure, transparent, and always available',
      body: 'All payments go through secure, verified channels. Our support team remains available before, during, and after the service — because our commitment doesn\'t end at booking.',
    },
  ]

  return (
    <section className={styles.howItWorksSection}>
      <div className={styles.inner}>

        {/* Section header */}
        <div className={styles.howItWorksHeader}>
          <span className={styles.howItWorksEyebrow}>Our Process</span>
          <h2 className={styles.howItWorksTitle}>How It Works</h2>
          <p className={styles.howItWorksSubtitle}>
            From your first search to the final service, we simplify every step
            so you can focus on what matters most.
          </p>
        </div>

        {/* Steps grid */}
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
              <p className={styles.howItWorksCardLead}>{step.lead}</p>
              <p className={styles.howItWorksCardBody}>{step.body}</p>
            </div>
          ))}
        </div>

        {/* CTA link */}
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
  const [activeIndex, setActiveIndex] = useState(0)

  const partners = [
    {
      name: 'Heritage Funeral Services',
      location: 'Quezon City',
      years: '15 years in service',
      rating: '4.9',
      specialty: 'Traditional Catholic ceremonies',
      image: 'https://i.pinimg.com/736x/6e/8b/75/6e8b7560bc2e8538768dcf04b39f76df.jpg',
    },
    {
      name: 'Metro Cremation Care',
      location: 'Makati City',
      years: '10 years in service',
      rating: '4.8',
      specialty: 'Modern cremation services',
      image: 'https://i.pinimg.com/736x/ec/fb/27/ecfb278d5b75bf40ca4e468f309847af.jpg',
    },
    {
      name: 'Eternal Gardens Memorial',
      location: 'Cavite',
      years: '20 years in service',
      rating: '5.0',
      specialty: 'Memorial park and gardens',
      image: 'https://i.pinimg.com/1200x/84/d5/60/84d56082a8cf35ffd66ed28d57357894.jpg',
    },
  ]

  return (
    <section className={styles.partnerSection}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <h2 className={styles.sectionTitle}>Our Partner Providers</h2>
        </div>

        <div className={styles.partnerCarousel}>
          <div className={styles.partnerCard}>
            <div className={styles.partnerImageWrapper}>
              <Image
                src={partners[activeIndex].image}
                alt={partners[activeIndex].name}
                fill
                className={styles.partnerImage}
              />
            </div>

            <div className={styles.partnerContent}>
              <h3 className={styles.partnerName}>{partners[activeIndex].name}</h3>
              <p className={styles.partnerLocation}>{partners[activeIndex].location}</p>
              <p className={styles.partnerYears}>{partners[activeIndex].years}</p>
              <div className={styles.partnerRating}>
                ★ {partners[activeIndex].rating} rating
              </div>
              <p className={styles.partnerSpecialty}>
                Specializes in {partners[activeIndex].specialty}
              </p>
              <button className={styles.viewProviderBtn}>View Provider</button>
            </div>
          </div>

          <div className={styles.carouselDots}>
            {partners.map((_, index) => (
              <button
                key={index}
                className={`${styles.dot} ${activeIndex === index ? styles.activeDot : ''}`}
                onClick={() => setActiveIndex(index)}
                aria-label={`View partner ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------------- ABOUT ---------------- */
function AboutSection() {
  const WHY_CARDS = [
    {
      icon: '🛡',
      title: 'Why La Visionario',
      body: 'We offer verified providers, clear pricing, and compassionate support so you can focus on honoring your loved one. From packages to documentation, we guide you every step of the way.',
    },
    {
      icon: '🤝',
      title: 'Our Partners',
      body: 'We work with trusted funeral homes and service providers across the Philippines. Our partners share our commitment to dignity, quality, and fair dealing with families.',
    },
    {
      icon: '♡',
      title: 'Our Commitment',
      body: 'We are committed to treating every family with respect and empathy. From your first inquiry to the final arrangements, we prioritize clarity, fairness, and support.',
    },
  ]

  return (
    <section className={styles.aboutSection}>
      <div className={styles.inner}>

        {/* Top: two-column intro */}
        <div className={styles.aboutIntroGrid}>
          <div className={styles.aboutIntroLeft}>
            <span className={styles.aboutEyebrow}>About Us</span>
            <h2 className={styles.aboutTitle}>
              Serving Families<br />
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
            {/* Trust pillars */}
            <div className={styles.aboutTrustGrid}>
              {[
                { label: 'Verified Providers',    desc: 'Every partner is reviewed and authenticated before listing.' },
                { label: 'Transparent Pricing',   desc: 'No hidden fees. All inclusions stated clearly upfront.' },
                { label: 'Compassionate Support', desc: 'Our team is reachable before, during, and after your service.' },
                { label: 'Secure Transactions',   desc: 'All payments processed through verified, documented channels.' },
              ].map((item, i) => (
                <div key={i} className={styles.aboutTrustItem}>
                  <h4 className={styles.aboutTrustLabel}>{item.label}</h4>
                  <p className={styles.aboutTrustDesc}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom: why-choose-us cards */}
        <div className={styles.aboutWhyGrid}>
          {WHY_CARDS.map((card, i) => (
            <div key={i} className={styles.aboutWhyCard}>
              <span className={styles.aboutWhyIcon}>{card.icon}</span>
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
            Start planning with confidence. Reach out to a compassionate advisor
            who understands what you&apos;re going through.
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