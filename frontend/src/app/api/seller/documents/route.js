import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { mapSellerDocumentRow } from '@/lib/sellers/sellerDocuments'

const BUCKET = 'seller-documents'
const DOC_ALLOWED = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
const MAX_DOC_BYTES = 8 * 1024 * 1024

async function mapDoc(row, supabaseAdmin) {
  return mapSellerDocumentRow(row, supabaseAdmin)
}

async function requireSeller(userId) {
  const supabaseAdmin = getSupabaseAdmin()
  const { data: seller, error } = await supabaseAdmin
    .from('sellers')
    .select('status')
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !seller) {
    return { response: NextResponse.json({ error: 'Seller account required.' }, { status: 403 }), supabaseAdmin }
  }
  if (['rejected', 'suspended'].includes(String(seller.status || '').toLowerCase())) {
    return {
      response: NextResponse.json({ error: 'Seller account is not allowed to manage documents.' }, { status: 403 }),
      supabaseAdmin,
    }
  }
  return { response: null, supabaseAdmin }
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()
  if (userErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const sellerAuth = await requireSeller(user.id)
  if (sellerAuth.response) return sellerAuth.response

  const { data, error } = await supabase
    .from('seller_documents')
    .select('*')
    .eq('seller_user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message || 'Failed to load documents.' }, { status: 500 })
  const supabaseAdmin = sellerAuth.supabaseAdmin
  const documents = await Promise.all((data || []).map((row) => mapDoc(row, supabaseAdmin)))
  return NextResponse.json({ documents }, { status: 200 })
}

export async function POST(request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()
  if (userErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const sellerAuth = await requireSeller(user.id)
  if (sellerAuth.response) return sellerAuth.response

  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  const documentType = String(form?.get('documentType') || 'business_permit').trim()
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'Missing document file.' }, { status: 400 })
  }

  if (!DOC_ALLOWED.has(file.type)) {
    return NextResponse.json({ error: 'Only PDF, PNG, JPG, or WEBP files are allowed.' }, { status: 400 })
  }

  if (file.size > MAX_DOC_BYTES) {
    return NextResponse.json({ error: 'Document must be 8MB or less.' }, { status: 400 })
  }

  const displayName = String(file.name || 'document').trim()
  const safeName = displayName.replace(/[^a-zA-Z0-9._-]+/g, '-')
  const storagePath = `${user.id}/${Date.now()}-${safeName}`
  const supabaseAdmin = sellerAuth.supabaseAdmin
  const bytes = await file.arrayBuffer()

  const { error: uploadErr } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(storagePath, bytes, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message || 'Failed to upload document.' }, { status: 500 })
  }

  const { data, error } = await supabase
    .from('seller_documents')
    .insert({
      seller_user_id: user.id,
      document_type: documentType,
      display_name: displayName,
      storage_bucket: BUCKET,
      storage_path: storagePath,
      mime_type: file.type,
      file_size: file.size,
      status: 'submitted',
    })
    .select('*')
    .maybeSingle()

  if (error) {
    await supabaseAdmin.storage.from(BUCKET).remove([storagePath])
    return NextResponse.json({ error: error.message || 'Failed to save document.' }, { status: 500 })
  }
  return NextResponse.json({ document: await mapDoc(data, supabaseAdmin) }, { status: 201 })
}

export async function DELETE(request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()
  if (userErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const sellerAuth = await requireSeller(user.id)
  if (sellerAuth.response) return sellerAuth.response

  const id = new URL(request.url).searchParams.get('id')?.trim()
  if (!id) return NextResponse.json({ error: 'Missing document id.' }, { status: 400 })

  const { data: doc, error: findErr } = await supabase
    .from('seller_documents')
    .select('id,seller_user_id,storage_path,storage_bucket,status')
    .eq('id', id)
    .eq('seller_user_id', user.id)
    .maybeSingle()

  if (findErr || !doc) return NextResponse.json({ error: 'Document not found.' }, { status: 404 })
  if (doc.status === 'approved') {
    return NextResponse.json({ error: 'Approved documents cannot be removed here.' }, { status: 400 })
  }

  const { error } = await supabase.from('seller_documents').delete().eq('id', id).eq('seller_user_id', user.id)
  if (error) return NextResponse.json({ error: error.message || 'Failed to delete document.' }, { status: 500 })

  const supabaseAdmin = sellerAuth.supabaseAdmin
  await supabaseAdmin.storage.from(doc.storage_bucket || BUCKET).remove([doc.storage_path])
  return NextResponse.json({ ok: true }, { status: 200 })
}
