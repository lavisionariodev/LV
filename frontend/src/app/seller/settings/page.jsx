'use client'

import { Suspense } from 'react'
import pageStyles from './settings.module.css'
import SellerSettingsClient from './SellerSettingsClient'

export default function SellerSettingsPage() {
  return (
    <div className={pageStyles.pageWrap}>
      <Suspense
        fallback={
          <div className={pageStyles.page}>
            <p className={pageStyles.loadingText}>Loading settings…</p>
          </div>
        }
      >
        <SellerSettingsClient />
      </Suspense>
    </div>
  )
}