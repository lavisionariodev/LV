'use client'

import { Suspense } from 'react'
import pageStyles from './settings.module.css'
import SellerSettingsClient from './components/SellerSettingsClient'

const TAB_SKELETON_WIDTHS = [72, 84, 128, 72, 88, 108]

function SellerSettingsSkeletonHead({ showAction = false }) {
  return (
    <div className={pageStyles.tabDetailHead} aria-hidden>
      <div className={pageStyles.tabDetailHeadRow}>
        <div className={pageStyles.tabDetailHeadText}>
          <span className={`${pageStyles.settingsSkBar} ${pageStyles.settingsSkHeadTitle}`} />
          <span className={`${pageStyles.settingsSkBar} ${pageStyles.settingsSkHeadSub}`} />
        </div>
        {showAction ? <span className={`${pageStyles.settingsSkBar} ${pageStyles.settingsSkHeadAction}`} /> : null}
      </div>
    </div>
  )
}

function SellerSettingsSkeletonSettingsRow({ withDesc = false }) {
  return (
    <div className={pageStyles.settingsSkSettingsRow}>
      <div className={pageStyles.settingsSkRowMeta}>
        <span className={`${pageStyles.settingsSkBar} ${pageStyles.settingsSkRowTitle}`} />
        {withDesc ? <span className={`${pageStyles.settingsSkBar} ${pageStyles.settingsSkRowDesc}`} /> : null}
      </div>
      <span className={`${pageStyles.settingsSkBar} ${pageStyles.settingsSkField} ${pageStyles.settingsSkFieldFlush}`} />
    </div>
  )
}

function SellerSettingsProfileSkeleton() {
  return (
    <>
      <SellerSettingsSkeletonHead showAction />
      <div className={pageStyles.profileDetails}>
        <div className={pageStyles.settingsSkSettingsRow}>
          <div className={pageStyles.settingsSkRowMeta}>
            <span className={`${pageStyles.settingsSkBar} ${pageStyles.settingsSkRowTitle}`} />
            <span className={`${pageStyles.settingsSkBar} ${pageStyles.settingsSkRowDesc}`} />
          </div>
          <div className={pageStyles.settingsSkProfileRow}>
            <span className={`${pageStyles.settingsSkBar} ${pageStyles.settingsSkAvatar}`} />
          </div>
        </div>
        <SellerSettingsSkeletonSettingsRow />
        <SellerSettingsSkeletonSettingsRow withDesc />
        <div className={pageStyles.settingsSkSettingsRow}>
          <div className={pageStyles.settingsSkRowMeta}>
            <span className={`${pageStyles.settingsSkBar} ${pageStyles.settingsSkRowTitle}`} />
            <span className={`${pageStyles.settingsSkBar} ${pageStyles.settingsSkRowDesc}`} />
          </div>
          <div className={pageStyles.settingsSkIdentityStack}>
            <span className={`${pageStyles.settingsSkBar} ${pageStyles.settingsSkIdentityRow}`} />
            <span className={`${pageStyles.settingsSkBar} ${pageStyles.settingsSkIdentityRow}`} />
          </div>
        </div>
      </div>
    </>
  )
}

function SellerSettingsTabSlotsSkeleton() {
  return (
    <nav className={pageStyles.tabBar} aria-hidden>
      {TAB_SKELETON_WIDTHS.map((width, index) => (
        <span
          key={index}
          className={`${pageStyles.settingsSkBar} ${pageStyles.settingsSkTabSlot}`}
          style={{ width }}
        />
      ))}
    </nav>
  )
}

function SellerSettingsSuspenseSkeleton() {
  return (
    <div className={pageStyles.page}>
      <SellerSettingsTabSlotsSkeleton />
      <div className={`${pageStyles.contentArea} ${pageStyles.grid}`}>
        <section
          className={`${pageStyles.card} ${pageStyles.full}`}
          role="status"
          aria-live="polite"
          aria-busy="true"
          aria-label="Loading settings"
        >
          <SellerSettingsProfileSkeleton />
        </section>
      </div>
    </div>
  )
}

export default function SellerSettingsPage() {
  return (
    <div className={pageStyles.pageWrap}>
      <Suspense fallback={<SellerSettingsSuspenseSkeleton />}>
        <SellerSettingsClient />
      </Suspense>
    </div>
  )
}
