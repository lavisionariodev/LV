import Link from 'next/link'
import Image from 'next/image'
import { SERVICES } from './data'
import styles from './services.module.css'

export default function ServicesPage() {
  return (
    <section className={styles.servicesPage}>
      <header className={styles.hero}>
        <div className={styles.heroOverlay} />
        <div className={styles.heroInner}>
          <h1 className={styles.heroTitle}>Our Services</h1>
          <p className={styles.breadcrumb}>
            <Link href="/" className={styles.crumb}>
              Home
            </Link>
            <span className={styles.slash}>/</span>
            <span className={styles.crumbActive}>Services</span>
          </p>
        </div>
      </header>

      <div className={styles.content}>
        <div className={styles.intro}>
          <h2 className={styles.introTitle}>What we offer</h2>
          <p className={styles.introText}>
            We provide a range of funeral and memorial services to support you and your family with care and respect.
          </p>
        </div>

        <div className={styles.grid}>
          {SERVICES.map((service) => (
            <Link
              key={service.id}
              href={`/services/${service.id}`}
              className={styles.card}
            >
              <Image
                src={service.image}
                alt={service.name}
                width={400}
                height={250}
                className={styles.cardImage}
              />
              <div className={styles.cardBody}>
                <h3 className={styles.cardTitle}>{service.name}</h3>
                <p className={styles.cardDesc}>{service.description}</p>
                <span className={styles.cardCta}>View details →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
