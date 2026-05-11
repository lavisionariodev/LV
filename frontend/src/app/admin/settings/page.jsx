import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminSettingsClient from './AdminSettingsClient'
import styles from './settings.module.css'

export default async function SettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: admin, error } = await supabase
    .from('admins')
    .select('id')
    .eq('id', user.id)
    .single()

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
            <div className={styles.settingsSkAvatarRow}>
              <span className={`${styles.settingsSkBar} ${styles.settingsSkAvatar}`} />
              <div className={styles.settingsSkFields} style={{ flex: 1 }}>
                <span className={`${styles.settingsSkBar} ${styles.settingsSkFieldLabel}`} />
                <span className={`${styles.settingsSkBar} ${styles.settingsSkField}`} />
                <span className={`${styles.settingsSkBar} ${styles.settingsSkFieldLabel}`} />
                <span className={`${styles.settingsSkBar} ${styles.settingsSkField}`} />
              </div>
            </div>
          </div>
        </div>
      }
    >
      <AdminSettingsClient />
    </Suspense>
  )
}