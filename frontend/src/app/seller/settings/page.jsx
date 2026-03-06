'use client'

import layoutStyles from '../seller.module.css'
import SellerSettingsClient from './SellerSettingsClient'

export default function SellerSettingsPage() {
  return (
    <div className={layoutStyles.pageWrap}>
      <header className={layoutStyles.pageHeader}>
        <h1 className={layoutStyles.pageTitle}>Settings</h1>
        <p className={layoutStyles.pageSubtitle}>
          Manage your email, avatar, name, and password.
        </p>
      </header>
      <SellerSettingsClient />
    </div>
  )
}
