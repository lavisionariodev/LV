import { Suspense } from 'react'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminProfileSectionPageClient from '../AdminProfileSectionPageClient'
import styles from '../../settings/settings.module.css'

const VALID_SECTIONS = new Set(['notifications', 'billing', 'content'])

export default async function AdminProfileSectionPage({ params }) {
  const { section } = await params

  if (!VALID_SECTIONS.has(section)) {
    notFound()
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: admin, error } = await supabase.from('admins').select('id').eq('id', user.id).single()

  if (error || !admin) {
    redirect('/')
  }

  return (
    <Suspense
      fallback={
        <div className={styles.settingsSkSuspense} role="status" aria-live="polite" aria-busy="true" aria-label="Loading settings">
          <div className={styles.settingsSkTabRow}>
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className={`${styles.settingsSkBar} ${styles.settingsSkTabPill}`} />
            ))}
          </div>
          <div className={styles.settingsSkCard}>
            <div className={styles.settingsSkCardHead}>
              <span className={`${styles.settingsSkBar} ${styles.settingsSkTitle}`} />
              <span className={`${styles.settingsSkBar} ${styles.settingsSkSubtitle}`} />
            </div>
            <div className={styles.settingsSkNotifList}>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={styles.settingsSkNotifRow}>
                  <div className={styles.settingsSkNotifMeta}>
                    <span className={`${styles.settingsSkBar} ${styles.settingsSkNotifTitle}`} />
                    <span className={`${styles.settingsSkBar} ${styles.settingsSkNotifDesc}`} />
                    <span className={`${styles.settingsSkBar} ${styles.settingsSkNotifDesc2}`} />
                  </div>
                  <div className={styles.settingsSkNotifControls}>
                    <span className={`${styles.settingsSkBar} ${styles.settingsSkSwitch}`} />
                    <span className={`${styles.settingsSkBar} ${styles.settingsSkSwitch}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      }
    >
      <AdminProfileSectionPageClient section={section} />
    </Suspense>
  )
}
