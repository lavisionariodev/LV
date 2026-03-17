import { siteContent as defaultSiteContent } from '@/data/adminSampleData'

// Map a Supabase row from `site_content` into the nested `siteContent` shape
// used throughout the frontend (and by the admin content page).
export function rowToSiteContent(row) {
  if (!row) return defaultSiteContent

  return {
    systemName: row.system_name ?? defaultSiteContent.systemName,
    hero: {
      title: row.hero_title ?? defaultSiteContent.hero.title,
      subheading: row.hero_subheading ?? defaultSiteContent.hero.subheading,
      primaryCta: row.hero_primary_cta ?? defaultSiteContent.hero.primaryCta,
      secondaryCta:
        row.hero_secondary_cta ?? defaultSiteContent.hero.secondaryCta,
    },
    footer: {
      tagline: row.footer_tagline ?? defaultSiteContent.footer.tagline,
      supportPhone:
        row.footer_support_phone ?? defaultSiteContent.footer.supportPhone,
      supportEmail:
        row.footer_support_email ?? defaultSiteContent.footer.supportEmail,
      copyrightText:
        row.footer_copyright_text ?? defaultSiteContent.footer.copyrightText,
    },
    about: {
      ourStory: row.about_our_story ?? defaultSiteContent.about.ourStory,
      missionVision:
        row.about_mission_vision ?? defaultSiteContent.about.missionVision,
      whyLaVisionario:
        row.about_why_la_visionario ??
        defaultSiteContent.about.whyLaVisionario,
      partners: row.about_partners ?? defaultSiteContent.about.partners,
      testimonials:
        row.about_testimonials ?? defaultSiteContent.about.testimonials,
    },
    howItWorks: {
      stepByStep:
        row.how_step_by_step ?? defaultSiteContent.howItWorks.stepByStep,
      comparePackages:
        row.how_compare_packages ??
        defaultSiteContent.howItWorks.comparePackages,
      bookAService:
        row.how_book_service ?? defaultSiteContent.howItWorks.bookAService,
      paymentSupport:
        row.how_payment_support ??
        defaultSiteContent.howItWorks.paymentSupport,
    },
  }
}

// Map the nested `siteContent` shape back into a flat row for `site_content`.
export function siteContentToRow(content) {
  const src = content ?? defaultSiteContent

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

