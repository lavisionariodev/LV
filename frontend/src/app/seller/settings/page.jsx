'use client'

import pageStyles from './settings.module.css'
import SellerSettingsClient from './SellerSettingsClient'

export default function SellerSettingsPage() {
  return (
    <div className={pageStyles.pageWrap}>
      <SellerSettingsClient />
    </div>
  )
}