import { supabase } from '@/lib/supabase/client'

const TEMPLATE_KEY = 'seller_new_listing'

function normalizeField(field, index) {
  return {
    id: field?.id || `f-${Date.now()}-${index}`,
    order: Number.isFinite(field?.order) ? field.order : index,
    label: field?.label || '',
    type: field?.type || 'text',
    required: Boolean(field?.required),
    placeholder: field?.placeholder || '',
    options: Array.isArray(field?.options) ? field.options : [],
  }
}

export async function fetchSellerTemplate() {
  const { data, error } = await supabase
    .from('seller_form_templates')
    .select('*')
    .eq('template_key', TEMPLATE_KEY)
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    return { data: null, error: error.message || 'Failed to load template.' }
  }

  if (!data) {
    return { data: null, error: null }
  }

  const fields = Array.isArray(data.fields)
    ? data.fields.map((field, index) => normalizeField(field, index))
    : []

  return { data: { ...data, fields }, error: null }
}

export async function saveSellerTemplate(fields) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { data: null, error: 'Not authenticated.' }
  }

  const normalized = (Array.isArray(fields) ? fields : [])
    .map((field, index) => normalizeField(field, index))
    .map((field, index) => ({ ...field, order: index }))

  const payload = {
    template_key: TEMPLATE_KEY,
    title: 'Seller New Listing Form',
    fields: normalized,
    is_active: true,
    updated_by: user.id,
    created_by: user.id,
  }

  const { data, error } = await supabase
    .from('seller_form_templates')
    .upsert(payload, { onConflict: 'template_key' })
    .select('*')
    .maybeSingle()

  if (error) {
    return { data: null, error: error.message || 'Failed to save template.' }
  }

  return { data, error: null }
}
