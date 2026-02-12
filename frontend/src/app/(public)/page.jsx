'use client'

import Link from 'next/link'
import { useState } from 'react'
import Image from 'next/image'
import styles from './homepage.module.css'

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <ShopByCategorySection />
      <PartnerHighlightSection />
      <FinalCTASection />
    </>
  )
}

/* ---------------- HERO ---------------- */
function HeroSection() {
  return (
    <section className={styles.hero}>
      <div className={styles.heroOverlay}></div>

      <div className={styles.inner}>
        <div className={styles.content}>
          <h1 className={styles.title}>
            Dignified Farewells,<br />Made Simple
          </h1>

          <p className={styles.subheading}>
            Everything you need to honor your loved one, transparent pricing,
            verified providers, and compassionate support
          </p>

          <div className={styles.ctaGroup}>
            <button className={styles.ctaPrimary}>Browse Services</button>
            <button className={styles.ctaSecondary}>Get Guidance</button>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------------- SHOP BY CATEGORY (REFERENCE IMAGE STYLE) ---------------- */
function ShopByCategorySection() {
  const [scrollPosition, setScrollPosition] = useState(0)

  const categories = [
    {
      title: 'Funeral Packages',
      image: 'https://i.pinimg.com/736x/8d/6f/3a/8d6f3a0c3e8f5b4c6d8e9f0a1b2c3d4e.jpg',
      link: '/packages',
    },
    {
      title: 'Cremation Services',
      image: 'https://i.pinimg.com/736x/a1/b2/c3/a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6.jpg',
      link: '/cremation',
    },
    {
      title: 'Burial Services',
      image: 'https://i.pinimg.com/736x/d4/e5/f6/d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9.jpg',
      link: '/burial',
    },
    {
      title: 'Memorial & Wake',
      image: 'https://i.pinimg.com/736x/c5/d6/e7/c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0.jpg',
      link: '/memorial',
    },
    {
      title: 'Flowers & Items',
      image: 'https://i.pinimg.com/736x/f8/a9/b0/f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3.jpg',
      link: '/flowers',
    },
    {
      title: 'Transport & Docs',
      image: 'https://i.pinimg.com/736x/b6/c7/d8/b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1.jpg',
      link: '/transport',
    },
  ]

  // Duplicate categories for infinite loop effect
  const loopedCategories = [...categories, ...categories, ...categories]

  const handleScroll = (direction) => {
    const container = document.getElementById('categoryCarousel')
    if (!container) return

    const scrollAmount = 350
    const newPosition = direction === 'left' 
      ? container.scrollLeft - scrollAmount 
      : container.scrollLeft + scrollAmount

    container.scrollTo({
      left: newPosition,
      behavior: 'smooth'
    })

    setScrollPosition(newPosition)
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

/* ---------------- FINAL CTA ---------------- */
function FinalCTASection() {
  return (
    <section className={styles.finalCTA}>
      <div className={styles.inner}>
        <div className={styles.ctaContent}>
          <h2 className={styles.ctaTitle}>Ready to Begin?</h2>
          <p className={styles.ctaDescription}>
            Start planning with confidence. Explore our services or speak with
            a compassionate advisor who understands what you're going through.
          </p>

          <div className={styles.ctaButtons}>
            <button className={styles.ctaPrimary}>Browse Services</button>
            <button className={styles.ctaSecondary}>Get Guidance</button>
          </div>
        </div>
      </div>
    </section>
  )
}