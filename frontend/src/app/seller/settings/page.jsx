import { redirect } from 'next/navigation'

const LEGACY_TAB_TO_SEGMENT = {
  profile: 'profile',
  general: 'profile',
  'my-details': 'profile',
  password: 'password',
  shop: 'shop-information',
  payouts: 'payouts',
  documents: 'documents',
  notifications: 'notifications',
}

export default async function SellerSettingsIndexPage({ searchParams }) {
  const params = await searchParams
  const tab = typeof params?.tab === 'string' ? params.tab : null
  const segment = tab ? LEGACY_TAB_TO_SEGMENT[tab] ?? null : null

  if (segment) {
    redirect(`/seller/settings/${segment}`)
  }

  redirect('/seller/settings/profile')
}
