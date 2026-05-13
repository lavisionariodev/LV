/**
 * Resolve outbound email for a notification recipient.
 */
export async function resolveNotificationRecipientEmail(supabaseAdmin, userId) {
  const id = String(userId || '').trim()
  if (!id) return null

  try {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(id)
    const authEmail = data?.user?.email?.trim()
    if (!error && authEmail) return authEmail
  } catch {
    // fall through to profile/seller tables
  }

  const [{ data: profile }, { data: seller }] = await Promise.all([
    supabaseAdmin.from('profiles').select('email').eq('id', id).maybeSingle(),
    supabaseAdmin.from('sellers').select('email').eq('user_id', id).maybeSingle(),
  ])

  const profileEmail = typeof profile?.email === 'string' ? profile.email.trim() : ''
  if (profileEmail) return profileEmail

  const sellerEmail = typeof seller?.email === 'string' ? seller.email.trim() : ''
  if (sellerEmail) return sellerEmail

  return null
}
