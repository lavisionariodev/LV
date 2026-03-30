// Minimal default shape when DB has no row or null columns. All content comes from `site_content` table.
const DEFAULT_SITE_CONTENT = {
  systemName: '',
  hero: {
    title: '',
    subheading: '',
    primaryCta: '',
  },
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
  },
}

// Map a Supabase row from `site_content` into the nested `siteContent` shape
// used throughout the frontend (and by the admin content page).
export function rowToSiteContent(row) {
  if (!row) return DEFAULT_SITE_CONTENT

  return {
    systemName: row.system_name ?? DEFAULT_SITE_CONTENT.systemName,
    hero: {
      title: row.hero_title ?? DEFAULT_SITE_CONTENT.hero.title,
      subheading: row.hero_subheading ?? DEFAULT_SITE_CONTENT.hero.subheading,
      primaryCta: row.hero_primary_cta ?? DEFAULT_SITE_CONTENT.hero.primaryCta,
    },
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
    },
  }
}

// Map the nested `siteContent` shape back into a flat row for `site_content`.
export function siteContentToRow(content) {
  const src = content ?? DEFAULT_SITE_CONTENT

  return {
    system_name: src.systemName,

    hero_title: src.hero?.title ?? null,
    hero_subheading: src.hero?.subheading ?? null,
    hero_primary_cta: src.hero?.primaryCta ?? null,

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
  }
}

