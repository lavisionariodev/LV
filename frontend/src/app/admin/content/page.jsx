'use client'

import { useEffect, useState, useRef } from 'react'
import layoutStyles from '../admin.module.css'
import styles from './content.module.css'
import { useSiteContent, upsertSiteContent } from '@/lib/siteContent/client'
import { useToast } from '@/contexts/ToastContext'

const SECTIONS = [
  { id: 'system',     label: 'System name',   icon: '⊛' },
  { id: 'hero',       label: 'Homepage hero', icon: '◈' },
  { id: 'footer',     label: 'Footer contact',icon: '◉' },
  { id: 'about',      label: 'About page',    icon: '◎' },
  { id: 'howItWorks', label: 'How it works',  icon: '◷' },
]

const HOW_IT_WORKS_LABELS = {
  stepByStep:      'Step-by-step guide',
  comparePackages: 'Compare packages',
  bookAService:    'Book a service',
  paymentSupport:  'Payment & support',
}

const ABOUT_LABELS = {
  ourStory:      'Our story',
  missionVision: 'Mission & vision',
  description:   'About us',
  whyUs:         'Why us',
  partners:      'Our partners',
  commitment:    'Our commitment',
}

const EMPTY_SITE_CONTENT = {
  systemName: '',
  hero:       { title: '', subheading: '', primaryCta: '' },
  footer:     { tagline: '', supportPhone: '', supportEmail: '', copyrightText: '' },
  about:      { description: '', ourStory: '', missionVision: '', whyUs: '', partners: '', commitment: '' },
  howItWorks: { stepByStep: '', comparePackages: '', bookAService: '', paymentSupport: '' },
}

export default function AdminContentPage() {
  const [activeSection, setActiveSection] = useState('system')
  const [draft, setDraft]                 = useState(EMPTY_SITE_CONTENT)
  const [isEditing, setIsEditing]         = useState(false)
  const [isSaving, setIsSaving]           = useState(false)
  const { data: loadedContent, isLoading, error } = useSiteContent()
  const toast = useToast()

  useEffect(() => {
    if (loadedContent && !isEditing) setDraft(loadedContent)
  }, [loadedContent, isEditing])

  useEffect(() => {
    // Ensure textareas match their content length on first load / draft updates
    adjustAllTextareas()
  }, [draft, isEditing])

  const contentRefs = useRef(null)

  const adjustTextareaSize = (textarea) => {
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${textarea.scrollHeight}px`
  }

  const adjustAllTextareas = () => {
    if (!contentRefs.current) return
    const textareas = contentRefs.current.querySelectorAll('textarea')
    textareas.forEach((el) => adjustTextareaSize(el))
  }

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

  /* ── Section renderers ── */

  const renderSystem = () => (
    <div className={styles.sectionGrid}>
      <label className={styles.label}>
        <span className={styles.labelSpan}>System name / brand</span>
        <input
          type="text"
          value={draft.systemName ?? ''}
          onChange={(e) => setDraft((prev) => ({ ...prev, systemName: e.target.value }))}
          className={styles.input}
          disabled={!isEditing}
          placeholder="e.g. Servify"
        />
      </label>
    </div>
  )

  const renderHero = () => (
    <div className={styles.sectionGrid}>
      <label className={styles.label}>
        <span className={styles.labelSpan}>Homepage title</span>
        <input
          type="text"
          value={draft.hero?.title ?? ''}
          onChange={(e) => handleChange('hero', 'title', e.target.value)}
          className={styles.input}
          disabled={!isEditing}
          placeholder="Your bold headline"
        />
      </label>
      <label className={styles.label}>
        <span className={styles.labelSpan}>Subheading</span>
        <textarea
          value={draft.hero?.subheading ?? ''}
          onChange={handleTextareaChange('hero', 'subheading')}
          rows={3}
          className={styles.textarea}
          disabled={!isEditing}
          placeholder="Supporting text beneath the title"
        />
      </label>
      <label className={styles.label}>
        <span className={styles.labelSpan}>CTA button label</span>
        <input
          type="text"
          value={draft.hero?.primaryCta ?? ''}
          onChange={(e) => handleChange('hero', 'primaryCta', e.target.value)}
          className={styles.input}
          disabled={!isEditing}
          placeholder="e.g. Get started"
        />
      </label>
    </div>
  )

  const renderFooter = () => (
    <div className={styles.sectionGrid}>
      <label className={styles.label}>
        <span className={styles.labelSpan}>Tagline</span>
        <textarea
          value={draft.footer?.tagline ?? ''}
          onChange={handleTextareaChange('footer', 'tagline')}
          rows={3}
          className={styles.textarea}
          disabled={!isEditing}
          placeholder="Short brand tagline shown in the footer"
        />
      </label>
      <div className={styles.twoCol}>
        <label className={styles.label}>
          <span className={styles.labelSpan}>Support phone</span>
          <input
            type="tel"
            value={draft.footer?.supportPhone ?? ''}
            onChange={(e) => handleChange('footer', 'supportPhone', e.target.value)}
            className={styles.input}
            disabled={!isEditing}
            placeholder="+1 800 000 0000"
          />
        </label>
        <label className={styles.label}>
          <span className={styles.labelSpan}>Support email</span>
          <input
            type="email"
            value={draft.footer?.supportEmail ?? ''}
            onChange={(e) => handleChange('footer', 'supportEmail', e.target.value)}
            className={styles.input}
            disabled={!isEditing}
            placeholder="support@example.com"
          />
        </label>
      </div>
    </div>
  )

  const renderAbout = () => (
    <div className={styles.sectionGrid}>
      {['ourStory', 'missionVision', 'description', 'whyUs', 'partners', 'commitment'].map((key) => (
        <label key={key} className={styles.label}>
          <span className={styles.labelSpan}>{ABOUT_LABELS[key]}</span>
          <textarea
            value={draft.about?.[key] ?? ''}
            onChange={handleTextareaChange('about', key)}
            rows={3}
            className={styles.textarea}
            disabled={!isEditing}
            placeholder={`Write your ${ABOUT_LABELS[key].toLowerCase()} copy here`}
          />
        </label>
      ))}
    </div>
  )

  const renderHowItWorks = () => (
    <div className={styles.sectionGrid}>
      {['stepByStep', 'comparePackages', 'bookAService', 'paymentSupport'].map((key) => (
        <label key={key} className={styles.label}>
          <span className={styles.labelSpan}>{HOW_IT_WORKS_LABELS[key]}</span>
          <textarea
            value={draft.howItWorks?.[key] ?? ''}
            onChange={handleTextareaChange('howItWorks', key)}
            rows={3}
            className={styles.textarea}
            disabled={!isEditing}
            placeholder={`Describe the "${HOW_IT_WORKS_LABELS[key]}" section`}
          />
        </label>
      ))}
    </div>
  )

  const renderForm = () => {
    switch (activeSection) {
      case 'system':     return renderSystem()
      case 'hero':       return renderHero()
      case 'footer':     return renderFooter()
      case 'about':      return renderAbout()
      case 'howItWorks': return renderHowItWorks()
      default:           return null
    }
  }

  const activeMeta = SECTIONS.find((s) => s.id === activeSection)

  return (
    <div className={layoutStyles.dashWrap}>
      <section className={layoutStyles.panel}>

        {/* ── Panel header ── */}
        <div className={`${layoutStyles.panelHead} ${styles.panelHeadRow}`}>
          <p className={layoutStyles.panelTitle}>Content management</p>
          <div className={styles.panelActions}>
            {!isEditing ? (
              <button type="button" className={styles.btnPrimary} onClick={() => setIsEditing(true)}>
                Edit content
              </button>
            ) : (
              <div className={styles.actionRow}>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving…' : 'Save changes'}
                </button>
                <button
                  type="button"
                  className={styles.btnGhost}
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Editing banner ── */}
        {isEditing && (
          <div className={styles.editingBanner}>
            <span className={styles.editingDot} />
            Editing mode — unsaved changes won&apos;t apply until you save.
          </div>
        )}

        <div className={styles.layout}>

          {/* ── Sidebar nav ── */}
          <nav className={styles.sidebar}>
            {SECTIONS.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className={`${styles.navBtn} ${activeSection === section.id ? styles.navBtnActive : ''}`}
              >
                <span className={styles.navIcon}>{section.icon}</span>
                {section.label}
              </button>
            ))}
          </nav>

          {/* ── Form area ── */}
          <div className={styles.formArea} ref={contentRefs}>
            {isLoading && <p className={styles.hint}>Loading site content…</p>}
            {error && !isLoading && (
              <p className={styles.hintError}>
                Could not load content from the server. Showing local defaults.
              </p>
            )}

            {/* Section label row */}
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon}>{activeMeta?.icon}</span>
              <span className={styles.sectionLabel}>{activeMeta?.label}</span>
              {!isEditing && <span className={styles.readOnlyPill}>Read only</span>}
            </div>

            {renderForm()}
          </div>
        </div>
      </section>
    </div>
  )
}