import Image from 'next/image'
import Link from 'next/link'
import { getProductById } from '../data'
import styles from './detail.module.css'
import { FiShoppingCart, FiCreditCard } from 'react-icons/fi'

const LOGIN_URL = '/buyer/login?redirect=/shop'

export default async function ShopProductPage({ params }) {
  const resolvedParams = typeof params.then === 'function' ? await params : params
  const product = getProductById(resolvedParams?.id)

  if (!product) {
    return (
      <section className={styles.detailPage}>
        <div className={styles.container}>
          <div className={styles.notFound}>
            <h1 className={styles.notFoundTitle}>Product not found</h1>
            <p className={styles.notFoundSub}>
              The product you're looking for doesn't exist or has been removed.
            </p>
            <Link href="/shop" className={styles.notFoundLink}>
              Back to Shop
            </Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className={styles.detailPage}>
      <div className={styles.container}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span className={styles.slash}>/</span>
          <Link href="/shop">Shop</Link>
          <span className={styles.slash}>/</span>
          <span className={styles.crumbCurrent}>{product.name}</span>
        </nav>

        <div className={styles.mainRow}>
          <div className={styles.imageSection}>
            <div className={styles.imageWrap}>
              <Image
                src={product.img}
                alt={product.name}
                width={600}
                height={500}
                className={styles.productImg}
                priority
              />
            </div>
            <span className={styles.pill}>{product.category}</span>
          </div>

          <div className={styles.detailsColumn}>
            <h1 className={styles.title}>{product.name}</h1>

            <div className={styles.priceRow}>
              <span className={styles.price}>
                ₱{product.price.toLocaleString()}
              </span>
            </div>

            <div className={styles.descSection}>
              <p className={styles.desc}>{product.desc}</p>
            </div>

            <div className={styles.actions}>
              <Link href={LOGIN_URL} className={styles.btnGhost}>
                <FiShoppingCart />
                Add to Cart
              </Link>
              <Link href={LOGIN_URL} className={styles.btnSolid}>
                <FiCreditCard />
                Buy Now
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
