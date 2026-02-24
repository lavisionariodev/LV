import Link from 'next/link'
import Image from 'next/image'
import { getPackageById } from '../data'
import styles from './detail.module.css'

export default async function PackageDetailPage({ params }) {
  const { id } = await params
  const pkg = getPackageById(id)

  if (!pkg) {
    return (
      <section className={styles.detailPage}>
        <div className={styles.content}>
          <div className={styles.notFound}>
            <h1 className={styles.notFoundTitle}>Package not found</h1>
            <p className={styles.notFoundText}>
              The package you are looking for does not exist or has been removed.
            </p>
            <Link href="/packages" className={styles.notFoundLink}>
              ← Back to Packages
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
          <h1 className={styles.heroTitle}>{pkg.name}</h1>
          <p className={styles.breadcrumb}>
            <Link href="/" className={styles.crumb}>
              Home
            </Link>
            <span className={styles.slash}>/</span>
            <Link href="/packages" className={styles.crumb}>
              Packages
            </Link>
            <span className={styles.slash}>/</span>
            <span className={styles.crumbActive}>{pkg.name}</span>
          </p>
        </div>
      </header>

      <div className={styles.content}>
        <article className={styles.card}>
          <div className={styles.imageWrap}>
            <Image
              src={pkg.image}
              alt={pkg.name}
              fill
              sizes="(max-width: 800px) 100vw, 800px"
              priority
            />
          </div>
          <div className={styles.body}>
            <h2 className={styles.title}>{pkg.name}</h2>
            {pkg.price && <p className={styles.price}>{pkg.price}</p>}
            <p className={styles.longDesc}>
              {pkg.longDescription}
            </p>
            <Link href="/packages" className={styles.backLink}>
              ← Back to all packages
            </Link>
          </div>
        </article>
      </div>
    </section>
  )
}
