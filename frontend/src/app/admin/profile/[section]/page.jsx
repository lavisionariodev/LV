import { Suspense } from 'react'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminProfileSectionPageClient from '../AdminProfileSectionPageClient'
import AdminLoadingState from '@/components/ui/Load/AdminLoadingState'

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
    <Suspense fallback={<AdminLoadingState variant="page" label="Loading settings" />}>
      <AdminProfileSectionPageClient section={section} />
    </Suspense>
  )
}
