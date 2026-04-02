'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import styles from './how-it-works.module.css'

export default function HowItWorksPage() {
  const [activeStep, setActiveStep] = useState(0)
  const stepRefs = useRef([])

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [])

  useEffect(() => {
    const observers = stepRefs.current.map((ref, i) => {
      if (!ref) return null
      const observer = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveStep(i) },
        { threshold: 0.5 }
      )
      observer.observe(ref)
      return observer
    })
    return () => observers.forEach(o => o?.disconnect())
  }, [])

  const STEPS = [
    {
      id: 'browse-and-discover',
      number: '01',
      title: 'Browse & Discover',
      lead: 'Find the right service for your loved one',
      body: 'Explore our curated directory of verified funeral service providers across the Philippines. Filter by location, service type, or budget to find providers that match your needs — all in one compassionate, easy-to-navigate platform.',
      steps: [
        'Browse verified partner listings and service packages.',
        'Filter by location, category, and budget.',
        'View clear service inclusions, pricing, and provider backgrounds.',
        'Read provider profiles and their areas of specialization.',
      ],
    },
    {
      id: 'compare-packages',
      number: '02',
      title: 'Compare Packages',
      lead: 'Make informed decisions with full transparency',
      body: "We believe every family deserves clarity during difficult times. Compare funeral homes, cremation services, memorial packages, and more — side by side with full transparency on what's included, so there are no surprises.",
      steps: [
        'View side-by-side comparisons of packages and providers.',
        'See detailed breakdowns of every inclusion.',
        'Identify which package best fits your budget and cultural or religious preferences.',
        'Save or shortlist options to revisit later.',
      ],
    },
    {
      id: 'book-a-service',
      number: '03',
      title: 'Book a Service',
      lead: 'Reserve with confidence, fully guided',
      body: "Once you've chosen a provider and package, booking is simple and secure. Our team coordinates directly with your chosen partner to ensure a smooth handover, so you can focus on what truly matters — being with family.",
      steps: [
        'Select your preferred package and complete the booking form.',
        'Share any special requests, cultural, or religious considerations.',
        'Receive confirmation and a clear timeline of next steps.',
        'Direct coordination between La Visionario and your chosen provider begins immediately.',
      ],
    },
    {
      id: 'payment-support',
      number: '04',
      title: 'Payment & Ongoing Support',
      lead: 'Secure, transparent, and always available',
      body: "All payments go through secure, verified channels with full documentation provided. Our support team remains available before, during, and after the service — because our commitment to your family doesn't end at booking.",
      steps: [
        'Pay through secure, verified channels as agreed with your provider.',
        'Receive documentation and receipts for all transactions.',
        'Access our support team anytime for questions or follow-up assistance.',
        'Post-service guidance available for additional needs like legal documents or memorial keepsakes.',
      ],
    },
  ]

  return (
    <div className={styles.page}>

      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.heroOverlay} />
        <div className={styles.heroInner}>
          <p className={styles.heroEyebrow}>La Visionario</p>
          <h1 className={styles.heroTitle}>How It Works</h1>
          <nav className={styles.breadcrumb} aria-label="Breadcrumb">
            <Link href="/" className={styles.crumb}>Home</Link>
            <span className={styles.slash} aria-hidden="true">/</span>
            <span className={styles.crumbActive}>How It Works</span>
          </nav>
        </div>
      </section>

      {/* INTRO */}
      <section className={styles.introSection}>
        <div className={styles.inner}>
          <div className={styles.introGrid}>
            <div className={styles.introLeft}>
              <span className={styles.overline}>Our Process</span>
              <h2 className={styles.introTitle}>
                We simplify every step so you can focus on what matters most
              </h2>
            </div>
            <div className={styles.introRight}>
              <p className={styles.introText}>
                Planning a farewell for a loved one is one of the most difficult things a family
                can do. La Visionario was built to remove uncertainty from that process — offering
                a single, transparent platform where you can find trusted providers, compare
                services honestly, and book with full confidence.
              </p>
              <p className={styles.introText}>
                From your first search to the final service, our team is with you at every step.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PROCESS — STICKY STEPS */}
      <section className={styles.processSection}>
        <div className={styles.inner}>

          {/* Mobile: stacked cards */}
          <div className={styles.mobileSteps}>
            {STEPS.map((step, i) => (
              <div key={step.id} className={styles.mobileStepCard}>
                <div className={styles.mobileStepHeader}>
                  <span className={styles.mobileStepNumber}>{step.number}</span>
                </div>
                <h3 className={styles.mobileStepTitle}>{step.title}</h3>
                <p className={styles.mobileStepLead}>{step.lead}</p>
                <p className={styles.mobileStepBody}>{step.body}</p>
                <ul className={styles.mobileStepList}>
                  {step.steps.map((s, j) => (
                    <li key={j} className={styles.mobileStepItem}>
                      <span className={styles.bullet}>—</span>
                      {s}
                    </li>
                  ))}
                </ul>
                {i < STEPS.length - 1 && <div className={styles.mobileConnector} />}
              </div>
            ))}
          </div>

          {/* Desktop: sticky layout */}
          <div className={styles.desktopSteps}>
            <div className={styles.stepsSidebar}>
              <div className={styles.sidebarTrack}>
                {STEPS.map((step, i) => (
                  <a
                    key={step.id}
                    href={`#${step.id}`}
                    className={`${styles.sidebarItem} ${activeStep === i ? styles.sidebarItemActive : ''}`}
                    onClick={(e) => {
                      e.preventDefault()
                      stepRefs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }}
                  >
                    <span className={styles.sidebarNumber}>{step.number}</span>
                    <span className={styles.sidebarLabel}>{step.title}</span>
                    <span className={styles.sidebarArrow}>›</span>
                  </a>
                ))}
              </div>
            </div>

            <div className={styles.stepsContent}>
              {STEPS.map((step, i) => (
                <div
                  key={step.id}
                  id={step.id}
                  ref={el => stepRefs.current[i] = el}
                  className={styles.stepBlock}
                >
                  <div className={styles.stepBlockInner}>
                    <div className={styles.stepMeta}>
                      <span className={styles.stepNumber}>{step.number}</span>
                    </div>
                    <h3 className={styles.stepTitle}>{step.title}</h3>
                    <p className={styles.stepLead}>{step.lead}</p>
                    <p className={styles.stepBody}>{step.body}</p>
                    <ul className={styles.stepList}>
                      {step.steps.map((s, j) => (
                        <li key={j} className={styles.stepItem}>
                          <span className={styles.stepItemDash}>—</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* TRUST STRIP */}
      <section className={styles.trustSection}>
        <div className={styles.inner}>
          <div className={styles.trustGrid}>
            {[
              { label: 'Verified Providers', desc: 'Every partner is reviewed and authenticated before listing.' },
              { label: 'Transparent Pricing', desc: 'No hidden fees. All inclusions stated clearly upfront.' },
              { label: 'Compassionate Support', desc: 'Our team is reachable before, during, and after your service.' },
              { label: 'Secure Transactions', desc: 'All payments processed through verified, documented channels.' },
            ].map((item, i) => (
              <div key={i} className={styles.trustItem}>
                <h4 className={styles.trustLabel}>{item.label}</h4>
                <p className={styles.trustDesc}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className={styles.finalCTA}>
        <div className={styles.finalOverlay} />
        <div className={styles.inner}>
          <div className={styles.ctaContent}>
            <h2 className={styles.ctaTitle}>Ready to Begin?</h2>
            <p className={styles.ctaDescription}>
              Start with browsing our services, or reach out to a compassionate advisor
              who understands what you&apos;re going through.
            </p>
            <div className={styles.ctaButtons}>
              <Link href="/shop" className={styles.ctaPrimary}>Browse Services</Link>
              <a
                href="https://www.facebook.com/LaVisionario"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.ctaSecondary}
              >
                Need Assistance?
              </a>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}