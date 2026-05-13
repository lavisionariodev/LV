'use client'

import styles from '../products.module.css'
import { LISTING_TABS } from './listingLifecycle'

export default function ProductsLifecycleTabs({ activeTab, counts, onTabChange }) {
  return (
    <div className={styles.lifecycleTabs} role="tablist" aria-label="Listing lifecycle">
      {LISTING_TABS.map((tab) => {
        const selected = activeTab === tab.id
        const count = counts?.[tab.id] ?? 0
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`products-tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`products-panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            className={`${styles.lifecycleTab} ${selected ? styles.lifecycleTabActive : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label} ({count})
          </button>
        )
      })}
    </div>
  )
}
