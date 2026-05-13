import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

const AVATARS_BUCKET = 'avatars'
const ALLOWED_IMAGE_MIME = new Set(['image/png', 'image/jpeg', 'image/webp'])
const MAX_IMAGE_BYTES = 2 * 1024 * 1024

function pathFromAvatarsPublicUrl(url) {
  if (!url || typeof url !== 'string') return null
  const marker = '/storage/v1/object/public/avatars/'
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  const rest = url.slice(idx + marker.length).split('?')[0]
  return decodeURIComponent(rest)
}

function safeExt(file) {
  const ext = String(file?.name || '').split('.').pop()?.toLowerCase() || 'jpg'
  return ext.replace(/[^a-z0-9]/g, '') || 'jpg'
}

function validateImage(file) {
  if (!file || typeof file === 'string') return 'Missing image file.'
  if (!ALLOWED_IMAGE_MIME.has(file.type)) return 'Only PNG, JPG, or WEBP images are allowed.'
  if (file.size > MAX_IMAGE_BYTES) return 'Image must be 2MB or less.'
  return ''
}

function normalizeSocialLinks(value) {
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  return {
    phone: String(input.phone || '').trim(),
    whatsapp: String(input.whatsapp || '').trim(),
    email: String(input.email || '').trim(),
    facebook: String(input.facebook || '').trim(),
    messenger: String(input.messenger || '').trim(),
  }
}

function normalizeSpecialties(value) {
  const list = Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : String(value || '')
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
  const out = []
  const seen = new Set()
  for (const item of list) {
    const label = item.slice(0, 120)
    const key = label.toLowerCase()
    if (!label || seen.has(key)) continue
    seen.add(key)
    out.push(label)
    if (out.length >= 24) break
  }
  return out
}

function normalizeUsername(value) {
  const raw = String(value || '').trim()
  const username = raw.startsWith('@') ? raw.slice(1).trim().toLowerCase() : raw.toLowerCase()
  return username || null
}

async function getUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  return { supabase, user, error }
}

async function requireSeller(supabaseAdmin, userId) {
  const { data: seller, error } = await supabaseAdmin
    .from('sellers')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !seller) {
    return {
      response: NextResponse.json({ error: 'Seller account required.' }, { status: 403 }),
      seller: null,
    }
  }

  if (['rejected', 'suspended'].includes(String(seller.status || '').toLowerCase())) {
    return {
      response: NextResponse.json({ error: 'Seller account is not allowed to update settings.' }, { status: 403 }),
      seller: null,
    }
  }

  return { response: null, seller }
}

export async function PATCH(request) {
  const { supabase, user, error: userErr } = await getUser()
  if (userErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const action = String(body?.action || '').trim()
  const supabaseAdmin = getSupabaseAdmin()
  const sellerAuth = await requireSeller(supabaseAdmin, user.id)
  if (sellerAuth.response) return sellerAuth.response

  if (action === 'profile') {
    const fullName = String(body?.fullName || '').trim()
    const email = String(body?.email || '').trim()
    if (fullName.length < 2) return NextResponse.json({ error: 'Name is too short.' }, { status: 400 })
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email format.' }, { status: 400 })
    }

    const { error: authError } = await supabase.auth.updateUser({ email })
    if (authError) return NextResponse.json({ error: authError.message || 'Failed to update sign-in email.' }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ full_name: fullName, email, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select('*')
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message || 'Failed to update profile.' }, { status: 500 })
    return NextResponse.json({ profile: data }, { status: 200 })
  }

  if (action === 'shop') {
    const payload = body?.shop && typeof body.shop === 'object' ? body.shop : {}
    const businessName = String(payload.businessName || '').trim()
    const email = String(payload.email || '').trim()
    const username = normalizeUsername(payload.username)
    const tagline = String(payload.tagline || '').trim()
    const businessTypeLabel = String(payload.businessTypeLabel || '').trim()
    const turnaround = String(payload.turnaround || '').trim()
    if (!businessName) return NextResponse.json({ error: 'Please enter your business or shop name.' }, { status: 400 })
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid business email.' }, { status: 400 })
    }
    if (username && (username.length < 3 || username.length > 30 || !/^[a-z0-9][a-z0-9_]{2,29}$/.test(username))) {
      return NextResponse.json({ error: 'Use a valid shop username.' }, { status: 400 })
    }
    if (tagline.length > 500) return NextResponse.json({ error: 'Tagline must be 500 characters or fewer.' }, { status: 400 })
    if (businessTypeLabel.length > 80) {
      return NextResponse.json({ error: 'Business type label must be 80 characters or fewer.' }, { status: 400 })
    }
    if (turnaround.length > 160) {
      return NextResponse.json({ error: 'Typical response time must be 160 characters or fewer.' }, { status: 400 })
    }

    const existing = sellerAuth.seller

    const row = {
      user_id: user.id,
      business_name: businessName,
      username,
      tagline: tagline || null,
      business_type_label: businessTypeLabel || null,
      contact_name: String(payload.contactName || '').trim(),
      email,
      phone: String(payload.phone || '').trim(),
      business_info: String(payload.businessInfo || '').trim(),
      specialties: normalizeSpecialties(payload.specialties),
      address: String(payload.address || '').trim(),
      business_started_at: String(payload.businessStartedAt || '').trim() || null,
      turnaround: turnaround || null,
      social_links: normalizeSocialLinks(payload.socialLinks),
      status: existing.status || 'pending',
      registered_at: existing.registered_at || payload.registeredAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabaseAdmin
      .from('sellers')
      .upsert(row, { onConflict: 'user_id' })
      .select('*')
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message || 'Failed to save shop information.' }, { status: 500 })
    return NextResponse.json({ seller: data }, { status: 200 })
  }

  return NextResponse.json({ error: 'Invalid settings action.' }, { status: 400 })
}

export async function POST(request) {
  const { user, error: userErr } = await getUser()
  if (userErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await request.formData().catch(() => null)
  const kind = String(form?.get('kind') || '').trim()
  if (!['avatar', 'cover'].includes(kind)) {
    return NextResponse.json({ error: 'Invalid image kind.' }, { status: 400 })
  }

  const supabaseAdmin = getSupabaseAdmin()
  const sellerAuth = await requireSeller(supabaseAdmin, user.id)
  if (sellerAuth.response) return sellerAuth.response

  const file = form?.get('file')
  const imageError = validateImage(file)
  if (imageError) return NextResponse.json({ error: imageError }, { status: 400 })

  const filePath = `${user.id}/${kind}-${Date.now()}-${crypto.randomUUID()}.${safeExt(file)}`
  const bytes = await file.arrayBuffer()
  const { error: uploadError } = await supabaseAdmin.storage.from(AVATARS_BUCKET).upload(filePath, bytes, {
    contentType: file.type,
    upsert: false,
    cacheControl: '3600',
  })
  if (uploadError) return NextResponse.json({ error: uploadError.message || 'Failed to upload image.' }, { status: 500 })

  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from(AVATARS_BUCKET).getPublicUrl(filePath)

  if (kind === 'avatar') {
    const { data: profile } = await supabaseAdmin.from('profiles').select('avatar_url').eq('id', user.id).maybeSingle()
    const prevPath = pathFromAvatarsPublicUrl(String(profile?.avatar_url || ''))
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', user.id)
    if (error) {
      await supabaseAdmin.storage.from(AVATARS_BUCKET).remove([filePath])
      return NextResponse.json({ error: error.message || 'Failed to update avatar.' }, { status: 500 })
    }
    if (prevPath && prevPath !== filePath) await supabaseAdmin.storage.from(AVATARS_BUCKET).remove([prevPath])
    return NextResponse.json({ avatarUrl: publicUrl, avatarPath: filePath }, { status: 200 })
  }

  if (kind === 'cover') {
    const seller = sellerAuth.seller
    const prevPath = pathFromAvatarsPublicUrl(String(seller?.cover_photo_url || ''))
    const { data, error } = await supabaseAdmin
      .from('sellers')
      .update({ cover_photo_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .select('*')
      .maybeSingle()
    if (error) {
      await supabaseAdmin.storage.from(AVATARS_BUCKET).remove([filePath])
      return NextResponse.json({ error: error.message || 'Failed to update shop cover.' }, { status: 500 })
    }
    if (prevPath && prevPath !== filePath) await supabaseAdmin.storage.from(AVATARS_BUCKET).remove([prevPath])
    return NextResponse.json({ seller: data }, { status: 200 })
  }

  await supabaseAdmin.storage.from(AVATARS_BUCKET).remove([filePath])
  return NextResponse.json({ error: 'Invalid image kind.' }, { status: 400 })
}

export async function DELETE(request) {
  const { user, error: userErr } = await getUser()
  if (userErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const kind = new URL(request.url).searchParams.get('kind')
  const supabaseAdmin = getSupabaseAdmin()
  const sellerAuth = await requireSeller(supabaseAdmin, user.id)
  if (sellerAuth.response) return sellerAuth.response

  if (kind === 'avatar') {
    const { data: profile } = await supabaseAdmin.from('profiles').select('avatar_url').eq('id', user.id).maybeSingle()
    const prevPath = pathFromAvatarsPublicUrl(String(profile?.avatar_url || ''))
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ avatar_url: null, updated_at: new Date().toISOString() })
      .eq('id', user.id)
    if (error) return NextResponse.json({ error: error.message || 'Failed to remove avatar.' }, { status: 500 })
    if (prevPath) await supabaseAdmin.storage.from(AVATARS_BUCKET).remove([prevPath])
    return NextResponse.json({ ok: true }, { status: 200 })
  }

  if (kind === 'cover') {
    const seller = sellerAuth.seller
    const prevPath = pathFromAvatarsPublicUrl(String(seller?.cover_photo_url || ''))
    const { data, error } = await supabaseAdmin
      .from('sellers')
      .update({ cover_photo_url: null, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .select('*')
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message || 'Failed to remove shop cover.' }, { status: 500 })
    if (prevPath) await supabaseAdmin.storage.from(AVATARS_BUCKET).remove([prevPath])
    return NextResponse.json({ seller: data }, { status: 200 })
  }

  return NextResponse.json({ error: 'Invalid image kind.' }, { status: 400 })
}
