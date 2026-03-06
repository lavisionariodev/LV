'use client'

import layoutStyles from '../seller.module.css'

export default function SellerSettingsPage() {
  return (
    <div className={layoutStyles.pageWrap}>
      <header className={layoutStyles.pageHeader}>
        <h1 className={layoutStyles.pageTitle}>Settings</h1>
        <p className={layoutStyles.pageSubtitle}>
          Seller account and shop settings can be managed here.
        </p>
      </header>
    </div>
  )
}
