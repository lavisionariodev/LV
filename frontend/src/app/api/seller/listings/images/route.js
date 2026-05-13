import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

const BUCKET = 'listing-images'
const ALLOWED_IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const MAX_IMAGES = 10
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

function safeExt(file) {
  const ext = String(file?.name || '').split('.').pop()?.toLowerCase() || 'jpg'
  return ext.replace(/[^a-z0-9]/g, '') || 'jpg'
}

export async function POST(request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()

  if (userErr || !user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  const supabaseAdmin = getSupabaseAdmin()
  const { data: seller, error: sellerErr } = await supabaseAdmin
    .from('sellers')
    .select('status')
    .eq('user_id', user.id)
    .maybeSingle()

  if (sellerErr || !seller) {
    return NextResponse.json({ error: 'Seller account required.' }, { status: 403 })
  }
  if (['rejected', 'suspended'].includes(String(seller.status || '').toLowerCase())) {
    return NextResponse.json({ error: 'Seller account is not allowed to upload listing images.' }, { status: 403 })
  }

  const form = await request.formData().catch(() => null)
  const files = form?.getAll('files').filter((file) => file && typeof file !== 'string') || []

  if (!files.length) {
    return NextResponse.json({ urls: [] }, { status: 200 })
  }

  if (files.length > MAX_IMAGES) {
    return NextResponse.json({ error: `Maximum ${MAX_IMAGES} images per upload.` }, { status: 400 })
  }

  for (const file of files) {
    if (!ALLOWED_IMAGE_MIME.has(file.type)) {
      return NextResponse.json({ error: 'Only JPG, PNG, WEBP, or GIF images are allowed.' }, { status: 400 })
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Each image must be 5MB or less.' }, { status: 400 })
    }
  }

  const uploaded = []

  try {
    for (const file of files) {
      const fileName = `${Date.now()}-${crypto.randomUUID()}.${safeExt(file)}`
      const filePath = `${user.id}/${fileName}`
      const bytes = await file.arrayBuffer()
      const { error } = await supabaseAdmin.storage.from(BUCKET).upload(filePath, bytes, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      })
      if (error) throw error

      const {
        data: { publicUrl },
      } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(filePath)
      uploaded.push({ path: filePath, url: publicUrl })
    }
  } catch (err) {
    const paths = uploaded.map((item) => item.path).filter(Boolean)
    if (paths.length) await supabaseAdmin.storage.from(BUCKET).remove(paths)
    return NextResponse.json(
      { error: err?.message || 'Failed to upload one or more listing images.' },
      { status: 500 },
    )
  }

  return NextResponse.json({ urls: uploaded.map((item) => item.url).filter(Boolean) }, { status: 201 })
}
