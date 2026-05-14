'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { FiEdit } from 'react-icons/fi'
import { useAdminSiteContent, upsertSiteContent } from '@/lib/siteContent/client'
import { validateSellerHelpFaq } from '@/lib/siteContent/mapping'
import { useAuthToast } from '@/contexts/ToastContext'
import { useMediaQuery } from '@/shared/hooks'
import styles from '../settings.module.css'

const ABOUT_LABELS = {
  ourStory: 'Our story',
  missionVision: 'Mission & vision',
  description: 'About us',
  whyUs: 'Why us',
  partners: 'Our partners',
  commitment: 'Our commitment',
  testimonial1: 'Testimonial card 1',
  testimonial1Name: 'Testimonial card 1 name',
  testimonial1Location: 'Testimonial card 1 location',
  testimonial2: 'Testimonial card 2',
  testimonial2Name: 'Testimonial card 2 name',
  testimonial2Location: 'Testimonial card 2 location',
  testimonial3: 'Testimonial card 3',
  testimonial3Name: 'Testimonial card 3 name',
  testimonial3Location: 'Testimonial card 3 location',
  testimonialFeatured: 'Featured testimonial quote',
}

const ABOUT_HELP = {
  ourStory: 'The founding narrative visitors see on the About page.',
  missionVision: 'Your mission and vision statements.',
  description: 'Short summary of your organization.',
  whyUs: 'Reasons customers choose you.',
  partners: 'Partner or sponsor callouts.',
  commitment: 'Values or promises you stand behind.',
  testimonial1: 'Buyer/family quote shown in the first testimonial card.',
  testimonial1Name: 'Name shown under testimonial card 1.',
  testimonial1Location: 'Location shown under testimonial card 1.',
  testimonial2: 'Buyer/family quote shown in the second testimonial card.',
  testimonial2Name: 'Name shown under testimonial card 2.',
  testimonial2Location: 'Location shown under testimonial card 2.',
  testimonial3: 'Buyer/family quote shown in the third testimonial card.',
  testimonial3Name: 'Name shown under testimonial card 3.',
  testimonial3Location: 'Location shown under testimonial card 3.',
  testimonialFeatured: 'Main highlighted quote shown under the testimonial cards.',
}

const ABOUT_KEYS = ['ourStory', 'missionVision', 'description', 'whyUs', 'partners', 'commitment']

const TESTIMONIAL_GROUPS = [
  {
    title: 'Testimonial card 1',
    textKey: 'testimonial1',
    nameKey: 'testimonial1Name',
    locationKey: 'testimonial1Location',
  },
  {
    title: 'Testimonial card 2',
    textKey: 'testimonial2',
    nameKey: 'testimonial2Name',
    locationKey: 'testimonial2Location',
  },
  {
    title: 'Testimonial card 3',
    textKey: 'testimonial3',
    nameKey: 'testimonial3Name',
    locationKey: 'testimonial3Location',
  },
]

const FOOTER_FIELD_META = {
  tagline: {
    title: 'Footer tagline',
    description: 'Short line shown above the footer links and contact details.',
    placeholder: 'Short brand tagline shown in the footer',
    multiline: true,
  },
  supportPhone: {
    title: 'Support phone',
    description: 'Displayed to customers who need phone help.',
    placeholder: '+1 800 000 0000',
    inputType: 'tel',
  },
  supportEmail: {
    title: 'Support email',
    description: 'Displayed to customers who need email help.',
    placeholder: 'support@example.com',
    inputType: 'email',
  },
}

const EMPTY_SITE_CONTENT = {
  systemName: '',
  footer: { tagline: '', supportPhone: '', supportEmail: '', copyrightText: '' },
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

function SettingsRow({ title, description, children, titleEnd }) {
  return (
    <div className={styles.settingsRow}>
      <div className={styles.settingsRowMeta}>
        <div className={styles.settingsRowTitleRow}>
          <p className={styles.settingsRowTitle}>{title}</p>
          {titleEnd ? <div className={styles.settingsRowTitleEnd}>{titleEnd}</div> : null}
        </div>
        {description ? <p className={styles.settingsRowDesc}>{description}</p> : null}
      </div>
      <div className={styles.settingsRowControl}>{children}</div>
    </div>
  )
}

export default function Page() {
  const isMobile = useMediaQuery('(max-width: 640px)')
  const embeddedInMobileSettings = false
  const profileDetailPage = isMobile
  const hideProgramHead = embeddedInMobileSettings || profileDetailPage
  const [draft, setDraft] = useState(EMPTY_SITE_CONTENT)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [modal, setModal] = useState(null)
  const [modalValue, setModalValue] = useState('')
  const { data: loadedContent, isLoading, error } = useAdminSiteContent()
  const toast = useAuthToast()
  const contentRefs = useRef(null)
  // Track edit-mode in a ref so the loadedContent-sync effect can read the
  // latest value without listing `isEditing` as a dep (intentional: we don't
  // want to resync drafts when entering / leaving edit mode).
  const isEditingRef = useRef(isEditing)
  useEffect(() => {
    isEditingRef.current = isEditing
  }, [isEditing])

  useEffect(() => {
    if (!isMobile) return
    queueMicrotask(() => {
      setIsEditing(false)
    })
  }, [isMobile])

  useEffect(() => {
    // Sync from server payload only when it changes. Avoid re-syncing on
    // local edit-mode toggles, which can temporarily overwrite just-saved
    // draft values with stale hook data until realtime update arrives.
    if (!loadedContent || isEditingRef.current) return
    queueMicrotask(() => {
      setDraft(loadedContent)
    })
  }, [loadedContent])

  const adjustTextareaSize = useCallback((textarea) => {
    if (!textarea) return
    textarea.style.height = '0px'
    textarea.style.overflow = 'hidden'
    const h = textarea.scrollHeight
    textarea.style.height = `${h}px`
    textarea.style.overflow = ''
  }, [])

  const adjustAllTextareas = useCallback(() => {
    if (!contentRefs.current) return
    contentRefs.current.querySelectorAll('textarea').forEach((el) => adjustTextareaSize(el))
  }, [adjustTextareaSize])

  useLayoutEffect(() => {
    adjustAllTextareas()
    const frameId = requestAnimationFrame(() => {
      adjustAllTextareas()
    })
    return () => cancelAnimationFrame(frameId)
  }, [draft, isEditing, isLoading, adjustAllTextareas, isMobile])

  const closeModal = useCallback(() => {
    setModal(null)
    setModalValue('')
  }, [])

  useEffect(() => {
    if (!modal) return
    const onKey = (e) => {
      if (e.key === 'Escape') closeModal()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modal, closeModal])

  const openFieldModal = (spec) => {
    let initial = ''
    if (spec.kind === 'systemName') initial = draft.systemName ?? ''
    else if (spec.kind === 'footer') initial = draft.footer?.[spec.field] ?? ''
    else if (spec.kind === 'about') initial = draft.about?.[spec.key] ?? ''
    else if (spec.kind === 'sellerHelpFaq') initial = JSON.stringify(draft.sellerHelpFaq ?? [], null, 2)
    setModal(spec)
    setModalValue(initial)
  }

  const handleModalSave = async () => {
    if (!modal) return
    let nextDraft = { ...draft }
    if (modal.kind === 'systemName') {
      nextDraft = { ...draft, systemName: modalValue }
    } else if (modal.kind === 'footer') {
      nextDraft = {
        ...draft,
        footer: { ...draft.footer, [modal.field]: modalValue },
      }
    } else if (modal.kind === 'about') {
      nextDraft = {
        ...draft,
        about: { ...draft.about, [modal.key]: modalValue },
      }
    } else if (modal.kind === 'sellerHelpFaq') {
      let parsed = []
      try {
        parsed = JSON.parse(modalValue || '[]')
      } catch {
        toast.error('Seller help FAQ must be valid JSON.')
        return
      }
      const validationError = validateSellerHelpFaq(parsed)
      if (validationError) {
        toast.error(validationError)
        return
      }
      nextDraft = {
        ...draft,
        sellerHelpFaq: parsed,
      }
    }
    try {
      setIsSaving(true)
      const saved = await upsertSiteContent(nextDraft)
      setDraft(saved)
      toast.success('Saved')
      closeModal()
    } catch (e) {
      console.error('Failed to save site content:', e?.message ?? e)
      toast.error(e?.message || 'Failed to save. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const renderMobilePlaceholder = () => (
    <span className={styles.settingsMobilePlaceholder}>Tap edit to add</span>
  )

  const renderMobileValue = (text, multiline) => {
    const t = (text ?? '').trim()
    if (!t) return renderMobilePlaceholder()
    if (multiline) {
      return <div className={styles.settingsMobileValueMultiline}>{text}</div>
    }
    return <span className={styles.settingsMobileValueText}>{text}</span>
  }

  const mobileEditBtn = (label, spec) => (
    <button
      type="button"
      className={styles.settingsMobileIconEditBtn}
      onClick={() => openFieldModal(spec)}
      aria-label={label}
    >
      <FiEdit aria-hidden />
    </button>
  )

  const handleChange = (section, field, value) => {
    setDraft((prev) => ({
      ...prev,
      [section]: { ...prev[section], [field]: value },
    }))
  }

  const handleTextareaChange = (section, field) => (event) => {
    const textarea = event.target
    handleChange(section, field, textarea.value)
    adjustTextareaSize(textarea)
  }

  const handleCancel = () => {
    setDraft(loadedContent || EMPTY_SITE_CONTENT)
    setIsEditing(false)
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      const next = await upsertSiteContent(draft)
      setDraft(next)
      setIsEditing(false)
      toast.success('Site content saved successfully')
    } catch (e) {
      console.error('Failed to save site content:', e?.message ?? e)
      toast.error(e?.message || 'Failed to save site content. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const disabled = !isEditing

  const renderSystem = () => (
    <SettingsRow
      title="System name / brand"
      description="Appears in places that reference your marketplace name."
      titleEnd={isMobile ? mobileEditBtn('Edit system name', { kind: 'systemName' }) : null}
    >
      {isMobile ? (
        <div className={styles.settingsMobileValue}>{renderMobileValue(draft.systemName, false)}</div>
      ) : (
        <input
          type="text"
          value={draft.systemName ?? ''}
          onChange={(e) => setDraft((prev) => ({ ...prev, systemName: e.target.value }))}
          className={styles.settingsFieldInput}
          disabled={disabled}
          placeholder="e.g. Servify"
        />
      )}
    </SettingsRow>
  )

  const renderFooter = () =>
    isMobile ? (
      <>
        <SettingsRow
          title="Footer tagline"
          description="Short line shown above the footer links and contact details."
          titleEnd={mobileEditBtn('Edit footer tagline', { kind: 'footer', field: 'tagline' })}
        >
          <div className={styles.settingsMobileValue}>{renderMobileValue(draft.footer?.tagline, true)}</div>
        </SettingsRow>
        <div className={styles.settingsRow}>
          <div className={styles.settingsRowMeta}>
            <div className={styles.settingsRowTitleRow}>
              <p className={styles.settingsRowTitle}>Support contact</p>
            </div>
            <p className={styles.settingsRowDesc}>Displayed to customers who need phone or email help.</p>
          </div>
          <div className={styles.settingsRowControl}>
            <div className={styles.settingsMobileStack}>
              <div className={styles.settingsMobileLabeledRow}>
                <div className={styles.settingsMobileLabelRow}>
                  <span className={styles.settingsMobileFieldLabel}>Phone</span>
                  {mobileEditBtn('Edit support phone', { kind: 'footer', field: 'supportPhone' })}
                </div>
                <div className={styles.settingsMobileValue}>
                  {renderMobileValue(draft.footer?.supportPhone, false)}
                </div>
              </div>
              <div className={styles.settingsMobileLabeledRow}>
                <div className={styles.settingsMobileLabelRow}>
                  <span className={styles.settingsMobileFieldLabel}>Email</span>
                  {mobileEditBtn('Edit support email', { kind: 'footer', field: 'supportEmail' })}
                </div>
                <div className={styles.settingsMobileValue}>
                  {renderMobileValue(draft.footer?.supportEmail, false)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    ) : (
      <>
        <SettingsRow
          title="Footer tagline"
          description="Short line shown above the footer links and contact details."
        >
          <textarea
            value={draft.footer?.tagline ?? ''}
            onChange={handleTextareaChange('footer', 'tagline')}
            rows={3}
            className={styles.settingsFieldTextarea}
            disabled={disabled}
            placeholder="Short brand tagline shown in the footer"
          />
        </SettingsRow>
        <div className={styles.settingsRow}>
          <div className={styles.settingsRowMeta}>
            <div className={styles.settingsRowTitleRow}>
              <p className={styles.settingsRowTitle}>Support contact</p>
            </div>
            <p className={styles.settingsRowDesc}>Displayed to customers who need phone or email help.</p>
          </div>
          <div className={`${styles.settingsRowControl} ${styles.settingsRowControlPair}`}>
            <input
              type="tel"
              value={draft.footer?.supportPhone ?? ''}
              onChange={(e) => handleChange('footer', 'supportPhone', e.target.value)}
              className={styles.settingsFieldInput}
              disabled={disabled}
              placeholder="+1 800 000 0000"
              aria-label="Support phone"
            />
            <input
              type="email"
              value={draft.footer?.supportEmail ?? ''}
              onChange={(e) => handleChange('footer', 'supportEmail', e.target.value)}
              className={styles.settingsFieldInput}
              disabled={disabled}
              placeholder="support@example.com"
              aria-label="Support email"
            />
          </div>
        </div>
      </>
    )

  const renderAbout = () => (
    <>
      {ABOUT_KEYS.map((key) => (
        <SettingsRow
          key={key}
          title={ABOUT_LABELS[key]}
          description={ABOUT_HELP[key]}
          titleEnd={isMobile ? mobileEditBtn(`Edit ${ABOUT_LABELS[key]}`, { kind: 'about', key }) : null}
        >
          {isMobile ? (
            <div className={styles.settingsMobileValue}>{renderMobileValue(draft.about?.[key], true)}</div>
          ) : (
            <textarea
              value={draft.about?.[key] ?? ''}
              onChange={handleTextareaChange('about', key)}
              rows={1}
              readOnly={!isEditing}
              className={`${styles.settingsFieldTextarea} ${styles.settingsFieldTextareaAbout}`}
              placeholder={`Write your ${ABOUT_LABELS[key].toLowerCase()} copy here`}
            />
          )}
        </SettingsRow>
      ))}

      {TESTIMONIAL_GROUPS.map((group) => (
        <SettingsRow
          key={group.textKey}
          title={group.title}
          description="Include name, location, and testimonial text for this card."
        >
          {isMobile ? (
            <div className={styles.settingsMobileStack}>
              <div className={styles.settingsMobileLabeledRow}>
                <div className={styles.settingsMobileLabelRow}>
                  <span className={styles.settingsMobileFieldLabel}>Name</span>
                  {mobileEditBtn(`Edit ${group.title} name`, { kind: 'about', key: group.nameKey })}
                </div>
                <div className={styles.settingsMobileValue}>
                  {renderMobileValue(draft.about?.[group.nameKey], false)}
                </div>
              </div>
              <div className={styles.settingsMobileLabeledRow}>
                <div className={styles.settingsMobileLabelRow}>
                  <span className={styles.settingsMobileFieldLabel}>Location</span>
                  {mobileEditBtn(`Edit ${group.title} location`, { kind: 'about', key: group.locationKey })}
                </div>
                <div className={styles.settingsMobileValue}>
                  {renderMobileValue(draft.about?.[group.locationKey], false)}
                </div>
              </div>
              <div className={styles.settingsMobileLabeledRow}>
                <div className={styles.settingsMobileLabelRow}>
                  <span className={styles.settingsMobileFieldLabel}>Testimonial</span>
                  {mobileEditBtn(`Edit ${group.title} testimonial`, { kind: 'about', key: group.textKey })}
                </div>
                <div className={styles.settingsMobileValue}>
                  {renderMobileValue(draft.about?.[group.textKey], true)}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              <div className={styles.settingsRowControlPair}>
                <input
                  type="text"
                  value={draft.about?.[group.nameKey] ?? ''}
                  onChange={(e) => handleChange('about', group.nameKey, e.target.value)}
                  className={styles.settingsFieldInput}
                  disabled={disabled}
                  placeholder="Name"
                  aria-label={`${group.title} name`}
                />
                <input
                  type="text"
                  value={draft.about?.[group.locationKey] ?? ''}
                  onChange={(e) => handleChange('about', group.locationKey, e.target.value)}
                  className={styles.settingsFieldInput}
                  disabled={disabled}
                  placeholder="Location"
                  aria-label={`${group.title} location`}
                />
              </div>
              <textarea
                value={draft.about?.[group.textKey] ?? ''}
                onChange={handleTextareaChange('about', group.textKey)}
                rows={2}
                readOnly={!isEditing}
                className={`${styles.settingsFieldTextarea} ${styles.settingsFieldTextareaAbout}`}
                placeholder={`Write ${group.title.toLowerCase()} testimonial`}
              />
            </div>
          )}
        </SettingsRow>
      ))}

      <SettingsRow
        title={ABOUT_LABELS.testimonialFeatured}
        description={ABOUT_HELP.testimonialFeatured}
        titleEnd={
          isMobile
            ? mobileEditBtn(`Edit ${ABOUT_LABELS.testimonialFeatured}`, {
                kind: 'about',
                key: 'testimonialFeatured',
              })
            : null
        }
      >
        {isMobile ? (
          <div className={styles.settingsMobileValue}>
            {renderMobileValue(draft.about?.testimonialFeatured, true)}
          </div>
        ) : (
          <textarea
            value={draft.about?.testimonialFeatured ?? ''}
            onChange={handleTextareaChange('about', 'testimonialFeatured')}
            rows={2}
            readOnly={!isEditing}
            className={`${styles.settingsFieldTextarea} ${styles.settingsFieldTextareaAbout}`}
            placeholder="Write featured testimonial quote"
          />
        )}
      </SettingsRow>
    </>
  )

  const renderSellerHelpFaq = () => {
    const sellerHelpFaqEditBtn = mobileEditBtn('Edit seller help FAQ', { kind: 'sellerHelpFaq' })
    const sellerHelpFaqSummary = (
      <div className={styles.settingsMobileValue}>
        {(draft.sellerHelpFaq ?? []).length} categories configured
      </div>
    )

    return (
      <SettingsRow
        title="Seller help FAQ"
        description="CMS-managed seller help categories and questions. Leave empty to use built-in defaults."
        titleEnd={isMobile ? sellerHelpFaqEditBtn : null}
      >
        {isMobile ? (
          sellerHelpFaqSummary
        ) : (
          <div className={styles.settingsSellerFaqDesktopRow}>
            {sellerHelpFaqSummary}
            {sellerHelpFaqEditBtn}
          </div>
        )}
      </SettingsRow>
    )
  }

  const modalMeta = (() => {
    if (!modal) return null
    if (modal.kind === 'systemName') {
      return {
        title: 'System name / brand',
        description: 'Appears in places that reference your marketplace name.',
        placeholder: 'e.g. Servify',
        multiline: false,
        inputType: 'text',
      }
    }
    if (modal.kind === 'footer') return FOOTER_FIELD_META[modal.field]
    if (modal.kind === 'about') {
      const isSingleLine = modal.key.endsWith('Name') || modal.key.endsWith('Location')
      return {
        title: ABOUT_LABELS[modal.key],
        description: ABOUT_HELP[modal.key],
        placeholder: `Write your ${ABOUT_LABELS[modal.key].toLowerCase()} copy here`,
        multiline: !isSingleLine,
        inputType: isSingleLine ? 'text' : undefined,
      }
    }
    if (modal.kind === 'sellerHelpFaq') {
      return {
        title: 'Seller help FAQ',
        description: 'Categories and questions shown on the seller help page.',
        placeholder:
          '[{"category":"Getting Started","items":[{"id":"gs_1","question":"...","answer":"..."}]}]',
        multiline: true,
      }
    }
    return null
  })()

  return (
    <section
      className={
        embeddedInMobileSettings
          ? `${styles.settingsProgram} ${styles.settingsProgramMobileEmbedded}`
          : `${styles.settingsProgram} ${profileDetailPage ? styles.settingsProgramBorderless : ''}`
      }
    >
      {!hideProgramHead && (
        <header className={styles.settingsProgramHead}>
          <div className={styles.settingsProgramHeadText}>
            <h1 className={styles.settingsProgramTitle}>Site content</h1>
            <p className={styles.settingsProgramSubtitle}>View and update copy shown across your public pages.</p>
          </div>
          {!isMobile && (
            <div className={styles.settingsProgramActions}>
              {!isEditing ? (
                <button
                  type="button"
                  className={styles.primaryBtn}
                  onClick={() => setIsEditing(true)}
                  aria-label="Edit site content"
                >
                  Edit
                </button>
              ) : (
                <>
                  <button type="button" className={styles.secondaryBtn} onClick={handleCancel} disabled={isSaving}>
                    Cancel
                  </button>
                  <button type="button" className={styles.primaryBtn} onClick={handleSave} disabled={isSaving}>
                    {isSaving ? 'Saving…' : 'Save changes'}
                  </button>
                </>
              )}
            </div>
          )}
        </header>
      )}

      {isEditing && !isMobile && (
        <div className={styles.settingsEditBanner} role="status">
          <span className={styles.settingsEditDot} aria-hidden />
          Editing — save to apply changes to the live site.
        </div>
      )}

      <div className={styles.settingsProgramBody} ref={contentRefs}>
        {isLoading ? (
          <div role="status" aria-live="polite" aria-busy="true" aria-label="Loading site content">
            {[0, 1, 2].map((i) => (
              <div key={i} className={styles.settingsSkSiteSection}>
                <span className={`${styles.settingsSkBar} ${styles.settingsSkSiteH2}`} />
                <span className={`${styles.settingsSkBar} ${styles.settingsSkSiteBlock}`} />
                <span className={`${styles.settingsSkBar} ${styles.settingsSkSiteBlockTall}`} />
              </div>
            ))}
          </div>
        ) : (
          <>
            {error && (
              <p className={styles.settingsHintWarn}>Could not load content from the server. Showing local defaults.</p>
            )}
            <div className={styles.settingsRowList}>
              <section className={styles.settingsContentSection} aria-labelledby="site-content-system-heading">
                <h2 id="site-content-system-heading" className={styles.settingsContentSectionTitle}>
                  System name
                </h2>
                {renderSystem()}
              </section>
              <section className={styles.settingsContentSection} aria-labelledby="site-content-about-heading">
                <h2 id="site-content-about-heading" className={styles.settingsContentSectionTitle}>
                  About page
                </h2>
                {renderAbout()}
              </section>
              <section className={styles.settingsContentSection} aria-labelledby="site-content-footer-heading">
                <h2 id="site-content-footer-heading" className={styles.settingsContentSectionTitle}>
                  Footer contact
                </h2>
                {renderFooter()}
              </section>
              <section className={styles.settingsContentSection} aria-labelledby="site-content-seller-help-heading">
                <h2 id="site-content-seller-help-heading" className={styles.settingsContentSectionTitle}>
                  Seller help FAQ
                </h2>
                {renderSellerHelpFaq()}
              </section>
            </div>
          </>
        )}
      </div>

      {modal && modalMeta && (
        <div className={styles.siteContentModalRoot} role="dialog" aria-modal="true" aria-labelledby="site-content-field-modal-title">
          <button type="button" className={styles.siteContentModalBackdrop} onClick={closeModal} aria-label="Close" />
          <div className={styles.siteContentModal}>
            <h2 id="site-content-field-modal-title" className={styles.siteContentModalTitle}>
              {modalMeta.title}
            </h2>
            {modalMeta.multiline ? (
              <textarea
                value={modalValue}
                onChange={(e) => setModalValue(e.target.value)}
                className={styles.siteContentModalTextarea}
                rows={8}
                placeholder={modalMeta.placeholder}
              />
            ) : (
              <input
                type={modalMeta.inputType || 'text'}
                value={modalValue}
                onChange={(e) => setModalValue(e.target.value)}
                className={styles.siteContentModalInput}
                placeholder={modalMeta.placeholder}
              />
            )}
            <div className={styles.siteContentModalActions}>
              <button
                type="button"
                className={`${styles.sheetHeaderTextBtn} ${styles.sheetHeaderTextBtnCancel}`}
                onClick={closeModal}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`${styles.sheetHeaderTextBtn} ${styles.sheetHeaderTextBtnSave}`}
                onClick={handleModalSave}
                disabled={isSaving}
              >
                {isSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
