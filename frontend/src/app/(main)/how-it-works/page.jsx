import Link from 'next/link'
import styles from './how-it-works.module.css'

export default function HowItWorksPage() {
  return (
    <section className={styles.howItWorksPage}>
      <header className={styles.hero}>
        <div className={styles.heroOverlay} />
        <div className={styles.heroInner}>
          <h1 className={styles.heroTitle}>How It Works</h1>
          <p className={styles.breadcrumb}>
            <Link href="/" className={styles.crumb}>
              Home
            </Link>
            <span className={styles.slash}>/</span>
            <span className={styles.crumbActive}>How It Works</span>
          </p>
        </div>
      </header>

      <div className={styles.content}>
        <section id="step-by-step-process" className={styles.section}>
          <h2 className={styles.sectionTitle}>Step-by-Step Process</h2>
          <p className={styles.sectionText}>
            La Visionario guides families through funeral planning in a way that
            is simple, transparent, and respectful. From browsing options to
            final support, everything is organized so you always know what comes
            next.
          </p>
          <ol className={styles.stepList}>
            <li>Browse services, packages, and marketplace products that fit your family&apos;s needs.</li>
            <li>Compare options side by side to see inclusions, pricing, and partner details clearly.</li>
            <li>Book the service or package that feels right, sharing key details with our partner.</li>
            <li>Confirm payment and receive ongoing support so you can focus on honoring your loved one.</li>
          </ol>
        </section>

        <section id="compare-packages" className={styles.section}>
          <h2 className={styles.sectionTitle}>Compare Packages</h2>
          <p className={styles.sectionText}>
            On La Visionario, you can view different funeral homes, service
            listings, and packages in one place. Each option clearly shows what
            is included, helping you avoid hidden costs and last-minute
            surprises.
          </p>
          <p className={styles.sectionText}>
            Use the platform to compare inclusions such as viewing, transport,
            flowers, documentation assistance, and other important details. This
            makes it easier to choose a package that matches your family&apos;s
            preferences, traditions, and budget.
          </p>
        </section>

        <section id="book-a-service" className={styles.section}>
          <h2 className={styles.sectionTitle}>Book a Service</h2>
          <p className={styles.sectionText}>
            Once you have chosen a package or service, you can start booking
            directly through La Visionario. You&apos;ll share key information
            such as preferred dates, location, and any special requests so our
            partner can prepare accordingly.
          </p>
          <p className={styles.sectionText}>
            After submitting your booking, you&apos;ll receive a confirmation
            summary. Our partner or support team may reach out to clarify
            details and ensure that everything is aligned with your expectations
            and your family&apos;s needs.
          </p>
        </section>

        <section id="payment-support" className={styles.section}>
          <h2 className={styles.sectionTitle}>Payment &amp; Support</h2>
          <p className={styles.sectionText}>
            Payment details are presented clearly so you know when and how to
            pay—whether online, at the funeral home, or through other available
            methods. We aim to keep pricing transparent and aligned with what
            was shown on the platform.
          </p>
          <p className={styles.sectionText}>
            If you have questions before, during, or after booking, you can
            reach out through our support channels or coordinate directly with
            the partner funeral home. La Visionario is here to help make each
            step of the process calmer and more manageable for your family.
          </p>
        </section>
      </div>
    </section>
  )
}

