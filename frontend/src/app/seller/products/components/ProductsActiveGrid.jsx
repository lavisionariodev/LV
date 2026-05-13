'use client'

import Image from 'next/image'
import styles from '../products.module.css'
import { formatPhpAmount } from '@/lib/cart/formatPhp'
import { isProductShopActive, productStateLabel } from './listingLifecycle'
import { shouldUnoptimizeListingImage } from './SellerListingForm'

export default function ProductsActiveGrid({
  products,
  onOpenEdit,
  onOpenView,
  onRequestRemove,
}) {
  return (
    <div className={styles.productsGrid}>
      {products.map((product) => (
        <article key={product.id} className={styles.productCard}>
          <div className={styles.productHeader}>
            <div className={styles.productBadges}>
              <span className={styles.productKindBadge}>
                {product.kind === 'service' ? 'Service' : 'Package'}
              </span>
              <span className={styles.productCategoryBadge}>{product.category}</span>
            </div>
            <span
              className={`${styles.statusPill} ${
                isProductShopActive(product) ? styles.statusPillActive : styles.statusPillInactive
              }`}
            >
              {productStateLabel(product)}
            </span>
          </div>

          <div className={styles.productImageWrap}>
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 960px) 50vw, 320px"
              className={styles.productImage}
              unoptimized={shouldUnoptimizeListingImage(product.image)}
            />
          </div>

          <h2 className={styles.productTitle}>{product.name}</h2>

          <div className={styles.productMeta}>
            <p className={styles.productPrice}>
              <span className={styles.productPriceLabel}>Starting at</span>{' '}
              <span className={styles.productPriceValue}>{formatPhpAmount(product.startingPrice)}</span>
            </p>
            <p className={styles.productLocation}>{product.city}</p>
            <p className={styles.productAvailability}>{product.availability}</p>
          </div>

          <div className={styles.productActions}>
            <button
              type="button"
              className={styles.productActionPrimary}
              onClick={() => onOpenEdit(product)}
            >
              Edit
            </button>
            <button
              type="button"
              className={styles.productActionGhost}
              onClick={() => onOpenView(product)}
            >
              View
            </button>
            <button
              type="button"
              className={styles.productActionDanger}
              onClick={() => onRequestRemove(product)}
              aria-haspopup="dialog"
            >
              Remove
            </button>
          </div>
        </article>
      ))}
    </div>
  )
}
