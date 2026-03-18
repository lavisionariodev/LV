'use client'

import { useEffect, useState } from 'react'
import layoutStyles from '../admin.module.css'
import styles from './content.module.css'
import { useSiteContent, upsertSiteContent } from '@/lib/siteContent/client'
import { useToast } from '@/contexts/ToastContext'

const SECTIONS = [
  { id: 'system', label: 'System name' },
  { id: 'hero', label: 'Homepage hero' },
  { id: 'footer', label: 'Footer contact' },
  { id: 'about', label: 'About page copy' },
  { id: 'howItWorks', label: 'How it works copy' },
]

const EMPTY_SITE_CONTENT = {
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
  howItWorks: {
    stepByStep: '',
    comparePackages: '',
    bookAService: '',
    paymentSupport: '',
  },
}

export default function AdminContentPage() {
  const [activeSection, setActiveSection] = useState('system')
  const [draft, setDraft] = useState(EMPTY_SITE_CONTENT)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const { data: loadedContent, isLoading, error } = useSiteContent()
  const toast = useToast()

  useEffect(() => {
    if (loadedContent && !isEditing) {
      setDraft(loadedContent)
    }
  }, [loadedContent, isEditing])

  const handleChange = (section, field, value) => {
    setDraft((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }))
  }

  const handleEdit = () => {
    setIsEditing(true)
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

  const renderSystem = () => (
    <div className={styles.sectionGrid}>
      <label className={styles.label}>
        <span className={styles.labelSpan}>System name / brand</span>
        <input
          type="text"
          value={draft.systemName ?? ''}
          onChange={(e) =>
            setDraft((prev) => ({ ...prev, systemName: e.target.value }))
          }
          className={styles.input}          disabled={!isEditing}        />
      </label>
      <p className={styles.hint}>
        Used in the public navbar, footer, About hero, and copyright.
      </p>
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
        />
      </label>

      <label className={styles.label}>
        <span className={styles.labelSpan}>Subheading</span>
        <textarea
          value={draft.hero?.subheading ?? ''}
          onChange={(e) => handleChange('hero', 'subheading', e.target.value)}
          rows={3}
          className={styles.textarea}
          disabled={!isEditing}
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
          onChange={(e) => handleChange('footer', 'tagline', e.target.value)}
          rows={3}
          className={styles.textarea}
          disabled={!isEditing}
        />
      </label>

      <div className={styles.ctaRow}>
        <label className={styles.label}>
          <span className={styles.labelSpan}>Support phone</span>
          <input
            type="tel"
            value={draft.footer?.supportPhone ?? ''}
            onChange={(e) => handleChange('footer', 'supportPhone', e.target.value)}
            className={styles.input}
            disabled={!isEditing}
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
          />
        </label>
      </div>
    </div>
  )

  const renderAbout = () => {
    const aboutLabels = {
      ourStory: 'Our Story',
      missionVision: 'Mission & Vision',
      description: 'About Us',
      whyUs: 'Why Us',
      partners: 'Our Partners',
      commitment: 'Our Commitment',
    }

    return (
      <div className={styles.sectionGrid}>
        {['ourStory', 'missionVision', 'description', 'whyUs', 'partners', 'commitment'].map(
          (key) => (
            <label key={key} className={styles.label}>
              <span className={styles.labelSpan}>{aboutLabels[key]}</span>
              <textarea
                value={draft.about?.[key] ?? ''}
                onChange={(e) => handleChange('about', key, e.target.value)}
                rows={3}
                className={styles.textarea}
                disabled={!isEditing}
              />
            </label>
          ),
        )}
      </div>
    )
  }

  const renderHowItWorks = () => (
    <div className={styles.sectionGrid}>
      {['stepByStep', 'comparePackages', 'bookAService', 'paymentSupport'].map(
        (key) => (
          <label key={key} className={styles.label}>
            <span className={styles.labelSpan}>{key}</span>
            <textarea
              value={draft.howItWorks?.[key] ?? ''}
              onChange={(e) => handleChange('howItWorks', key, e.target.value)}
              rows={3}
              className={styles.textarea}
              disabled={!isEditing}
            />
          </label>
        ),
      )}
    </div>
  )

  const renderForm = () => {
    switch (activeSection) {
      case 'system':
        return renderSystem()
      case 'hero':
        return renderHero()
      case 'footer':
        return renderFooter()
      case 'about':
        return renderAbout()
      case 'howItWorks':
        return renderHowItWorks()
      default:
        return null
    }
  }

  return (
    <div className={layoutStyles.dashWrap}>
      <section className={layoutStyles.panel}>
        <div className={`${layoutStyles.panelHead} ${styles.panelHeadRow}`}>
          <p className={layoutStyles.panelTitle}>Content management</p>

          <div className={styles.panelActions}>
            {!isEditing ? (
              <button type="button" className={`${styles.primaryBtn}`} onClick={handleEdit}>
                Edit
              </button>
            ) : (
              <div className={styles.actionRow}>
                <button
                  type="button"
                  className={`${styles.primaryBtn}`}
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving…' : 'Save changes'}
                </button>
                <button
                  type="button"
                  className={`${styles.secondaryBtn}`}
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        <div className={styles.layout}>
          <div className={styles.sidebar}>
            {SECTIONS.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className={`${layoutStyles.smallBtn} ${styles.sectionBtn} ${activeSection === section.id ? styles.sectionBtnActive : ''}`}
              >
                {section.label}
              </button>
            ))}
          </div>

          <div className={styles.formArea}>
            {isLoading ? (
              <p className={styles.hint}>Loading site content…</p>
            ) : error ? (
              <p className={styles.hint}>
                There was a problem loading content from Supabase. Showing local defaults for now.
              </p>
            ) : null}

            {renderForm()}

            <p className={styles.footerNote}>
              Changes are saved to your Supabase <code>site_content</code> table and used across the
              public site.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

