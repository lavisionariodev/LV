import { supabase } from '@/lib/supabase/client'
import {
  getOrderedSectionIds,
  inferSectionForFieldId,
  mergeSectionConfig,
  normalizeSectionId,
  sanitizeSectionId,
} from '@/lib/seller-template/sections'

const TEMPLATE_KEY = 'seller_new_listing'

const MAX_FIELD_LENGTH_CAP = 100_000

function normalizeMaxLength(raw) {
  if (raw === '' || raw == null) return undefined
  const n = Math.floor(Number(raw))
  if (!Number.isFinite(n) || n <= 0) return undefined
  return Math.min(n, MAX_FIELD_LENGTH_CAP)
}

function normalizeField(field, index, allowedSectionIds) {
  const id = field?.id || `f-${Date.now()}-${index}`
  const sectionRaw = field?.section != null ? field.section : inferSectionForFieldId(id, allowedSectionIds)
  const maxLength = normalizeMaxLength(field?.maxLength)
  const rawType = field?.type || 'text'
  const type =
    rawType === 'images' ? 'images' : rawType === 'string_list' ? 'string_list' : rawType
  return {
    id,
    order: Number.isFinite(field?.order) ? field.order : index,
    label: field?.label || '',
    type,
    required: Boolean(field?.required),
    placeholder: field?.placeholder || '',
    options: Array.isArray(field?.options) ? field.options : [],
    section: normalizeSectionId(sectionRaw, allowedSectionIds),
    sublabel: typeof field?.sublabel === 'string' ? field.sublabel : '',
    ...(maxLength !== undefined ? { maxLength } : {}),
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

  const sectionConfig = mergeSectionConfig(data.section_config)
  const allowedSectionIds = getOrderedSectionIds(sectionConfig)

  const fields = Array.isArray(data.fields)
    ? data.fields.map((field, index) => normalizeField(field, index, allowedSectionIds))
    : []

  return {
    data: {
      ...data,
      fields,
      section_config: data.section_config,
      sectionConfig,
    },
    error: null,
  }
}

/**
 * @param {object} payload
 * @param {Array} payload.fields
 * @param {object} [payload.sectionConfig] — merged array from mergeSectionConfig; stored as { sections: [...] }
 */
export async function saveSellerTemplate(payload) {
  const fieldsIn = Array.isArray(payload) ? payload : payload?.fields
  const sectionConfigInput = Array.isArray(payload) ? null : payload?.sectionConfig

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { data: null, error: 'Not authenticated.' }
  }

  const allowedSectionIds =
    sectionConfigInput && Array.isArray(sectionConfigInput) && sectionConfigInput.length
      ? sectionConfigInput.map((s) => sanitizeSectionId(s?.id)).filter(Boolean)
      : getOrderedSectionIds(mergeSectionConfig(null))

  const normalized = (Array.isArray(fieldsIn) ? fieldsIn : [])
    .map((field, index) => normalizeField(field, index, allowedSectionIds))
    .map((field, index) => ({ ...field, order: index }))

  const sectionPayload =
    sectionConfigInput && Array.isArray(sectionConfigInput)
      ? {
          sections: sectionConfigInput.map((s) => ({
            id: sanitizeSectionId(s.id),
            label: String(s.label || '').trim(),
            tipTitle: String(s.tipTitle || '').trim(),
            tipBody: String(s.tipBody || '').trim(),
            shopGuide: String(s.shopGuide || '').trim(),
          })),
        }
      : null

  const upsertPayload = {
    template_key: TEMPLATE_KEY,
    title: 'Seller New Listing Form',
    fields: normalized,
    is_active: true,
    updated_by: user.id,
    created_by: user.id,
  }

  if (sectionPayload) {
    upsertPayload.section_config = sectionPayload
  }

  const { data, error } = await supabase
    .from('seller_form_templates')
    .upsert(upsertPayload, { onConflict: 'template_key' })
    .select('*')
    .maybeSingle()

  if (error) {
    return { data: null, error: error.message || 'Failed to save template.' }
  }

  const mergedConfig = mergeSectionConfig(data?.section_config)
  const merged = data
    ? {
        ...data,
        sectionConfig: mergedConfig,
        fields: Array.isArray(data.fields)
          ? data.fields.map((field, index) =>
              normalizeField(field, index, getOrderedSectionIds(mergedConfig)),
            )
          : [],
      }
    : data

  return { data: merged, error: null }
}
