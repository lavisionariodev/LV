// Minimal default shape when DB has no row or null columns. All content comes from `site_content` table.
const DEFAULT_SITE_CONTENT = {
  systemName: '',
  hero: {
    title: '',
    subheading: '',
    primaryCta: '',
    secondaryCta: '',
  },
  footer: {
    tagline: '',
    supportPhone: '',
    supportEmail: '',
    copyrightText: '',
  },
  about: {
    ourStory: '',
    missionVision: '',
    whyLaVisionario: '',
    partners: '',
    testimonials: '',
  },
  howItWorks: {
    stepByStep: '',
    comparePackages: '',
    bookAService: '',
    paymentSupport: '',
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
      secondaryCta:
        row.hero_secondary_cta ?? DEFAULT_SITE_CONTENT.hero.secondaryCta,
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
      ourStory: row.about_our_story ?? DEFAULT_SITE_CONTENT.about.ourStory,
      missionVision:
        row.about_mission_vision ?? DEFAULT_SITE_CONTENT.about.missionVision,
      whyLaVisionario:
        row.about_why_la_visionario ??
        DEFAULT_SITE_CONTENT.about.whyLaVisionario,
      partners: row.about_partners ?? DEFAULT_SITE_CONTENT.about.partners,
      testimonials:
        row.about_testimonials ?? DEFAULT_SITE_CONTENT.about.testimonials,
    },
    howItWorks: {
      stepByStep:
        row.how_step_by_step ?? DEFAULT_SITE_CONTENT.howItWorks.stepByStep,
      comparePackages:
        row.how_compare_packages ??
        DEFAULT_SITE_CONTENT.howItWorks.comparePackages,
      bookAService:
        row.how_book_service ?? DEFAULT_SITE_CONTENT.howItWorks.bookAService,
      paymentSupport:
        row.how_payment_support ??
        DEFAULT_SITE_CONTENT.howItWorks.paymentSupport,
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
    hero_secondary_cta: src.hero?.secondaryCta ?? null,

    footer_tagline: src.footer?.tagline ?? null,
    footer_support_phone: src.footer?.supportPhone ?? null,
    footer_support_email: src.footer?.supportEmail ?? null,
    footer_copyright_text: src.footer?.copyrightText ?? null,

    about_our_story: src.about?.ourStory ?? null,
    about_mission_vision: src.about?.missionVision ?? null,
    about_why_la_visionario: src.about?.whyLaVisionario ?? null,
    about_partners: src.about?.partners ?? null,
    about_testimonials: src.about?.testimonials ?? null,

    how_step_by_step: src.howItWorks?.stepByStep ?? null,
    how_compare_packages: src.howItWorks?.comparePackages ?? null,
    how_book_service: src.howItWorks?.bookAService ?? null,
    how_payment_support: src.howItWorks?.paymentSupport ?? null,
  }
}

