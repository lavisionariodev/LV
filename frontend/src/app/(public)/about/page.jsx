import Link from 'next/link'
import styles from './about.module.css'

export default function AboutPage() {
  return (
    <section className={styles.aboutPage}>
      <header className={styles.hero}>
        <div className={styles.heroOverlay} />
        <div className={styles.heroInner}>
          <h1 className={styles.heroTitle}>About La Visionario</h1>
          <p className={styles.breadcrumb}>
            <Link href="/" className={styles.crumb}>
              Home
            </Link>
            <span className={styles.slash}>/</span>
            <span className={styles.crumbActive}>About</span>
          </p>
        </div>
      </header>

      <div className={styles.content}>
        <section id="our-story" className={styles.section}>
          <h2 className={styles.sectionTitle}>Our Story</h2>
          <p className={styles.sectionText}>
            La Visionario was created to help families plan funeral services in a
            simple, respectful, and transparent way. We believe that saying
            goodbye should not be stressful or confusing.
          </p>
          <p className={styles.sectionText}>
            Our goal is to combine tradition and technology—offering clear
            packages, trusted services, and peace of mind during difficult
            moments.
          </p>
        </section>

        <section id="mission-vision" className={styles.section}>
          <h2 className={styles.sectionTitle}>Mission & Vision</h2>
          <p className={styles.sectionText}>
            Our mission is to make funeral planning dignified, transparent, and
            accessible for every Filipino family. We envision a future where
            saying farewell is supported by clarity, care, and trusted partners.
          </p>
        </section>

        <section id="why-la-visionario" className={styles.section}>
          <h2 className={styles.sectionTitle}>Why La Visionario</h2>
          <p className={styles.sectionText}>
            We offer verified providers, clear pricing, and compassionate
            support so you can focus on honoring your loved one. From packages
            to documentation, we guide you through each step with respect and
            transparency.
          </p>
        </section>

        <section id="partners" className={styles.section}>
          <h2 className={styles.sectionTitle}>Partners</h2>
          <p className={styles.sectionText}>
            We work with trusted funeral homes and service providers across the
            Philippines. Our partners share our commitment to dignity, quality,
            and fair dealing with families.
          </p>
        </section>

        <section id="testimonials" className={styles.section}>
          <h2 className={styles.sectionTitle}>Testimonials</h2>
          <p className={styles.sectionText}>
            Families who have used La Visionario appreciate the ease of
            comparison, transparent pricing, and the support they received
            during a difficult time. We are honored to help.
          </p>
        </section>
      </div>
    </section>
  )
}
