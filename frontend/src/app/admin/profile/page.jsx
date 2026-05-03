import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminProfileClient from './AdminProfileClient'
import loadingStyles from '../admin-loading.module.css'

export default async function AdminProfilePage() {
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
        <div
          className={`${loadingStyles.root} ${loadingStyles.variantPage}`}
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <span className={loadingStyles.spinner} aria-hidden />
          <span className={loadingStyles.label}>Loading profile</span>
        </div>
      }
    >
      <AdminProfileClient />
    </Suspense>
  )
}
