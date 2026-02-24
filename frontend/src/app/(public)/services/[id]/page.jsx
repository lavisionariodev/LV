import Link from 'next/link'
import Image from 'next/image'
import { getServiceById } from '../data'
import styles from './detail.module.css'

export default async function ServiceDetailPage({ params }) {
  const { id } = await params
  const service = getServiceById(id)

  if (!service) {
    return (
      <section className={styles.detailPage}>
        <div className={styles.content}>
          <div className={styles.notFound}>
            <h1 className={styles.notFoundTitle}>Service not found</h1>
            <p className={styles.notFoundText}>
              The service you are looking for does not exist or has been removed.
            </p>
            <Link href="/services" className={styles.notFoundLink}>
              ← Back to Services
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
          <h1 className={styles.heroTitle}>{service.name}</h1>
          <p className={styles.breadcrumb}>
            <Link href="/" className={styles.crumb}>
              Home
            </Link>
            <span className={styles.slash}>/</span>
            <Link href="/services" className={styles.crumb}>
              Services
            </Link>
            <span className={styles.slash}>/</span>
            <span className={styles.crumbActive}>{service.name}</span>
          </p>
        </div>
      </header>

      <div className={styles.content}>
        <article className={styles.card}>
          <div className={styles.imageWrap}>
            <Image
              src={service.image}
              alt={service.name}
              fill
              sizes="(max-width: 800px) 100vw, 800px"
              priority
            />
          </div>
          <div className={styles.body}>
            <h2 className={styles.title}>{service.name}</h2>
            <p className={styles.longDesc}>
              {service.longDescription}
            </p>
            <Link href="/services" className={styles.backLink}>
              ← Back to all services
            </Link>
          </div>
        </article>
      </div>
    </section>
  )
}
