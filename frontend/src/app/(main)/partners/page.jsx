'use client'

import Link from 'next/link'
import { useState } from 'react'
import Image from 'next/image'
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
function AllPartnersSection() {
  const [filter, setFilter] = useState('All')

  const categories = ['All', 'Funeral', 'Cremation', 'Chapels', 'Florals', 'Transport', 'Products']

  const partners = [
    {
      name: 'Serenity Memorial Services',
      description: 'Providing complete funeral arrangements with compassion and care.',
      category: 'Funeral',
      image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=200&h=200&fit=crop&auto=format',
      tag: 'Full Service',
    },
    {
      name: 'Eternal Peace Chapels',
      description: 'Modern chapel spaces designed for peaceful and respectful services.',
      category: 'Chapels',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&auto=format',
      tag: 'Facilities',
    },
    {
      name: 'Golden Life Caskets',
      description: 'High-quality and customizable caskets crafted with dignity.',
      category: 'Products',
      image: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=200&h=200&fit=crop&auto=format',
      tag: 'Products',
    },
    {
      name: 'Divine Flower Arrangements',
      description: 'Elegant floral setups for memorials and funeral services.',
      category: 'Florals',
      image: 'https://images.unsplash.com/photo-1490750967868-88df5691cc9a?w=200&h=200&fit=crop&auto=format',
      tag: 'Florals',
    },
    {
      name: 'Guardian Cremation Services',
      description: 'Affordable and respectful cremation service providers.',
      category: 'Cremation',
      image: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=200&h=200&fit=crop&auto=format',
      tag: 'Cremation',
    },
    {
      name: 'Heavenly Transport Services',
      description: 'Reliable funeral transport and logistics solutions.',
      category: 'Transport',
      image: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=200&h=200&fit=crop&auto=format',
      tag: 'Transport',
    },
    {
      name: 'Sacred Grounds Memorial Park',
      description: 'Beautifully maintained memorial parks for peaceful eternal rest.',
      category: 'Funeral',
      image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&h=200&fit=crop&auto=format',
      tag: 'Memorial Park',
    },
    {
      name: 'Pure Lily Florals',
      description: 'Handcrafted funeral wreaths and sympathy arrangements.',
      category: 'Florals',
      image: 'https://images.unsplash.com/photo-1487530811015-780f37cbe7a7?w=200&h=200&fit=crop&auto=format',
      tag: 'Florals',
    },
    {
      name: 'Dove Cremation & Urns',
      description: 'Dignified cremation services with custom urn selection.',
      category: 'Cremation',
      image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=200&h=200&fit=crop&auto=format',
      tag: 'Cremation',
    },
  ]

  const filtered = filter === 'All' ? partners : partners.filter(p => p.category === filter)

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

        {/* Filter Tabs */}
        <div className={styles.filterBar}>
          {categories.map(cat => (
            <button
              key={cat}
              className={`${styles.filterBtn} ${filter === cat ? styles.filterBtnActive : ''}`}
              onClick={() => setFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Partner Cards Grid */}
        <div className={styles.partnersGrid}>
          {filtered.map((partner, i) => (
            <div key={i} className={styles.partnerCard}>
              <div className={styles.partnerImageWrap}>
                <img
                  src={partner.image}
                  alt={partner.name}
                  className={styles.partnerCircleImage}
                />
              </div>
              <div className={styles.partnerCardBody}>
                <span className={styles.partnerTag}>{partner.tag}</span>
                <h3 className={styles.partnerName}>{partner.name}</h3>
                <p className={styles.partnerDesc}>{partner.description}</p>
              </div>
              <div className={styles.partnerCardFooter}>
                <button className={styles.partnerViewBtn}>View Partner</button>
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
            <button className={styles.ctaPrimary}>Apply as Seller</button>
            <button className={styles.ctaSecondary}>Become a Service Provider</button>
          </div>
        </div>
      </div>
    </section>
  )
}