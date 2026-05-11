'use client'

import { Suspense } from 'react'
import pageStyles from './settings.module.css'
import SellerSettingsClient from './SellerSettingsClient'

function SellerSettingsSuspenseSkeleton() {
  return (
    <div className={pageStyles.page}>
      <nav className={pageStyles.tabBar} aria-hidden>
        {[0, 1, 2].map((i) => (
          <span key={i} className={`${pageStyles.settingsSkBar} ${pageStyles.settingsSkTabSlot}`} />
        ))}
      </nav>
      <div className={`${pageStyles.contentArea} ${pageStyles.grid}`}>
        <section
          className={`${pageStyles.card} ${pageStyles.full}`}
          role="status"
          aria-live="polite"
          aria-busy="true"
          aria-label="Loading settings"
        >
          <div className={pageStyles.tabDetailHead} aria-hidden>
            <span className={`${pageStyles.settingsSkBar} ${pageStyles.settingsSkHeadTitle}`} />
            <span className={`${pageStyles.settingsSkBar} ${pageStyles.settingsSkHeadSub}`} />
          </div>
          <div className={pageStyles.settingsSkProfileRow}>
            <span className={`${pageStyles.settingsSkBar} ${pageStyles.settingsSkAvatar}`} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <span className={`${pageStyles.settingsSkBar} ${pageStyles.settingsSkField}`} />
              <span className={`${pageStyles.settingsSkBar} ${pageStyles.settingsSkField}`} />
            </div>
          </div>
          <span className={`${pageStyles.settingsSkBar} ${pageStyles.settingsSkField}`} />
        </section>
      </div>
    </div>
  )
}

export default function SellerSettingsPage() {
  return (
    <div className={pageStyles.pageWrap}>
      <Suspense
        fallback={<SellerSettingsSuspenseSkeleton />}
      >
        <SellerSettingsClient />
      </Suspense>
    </div>
  )
}