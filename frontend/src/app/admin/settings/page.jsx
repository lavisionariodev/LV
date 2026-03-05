import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SettingsClient from './SettingsClient'

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
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (error || !admin) {
    redirect('/')
  }

  return <SettingsClient />
}