import Link from 'next/link'
import Image from 'next/image'
import { getMarketplaceItemById } from '../data'
import styles from './detail.module.css'

export default async function MarketplaceItemDetailPage({ params }) {
  const { id } = await params
  const item = getMarketplaceItemById(id)

  if (!item) {
    return (
      <section className={styles.detailPage}>
        <div className={styles.content}>
          <div className={styles.notFound}>
            <h1 className={styles.notFoundTitle}>Item not found</h1>
            <p className={styles.notFoundText}>
              The marketplace item you are looking for does not exist or has been removed.
            </p>
            <Link href="/marketplace" className={styles.notFoundLink}>
              ← Back to Marketplace
            </Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className={styles.detailPage}>
      <header className={styles.hero}>
        <div className={styles.heroOverlay} />
        <div className={styles.heroInner}>
          <h1 className={styles.heroTitle}>{item.name}</h1>
          <p className={styles.breadcrumb}>
            <Link href="/" className={styles.crumb}>
              Home
            </Link>
            <span className={styles.slash}>/</span>
            <Link href="/marketplace" className={styles.crumb}>
              Marketplace
            </Link>
            <span className={styles.slash}>/</span>
            <span className={styles.crumbActive}>{item.name}</span>
          </p>
        </div>
      </header>

      <div className={styles.content}>
        <article className={styles.card}>
          <div className={styles.imageWrap}>
            <Image
              src={item.image}
              alt={item.name}
              fill
              sizes="(max-width: 800px) 100vw, 800px"
              priority
            />
          </div>
          <div className={styles.body}>
            <h2 className={styles.title}>{item.name}</h2>
            <p className={styles.longDesc}>
              {item.longDescription}
            </p>
            <Link href="/marketplace" className={styles.backLink}>
              ← Back to Marketplace
            </Link>
          </div>
        </article>
      </div>
    </section>
  )
}

