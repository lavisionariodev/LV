import Link from 'next/link'
import { getSiteContent } from '@/lib/siteContent/server'
import styles from './how-it-works.module.css'

export const metadata = {
  title: 'How It Works – La Visionario',
  description:
    'Learn how La Visionario helps you browse, compare, book, and get support for funeral services with trusted partners.',
}

export default async function HowItWorksPage() {
  const siteContent = await getSiteContent()

  const SECTIONS = [
    {
      id: 'step-by-step-process',
      title: 'Step-by-Step Process',
      body:
        siteContent?.howItWorks?.stepByStep ??
        'Browse, compare, book, and receive support from La Visionario and its partner providers.',
      steps: [
        'Browse our verified partner listings and service packages.',
        'Compare options and view clear inclusions and pricing.',
        'Book the service that fits your needs online.',
        'Receive ongoing support from our team and your chosen provider.',
      ],
    },
    {
      id: 'compare-packages',
      title: 'Compare Packages',
      body:
        siteContent?.howItWorks?.comparePackages ??
        'View different funeral homes, listings, and packages in one place with clear inclusions.',
      steps: [
        'Filter by location, category, and budget.',
        'See side-by-side comparisons of packages and providers.',
        'Read verified details and what’s included in each offer.',
      ],
    },
    {
      id: 'book-a-service',
      title: 'Book a Service',
      body:
        siteContent?.howItWorks?.bookAService ??
        'Book the service online, share details, and coordinate directly with our trusted partners.',
      steps: [
        'Select your preferred package and complete the booking form.',
        'Share any special requests or details with the provider.',
        'Receive confirmation and next steps from La Visionario and the partner.',
      ],
    },
    {
      id: 'payment-support',
      title: 'Payment & Support',
      body:
        siteContent?.howItWorks?.paymentSupport ??
        'Confirm payment through secure channels and receive ongoing support from our team.',
      steps: [
        'Pay through secure, verified channels as agreed with the provider.',
        'Get documentation and receipts for your records.',
        'Reach out to our support team anytime for questions or follow-up.',
      ],
    },
  ]

  return (
    <div className={styles.howItWorksPage}>
      <section className={styles.hero}>
        <div className={styles.heroOverlay} />
        <div className={styles.heroInner}>
          <h1 className={styles.heroTitle}>How It Works</h1>
          <nav className={styles.breadcrumb} aria-label="Breadcrumb">
            <Link href="/" className={styles.crumb}>
              Home
            </Link>
            <span className={styles.slash} aria-hidden="true">
              /
            </span>
            <span className={styles.crumbActive}>How It Works</span>
          </nav>
        </div>
      </section>

      <div className={styles.content}>
        {SECTIONS.map((section) => (
          <section
            key={section.id}
            id={section.id}
            className={styles.section}
          >
            <h2 className={styles.sectionTitle}>{section.title}</h2>
            <p className={styles.sectionText}>{section.body}</p>
            {section.steps?.length > 0 && (
              <ul className={styles.stepList}>
                {section.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  )
}
