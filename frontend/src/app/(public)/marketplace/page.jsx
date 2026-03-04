import Link from 'next/link'
import { MARKETPLACE_ITEMS } from './data'
import styles from './marketplace.module.css'

export default function MarketplacePage() {
  return (
    <section className={styles.marketplacePage}>
      <header className={styles.hero}>
        <div className={styles.heroOverlay} />
        <div className={styles.heroInner}>
          <h1 className={styles.heroTitle}>Marketplace</h1>
          <p className={styles.breadcrumb}>
            <Link href="/" className={styles.crumb}>
              Home
            </Link>
            <span className={styles.slash}>/</span>
            <span className={styles.crumbActive}>Marketplace</span>
          </p>
        </div>
      </header>

      <div className={styles.content}>
        <div className={styles.intro}>
          <h2 className={styles.introTitle}>Browse funeral add-ons & products</h2>
          <p className={styles.introText}>
            Discover curated products and thoughtful add-ons that complement your chosen
            service or package. Here, you&apos;ll soon be able to compare items, see
            details, and add them to your cart.
          </p>
        </div>

        <div className={styles.grid}>
          {MARKETPLACE_ITEMS.map((item) => (
            <Link
              key={item.id}
              href={`/marketplace/${item.id}`}
              className={styles.card}
            >
              <div className={styles.cardBody}>
                <span className={styles.cardCategory}>Marketplace item</span>
                <h3 className={styles.cardTitle}>{item.name}</h3>
                <p className={styles.cardDesc}>{item.description}</p>
                <div className={styles.cardMeta}>
                  {item.badge && <span className={styles.cardTag}>{item.badge}</span>}
                  <span className={styles.cardCta}>View details →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

