'use client'

import layoutStyles from '../seller.module.css'

export default function SellerHelpPage() {
  return (
    <div className={layoutStyles.pageWrap}>
      <header className={layoutStyles.pageHeader}>
        <h1 className={layoutStyles.pageTitle}>Help Center</h1>
        <p className={layoutStyles.pageSubtitle}>
          Seller help content and FAQs can be added here.
        </p>
      </header>
    </div>
  )
}
