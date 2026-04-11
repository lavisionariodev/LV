/**
 * Section model for seller new-listing template.
 * Section order and ids are admin-defined; defaults seed three groups (basic → sales → others).
 */

/** Built-in default section ids (used when no template is saved). */
const SECTION_IDS = ['basic', 'sales', 'others']

const MAX_SECTION_ID_LEN = 64

/**
 * Normalize a section id for storage: lowercase, snake_case, [a-z0-9_].
 */
export function sanitizeSectionId(raw) {
  let s = String(raw ?? '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
  if (!s) s = 'section'
  if (s.length > MAX_SECTION_ID_LEN) s = s.slice(0, MAX_SECTION_ID_LEN)
  return s
}

/**
 * Resolve a field/section reference to a valid section id.
 * @param {string} raw
 * @param {string[]} [allowedIds] — ordered section ids from the active template (required for dynamic templates)
 */
export function normalizeSectionId(raw, allowedIds) {
  const id = sanitizeSectionId(raw)
  const allowed =
    Array.isArray(allowedIds) && allowedIds.length
      ? allowedIds
      : SECTION_IDS

  if (allowed.includes(id)) return id
  const found = allowed.find((a) => sanitizeSectionId(a) === id)
  if (found) return found
  return allowed[0] || 'basic'
}

export function getOrderedSectionIds(sectionConfig) {
  if (!Array.isArray(sectionConfig) || sectionConfig.length === 0) {
    return [...SECTION_IDS]
  }
  return sectionConfig.map((s) => s?.id).filter(Boolean)
}

/** Default labels & sidebar tips (initial seed). */
export function getDefaultSectionConfig() {
  return [
    {
      id: 'basic',
      label: 'Basic information',
      tipTitle: 'Listing basics',
      tipBody:
        'Use clear photos and a descriptive name so buyers know what they get. Category, duration, and coverage help them compare options and find you in search.',
      shopGuide:
        'Shop: listing title, description, images, kind/category, duration & coverage on cards and detail.',
    },
    {
      id: 'sales',
      label: 'Sales information',
      tipTitle: 'Pricing & options',
      tipBody:
        'Set a starting price buyers can trust. Use price notes for caveats. Package options power the buyer package dropdown on the shop detail page.',
      shopGuide:
        'Shop: price, package picker (when options exist), price-related notes in cart and detail.',
    },
    {
      id: 'others',
      label: 'Others',
      tipTitle: 'Inclusions & policies',
      tipBody:
        'Spell out what is included, who the service is for, and any important notes or disclaimers. Clear expectations reduce questions later.',
      shopGuide:
        'Shop: inclusions list, audience, policies — surfaced on listing detail and compare.',
    },
  ]
}

function emptySectionRow(id) {
  return {
    id,
    label: 'New section',
    tipTitle: 'Tips for this section',
    tipBody: 'Add guidance for sellers completing this part of the form.',
    shopGuide: 'Describe how answers here appear to buyers on the shop.',
  }
}

/**
 * Merge stored JSON from DB with per-id defaults. Preserves admin section order; supports extra sections.
 * @param {unknown} raw — `seller_form_templates.section_config` or null
 */
export function mergeSectionConfig(raw) {
  const defaults = getDefaultSectionConfig()
  const defaultById = new Map(defaults.map((d) => [d.id, d]))

  const parsed =
    raw && typeof raw === 'object' && !Array.isArray(raw) && Array.isArray(raw.sections)
      ? raw.sections
      : []

  if (parsed.length === 0) {
    return defaults.map((d) => ({ ...d }))
  }

  const seen = new Set()
  const result = []

  for (const p of parsed) {
    const id = sanitizeSectionId(p?.id)
    if (!id || seen.has(id)) continue
    seen.add(id)

    const base = defaultById.get(id) || emptySectionRow(id)
    const saved = p || {}
    result.push({
      ...base,
      id,
      label: typeof saved.label === 'string' && saved.label.trim() ? saved.label.trim() : base.label,
      tipTitle:
        typeof saved.tipTitle === 'string' && saved.tipTitle.trim()
          ? saved.tipTitle.trim()
          : base.tipTitle,
      tipBody:
        typeof saved.tipBody === 'string' && saved.tipBody.trim()
          ? saved.tipBody.trim()
          : base.tipBody,
      shopGuide:
        typeof saved.shopGuide === 'string' && saved.shopGuide.trim()
          ? saved.shopGuide.trim()
          : base.shopGuide,
    })
  }

  return result.length ? result : defaults.map((d) => ({ ...d }))
}

/** Sort index for a section id within an ordered template (unknown ids sort last). */
function sectionOrderIndex(sectionId, orderedSectionIds) {
  const order =
    Array.isArray(orderedSectionIds) && orderedSectionIds.length
      ? orderedSectionIds
      : [...SECTION_IDS]
  const s = normalizeSectionId(sectionId, order)
  const i = order.indexOf(s)
  return i >= 0 ? i : order.length
}

/** Known field ids → default section (for seeds and migrations). */
const DEFAULT_SECTION_BY_FIELD_ID = {
  listing_images: 'basic',
  listing_name: 'basic',
  description: 'basic',
  kind: 'basic',
  category: 'basic',
  duration: 'basic',
  coverage: 'basic',
  base_price: 'sales',
  price_note: 'sales',
  package_options: 'sales',
  inclusions: 'others',
  who_this_is_for: 'others',
  important_notes: 'others',
  status: 'others',
  funeral_category: 'basic',
}

/** Short hint for admins: how this key maps to shop / cart (when id is known). */
export const SHOP_FIELD_GUIDE_BY_ID = {
  listing_images: 'Gallery on cards & detail; not stored in dynamic_values JSON.',
  listing_name: 'Listing title on cards & detail; cart line name.',
  description: 'Long text on shop detail; fallback lines for inclusions when needed.',
  kind: 'Distinguishes service vs package in seller tools.',
  category: 'Feeds category / filters where used.',
  duration: 'Buyer-facing duration on detail.',
  coverage: 'Service area; also used for listing location line.',
  base_price: 'Displayed price; cart unit price.',
  price_note: 'Shown near price where the UI surfaces it.',
  package_options:
    'Each option becomes a buyer package choice on shop detail & cart when this listing is active (shop prefers listing options, then seller profile).',
  inclusions: 'Bullet list on cards/detail (line breaks).',
  who_this_is_for: 'Audience copy on detail.',
  important_notes: 'Policies & disclaimers on detail.',
  status: 'Listing lifecycle (draft/active/…); not shown to buyers on shop cards.',
}

export function inferSectionForFieldId(fieldId, allowedSectionIds) {
  const id = String(fieldId || '')
  const mapped = DEFAULT_SECTION_BY_FIELD_ID[id]
  const target = mapped != null ? mapped : 'basic'
  return normalizeSectionId(target, allowedSectionIds)
}

/**
 * Sort fields for display: section order first, then field order.
 * @param {string[]} [orderedSectionIds] — from `getOrderedSectionIds(sectionConfig)`
 */
export function sortTemplateFieldsForDisplay(fields, orderedSectionIds) {
  const order =
    Array.isArray(orderedSectionIds) && orderedSectionIds.length
      ? orderedSectionIds
      : [...SECTION_IDS]
  const list = Array.isArray(fields) ? [...fields] : []
  return list.sort((a, b) => {
    const sa = sectionOrderIndex(a.section, order)
    const sb = sectionOrderIndex(b.section, order)
    if (sa !== sb) return sa - sb
    const oa = Number.isFinite(a?.order) ? a.order : 0
    const ob = Number.isFinite(b?.order) ? b.order : 0
    return oa - ob
  })
}

/**
 * Which section the sidebar tip should highlight: first incomplete step, else last section.
 * @param {Record<string, boolean>} completed — keys are section ids
 * @param {string[]} [orderedSectionIds]
 */
export function getActiveTipSectionId(completed, orderedSectionIds) {
  const order =
    Array.isArray(orderedSectionIds) && orderedSectionIds.length
      ? orderedSectionIds
      : [...SECTION_IDS]
  const c = completed && typeof completed === 'object' ? completed : {}
  for (const id of order) {
    if (!c[id]) return id
  }
  return order[order.length - 1]
}

/**
 * Ensure a new section id does not collide with existing ids.
 */
export function uniqueSectionId(baseId, existingIds) {
  const base = sanitizeSectionId(baseId)
  const existing = new Set((existingIds || []).map((x) => sanitizeSectionId(x)))
  if (!existing.has(base)) return base
  let i = 2
  let candidate = `${base}_${i}`
  while (existing.has(candidate) && i < 1000) {
    i += 1
    candidate = `${base}_${i}`
  }
  return candidate
}
