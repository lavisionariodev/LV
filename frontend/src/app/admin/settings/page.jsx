import { redirect } from 'next/navigation'

const LEGACY_TAB_TO_SEGMENT = {
  profile: 'account',
  general: 'account',
  'my-details': 'account',
  password: 'password',
  notifications: 'notifications',
  billing: 'billing',
  content: 'site-content',
}

export default async function AdminSettingsIndexPage({ searchParams }) {
  const params = await searchParams
  const tab = typeof params?.tab === 'string' ? params.tab : null
  const segment = tab ? LEGACY_TAB_TO_SEGMENT[tab] ?? null : null

  if (segment) {
    redirect(`/admin/settings/${segment}`)
  }

  redirect('/admin/settings/account')
}
