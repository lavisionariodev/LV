const DEFAULT_SITE_CONTENT = {
  systemName: '',
  footer: {
    tagline: '',
    supportPhone: '',
    supportEmail: '',
    copyrightText: '',
  },
  about: {
    description: '',
    ourStory: '',
    missionVision: '',
    whyUs: '',
    partners: '',
    commitment: '',
    testimonial1: '',
    testimonial1Name: '',
    testimonial1Location: '',
    testimonial2: '',
    testimonial2Name: '',
    testimonial2Location: '',
    testimonial3: '',
    testimonial3Name: '',
    testimonial3Location: '',
    testimonialFeatured: '',
  },
  sellerHelpFaq: [],
}

export function rowToSiteContent(row) {
  if (!row) return DEFAULT_SITE_CONTENT

  return {
    systemName: row.system_name ?? DEFAULT_SITE_CONTENT.systemName,
    footer: {
      tagline: row.footer_tagline ?? DEFAULT_SITE_CONTENT.footer.tagline,
      supportPhone:
        row.footer_support_phone ?? DEFAULT_SITE_CONTENT.footer.supportPhone,
      supportEmail:
        row.footer_support_email ?? DEFAULT_SITE_CONTENT.footer.supportEmail,
      copyrightText:
        row.footer_copyright_text ?? DEFAULT_SITE_CONTENT.footer.copyrightText,
    },
    about: {
      description: row.about_description ?? DEFAULT_SITE_CONTENT.about.description,
      ourStory: row.about_our_story ?? DEFAULT_SITE_CONTENT.about.ourStory,
      missionVision:
        row.about_mission_vision ?? DEFAULT_SITE_CONTENT.about.missionVision,
      whyUs:
        row.about_why_us ??
        row.about_why_la_visionario ??
        DEFAULT_SITE_CONTENT.about.whyUs,
      partners: row.about_partners ?? DEFAULT_SITE_CONTENT.about.partners,
      commitment:
        row.about_commitment ??
        DEFAULT_SITE_CONTENT.about.commitment,
      testimonial1:
        row.about_testimonial_1 ?? DEFAULT_SITE_CONTENT.about.testimonial1,
      testimonial1Name:
        row.about_testimonial_1_name ?? DEFAULT_SITE_CONTENT.about.testimonial1Name,
      testimonial1Location:
        row.about_testimonial_1_location ?? DEFAULT_SITE_CONTENT.about.testimonial1Location,
      testimonial2:
        row.about_testimonial_2 ?? DEFAULT_SITE_CONTENT.about.testimonial2,
      testimonial2Name:
        row.about_testimonial_2_name ?? DEFAULT_SITE_CONTENT.about.testimonial2Name,
      testimonial2Location:
        row.about_testimonial_2_location ?? DEFAULT_SITE_CONTENT.about.testimonial2Location,
      testimonial3:
        row.about_testimonial_3 ?? DEFAULT_SITE_CONTENT.about.testimonial3,
      testimonial3Name:
        row.about_testimonial_3_name ?? DEFAULT_SITE_CONTENT.about.testimonial3Name,
      testimonial3Location:
        row.about_testimonial_3_location ?? DEFAULT_SITE_CONTENT.about.testimonial3Location,
      testimonialFeatured:
        row.about_testimonial_featured ??
        DEFAULT_SITE_CONTENT.about.testimonialFeatured,
    },
    sellerHelpFaq: normalizeSellerHelpFaq(row.seller_help_faq),
  }
}

export function siteContentToRow(content) {
  const src = content ?? DEFAULT_SITE_CONTENT

  return {
    system_name: src.systemName,

    footer_tagline: src.footer?.tagline ?? null,
    footer_support_phone: src.footer?.supportPhone ?? null,
    footer_support_email: src.footer?.supportEmail ?? null,
    footer_copyright_text: src.footer?.copyrightText ?? null,

    about_description: src.about?.description ?? null,
    about_our_story: src.about?.ourStory ?? null,
    about_mission_vision: src.about?.missionVision ?? null,
    about_why_us: src.about?.whyUs ?? null,
    about_commitment: src.about?.commitment ?? null,
    about_partners: src.about?.partners ?? null,
    about_testimonial_1: src.about?.testimonial1 ?? null,
    about_testimonial_1_name: src.about?.testimonial1Name ?? null,
    about_testimonial_1_location: src.about?.testimonial1Location ?? null,
    about_testimonial_2: src.about?.testimonial2 ?? null,
    about_testimonial_2_name: src.about?.testimonial2Name ?? null,
    about_testimonial_2_location: src.about?.testimonial2Location ?? null,
    about_testimonial_3: src.about?.testimonial3 ?? null,
    about_testimonial_3_name: src.about?.testimonial3Name ?? null,
    about_testimonial_3_location: src.about?.testimonial3Location ?? null,
    about_testimonial_featured: src.about?.testimonialFeatured ?? null,

    seller_help_faq: normalizeSellerHelpFaq(src.sellerHelpFaq),
  }
}

export function normalizeSellerHelpFaq(raw) {
  if (!Array.isArray(raw)) return []
  return raw
    .map((group) => {
      const category = String(group?.category || '').trim()
      const items = Array.isArray(group?.items)
        ? group.items
            .map((item) => ({
              id: String(item?.id || '').trim(),
              question: String(item?.question || '').trim(),
              answer: String(item?.answer || '').trim(),
            }))
            .filter((item) => item.id && item.question && item.answer)
        : []
      if (!category || items.length === 0) return null
      return { category, items }
    })
    .filter(Boolean)
}

export function validateSellerHelpFaq(raw) {
  if (!Array.isArray(raw)) return 'Seller help FAQ must be an array of categories.'
  for (const group of raw) {
    const category = String(group?.category || '').trim()
    if (!category) return 'Each FAQ group needs a category name.'
    if (!Array.isArray(group?.items) || group.items.length === 0) {
      return `Category "${category}" needs at least one FAQ item.`
    }
    for (const item of group.items) {
      if (!String(item?.id || '').trim()) return `Each FAQ in "${category}" needs an id.`
      if (!String(item?.question || '').trim()) return `Each FAQ in "${category}" needs a question.`
      if (!String(item?.answer || '').trim()) return `Each FAQ in "${category}" needs an answer.`
    }
  }
  return ''
}
