import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminProfileClient from './AdminProfileClient'
import AdminLoadingState from '@/components/ui/Load/AdminLoadingState'

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
    <Suspense fallback={<AdminLoadingState variant="page" label="Loading profile" />}>
      <AdminProfileClient />
    </Suspense>
  )
}
