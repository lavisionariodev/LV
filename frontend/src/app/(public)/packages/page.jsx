import Link from 'next/link'
import Image from 'next/image'
import { PACKAGES } from './data'
import styles from './packages.module.css'

export default function PackagesPage() {
  return (
    <section className={styles.packagesPage}>
      <header className={styles.hero}>
        <div className={styles.heroOverlay} />
        <div className={styles.heroInner}>
          <h1 className={styles.heroTitle}>Packages</h1>
          <p className={styles.breadcrumb}>
            <Link href="/" className={styles.crumb}>
              Home
            </Link>
            <span className={styles.slash}>/</span>
            <span className={styles.crumbActive}>Packages</span>
          </p>
        </div>
      </header>

      <div className={styles.content}>
        <div className={styles.intro}>
          <h2 className={styles.introTitle}>Choose a package</h2>
          <p className={styles.introText}>
            Our packages are designed to suit different needs and budgets. Select one to see full details and what is included.
          </p>
        </div>

        <div className={styles.grid}>
          {PACKAGES.map((pkg) => (
            <Link
              key={pkg.id}
              href={`/packages/${pkg.id}`}
              className={styles.card}
            >
              <Image
                src={pkg.image}
                alt={pkg.name}
                width={400}
                height={250}
                className={styles.cardImage}
              />
              <div className={styles.cardBody}>
                <h3 className={styles.cardTitle}>{pkg.name}</h3>
                {pkg.price && <p className={styles.cardPrice}>{pkg.price}</p>}
                <p className={styles.cardDesc}>{pkg.description}</p>
                <span className={styles.cardCta}>View details →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
