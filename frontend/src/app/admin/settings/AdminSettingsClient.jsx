'use client'

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase/client'
import styles from './settings.module.css'
import { FaUser } from 'react-icons/fa6'
import { FiEdit, FiUpload } from 'react-icons/fi'
import { MdCheckCircle, MdErrorOutline } from 'react-icons/md'
import { validateNewPassword } from '@/lib/validators/authSchemas'
import { fetchCurrentAdminProfile } from '@/features/admin/settings/getAdminProfile'
import { useMediaQuery } from '@/shared/hooks'
import { commission } from '@/data/adminSampleData'
import { useSiteContent, upsertSiteContent } from '@/lib/siteContent/client'
import { useToast } from '@/contexts/ToastContext'
import loadingStyles from '../admin-loading.module.css'
import { normalizeSettingsTab } from './adminSettingsTabs'

/* ─────────────────────────────────────────────────────────────────────────────
   Constants
   ───────────────────────────────────────────────────────────────────────────── */

const AVATARS_BUCKET = 'avatars'
const MAX_MB = 2
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']

/* ─────────────────────────────────────────────────────────────────────────────
   Billing Settings Panel
   ───────────────────────────────────────────────────────────────────────────── */

function formatRuleDate(isoDate) {
  if (!isoDate) return '—'
  try {
    return new Date(isoDate + (isoDate.length === 10 ? 'T12:00:00' : '')).toLocaleDateString(
      undefined,
      { year: 'numeric', month: 'short', day: 'numeric' },
    )
  } catch {
    return isoDate
  }
}

export function AdminBillingSettingsPanel({ variant = 'default' }) {
  const isSheet = variant === 'sheet'
  const isProfileDetail = variant === 'profileDetail'
  const rule = commission.defaultRule
  const overrideCount = commission.sellerOverrides?.length ?? 0

  const wrapClass = isSheet
    ? styles.settingsSheetEmbed
    : `${styles.card} ${styles.full} ${isProfileDetail ? styles.cardBorderless : ''}`

  return (
    <section className={wrapClass}>
      {!isSheet && !isProfileDetail && (
        <div className={styles.tabDetailHead}>
          <div className={styles.tabDetailHeadRow}>
            <div className={styles.tabDetailHeadText}>
              <h2 className={styles.tabDetailTitle}>Platform billing</h2>
              <p className={styles.tabDetailSubtitle}>
                Commission and settlement for the marketplace. Day-to-day payouts and orders are
                managed under Payouts.
              </p>
            </div>
          </div>
        </div>
      )}
      {isSheet && (
        <p className={styles.settingsSheetLead}>
          Commission and settlement for the marketplace. Day-to-day payouts and orders are managed
          under Payouts.
        </p>
      )}

      <div className={styles.billingStack}>
        <div className={styles.billingSection}>
          <h3 className={styles.billingSectionTitle}>Platform commission</h3>
          <p className={styles.billingSectionLead}>
            Default share of each successful order between buyers and sellers that applies before
            any seller-specific rate.
          </p>
          <dl className={styles.billingDl}>
            <div className={styles.billingDlRow}>
              <dt>Default rate</dt>
              <dd>{rule.percentage}%</dd>
            </div>
            <div className={styles.billingDlRow}>
              <dt>Rule</dt>
              <dd>{rule.name}</dd>
            </div>
            <div className={styles.billingDlRow}>
              <dt>Effective from</dt>
              <dd>{formatRuleDate(rule.effectiveFrom)}</dd>
            </div>
            <div className={styles.billingDlRow}>
              <dt>Seller overrides</dt>
              <dd>
                {overrideCount} active override{overrideCount === 1 ? '' : 's'}
              </dd>
            </div>
          </dl>
          <Link href="/admin/sellers" className={styles.billingCta}>
            Manage seller-specific rates →
          </Link>
        </div>

        <div className={styles.billingSection}>
          <h3 className={styles.billingSectionTitle}>Settlement</h3>
          <p className={styles.billingSectionLead}>
            Bank or e-wallet details where the platform receives its commission will appear here
            once treasury setup is connected.
          </p>
          <div className={styles.billingPlaceholder} role="status">
            Not configured yet
          </div>
          <Link href="/admin/payouts" className={styles.billingCta}>
            View payout activity →
          </Link>
        </div>

        <div className={styles.billingSection}>
          <h3 className={styles.billingSectionTitle}>Legal and invoicing</h3>
          <p className={styles.billingSectionLead}>
            Registered business name, address, tax ID, and billing contact for official documents.
          </p>
          <div className={styles.billingPlaceholder} role="status">
            Not configured yet — stored data will appear here after setup.
          </div>
        </div>

        <div className={styles.billingQuickLinks} aria-label="Related admin pages">
          <span className={styles.billingQuickLinksLabel}>Quick links</span>
          <div className={styles.billingQuickLinksRow}>
            <Link href="/admin/analytics" className={styles.billingQuickLink}>
              Analytics
            </Link>
            <span className={styles.billingQuickLinksSep} aria-hidden />
            <Link href="/admin/payouts" className={styles.billingQuickLink}>
              Payouts
            </Link>
            <span className={styles.billingQuickLinksSep} aria-hidden />
            <Link href="/admin/sellers" className={styles.billingQuickLink}>
              Sellers
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Notification Preferences Panel
   ───────────────────────────────────────────────────────────────────────────── */

const CATEGORY_KEYS = ['order', 'approval', 'alert', 'announcement']

const CATEGORIES = [
  {
    key: 'order',
    title: 'Orders & bookings',
    description:
      'Notifications for new orders, completions, and booking-related activity.',
  },
  {
    key: 'approval',
    title: 'Sellers & approvals',
    description:
      'Seller registrations, approvals, and listing-related review activity.',
  },
  {
    key: 'alert',
    title: 'Alerts & disputes',
    description:
      'Disputes, payout reviews, and other urgent operational alerts.',
  },
  {
    key: 'announcement',
    title: 'Announcements & updates',
    description:
      'Maintenance windows, product updates, and platform messages.',
  },
]

const CHANNELS = [
  { id: 'push', label: 'Push', hint: 'In-app notification' },
  { id: 'email', label: 'Email', hint: null },
  {
    id: 'sms',
    label: 'SMS',
    hint: 'Not available yet',
    disabled: true,
  },
]

function defaultPrefs() {
  const o = {}
  for (const key of CATEGORY_KEYS) {
    o[key] = { push: true, email: true, sms: false }
  }
  return o
}

function mergePrefs(raw) {
  const base = defaultPrefs()
  if (!raw || typeof raw !== 'object') return base
  for (const key of CATEGORY_KEYS) {
    const row = raw[key]
    if (row && typeof row === 'object') {
      base[key] = {
        push: Boolean(row.push),
        email: Boolean(row.email),
        sms: false,
      }
    }
  }
  return base
}

function PrefSwitch({ checked, onToggle, disabled, labelledBy }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      disabled={disabled}
      className={`${styles.notifPrefSwitch} ${checked ? styles.notifPrefSwitchOn : ''} ${disabled ? styles.notifPrefSwitchDisabled : ''}`}
      onClick={() => !disabled && onToggle(!checked)}
    >
      <span className={styles.notifPrefSwitchThumb} aria-hidden />
    </button>
  )
}

export const AdminNotificationPreferencesPanel = forwardRef(function AdminNotificationPreferencesPanel(
  { variant = 'default' },
  ref,
) {
  const isSheet = variant === 'sheet'
  const isProfileDetail = variant === 'profileDetail'
  const [prefs, setPrefs] = useState(() => defaultPrefs())
  const prefsRef = useRef(prefs)
  prefsRef.current = prefs
  const [loading, setLoading] = useState(true)
  const [saveError, setSaveError] = useState('')
  const adminIdRef = useRef(null)
  const saveTimerRef = useRef(null)

  useImperativeHandle(
    ref,
    () => ({
      async flushPendingSave() {
        const id = adminIdRef.current
        if (!id) return
        if (saveTimerRef.current) {
          clearTimeout(saveTimerRef.current)
          saveTimerRef.current = null
        }
        setSaveError('')
        const next = prefsRef.current
        const { error } = await supabase
          .from('admins')
          .update({
            notification_preferences: next,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
        if (error) {
          setSaveError(error.message || 'Could not save preferences.')
          throw error
        }
      },
    }),
    [],
  )

  useEffect(() => {
    let cancelled = false
    async function load() {
      setSaveError('')
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()
        if (userError || !user) throw new Error('Not authenticated.')
        adminIdRef.current = user.id

        const { data, error } = await supabase
          .from('admins')
          .select('notification_preferences')
          .eq('id', user.id)
          .single()

        if (error) throw error
        if (!cancelled) {
          setPrefs(mergePrefs(data?.notification_preferences))
        }
      } catch (e) {
        if (!cancelled) setSaveError(e.message || 'Failed to load preferences.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const persist = useCallback((next) => {
    const id = adminIdRef.current
    if (!id) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      setSaveError('')
      const { error } = await supabase
        .from('admins')
        .update({
          notification_preferences: next,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
      if (error) setSaveError(error.message || 'Could not save preferences.')
    }, 350)
  }, [])

  useEffect(
    () => () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    },
    [],
  )

  const setChannel = (categoryKey, channelId, value) => {
    if (channelId === 'sms') return
    setPrefs((prev) => {
      const next = {
        ...prev,
        [categoryKey]: {
          ...prev[categoryKey],
          [channelId]: value,
        },
      }
      persist(next)
      return next
    })
  }

  const wrapClass = isSheet
    ? styles.settingsSheetEmbed
    : `${styles.card} ${styles.full} ${isProfileDetail ? styles.cardBorderless : ''}`

  if (loading) {
    return (
      <section className={wrapClass}>
        <div
          className={`${loadingStyles.root} ${loadingStyles.variantCard}`}
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <span className={loadingStyles.spinner} aria-hidden />
          <span className={loadingStyles.label}>Loading notification settings</span>
        </div>
      </section>
    )
  }

  return (
    <section className={wrapClass}>
      {!isSheet && !isProfileDetail && (
        <div className={styles.tabDetailHead}>
          <div className={styles.tabDetailHeadRow}>
            <div className={styles.tabDetailHeadText}>
              <h2 className={styles.tabDetailTitle}>Notification settings</h2>
              <p className={styles.tabDetailSubtitle}>
                We may still send important account and security messages outside of
                these preferences.
              </p>
            </div>
          </div>
        </div>
      )}
      {isSheet && (
        <p className={styles.settingsSheetLead}>
          We may still send important account and security messages outside of these preferences.
        </p>
      )}

      <div
        className={`${styles.notifPrefList} ${isSheet || isProfileDetail ? styles.notifPrefListSheet : ''}`}
      >
        {CATEGORIES.map((cat, index) => (
          <div
            key={cat.key}
            className={`${styles.notifPrefRow} ${isSheet || isProfileDetail ? styles.notifPrefRowSheet : ''} ${index < CATEGORIES.length - 1 ? styles.notifPrefRowBorder : ''}`}
          >
            <div className={styles.notifPrefMeta}>
              <p className={styles.notifPrefTitle}>{cat.title}</p>
              <p className={styles.notifPrefDesc}>{cat.description}</p>
            </div>
            <div className={styles.notifPrefControls} role="group" aria-label={`${cat.title} channels`}>
              {CHANNELS.map((ch) => {
                const switchId = `notif_${cat.key}_${ch.id}`
                const checked = Boolean(prefs[cat.key]?.[ch.id])
                return (
                  <div key={ch.id} className={styles.notifPrefChannel}>
                    <div className={styles.notifPrefChannelLabel}>
                      <span id={switchId} className={styles.notifPrefChannelName}>
                        {ch.label}
                      </span>
                      {ch.hint ? (
                        <span className={styles.notifPrefChannelHint}>{ch.hint}</span>
                      ) : null}
                    </div>
                    <PrefSwitch
                      labelledBy={switchId}
                      checked={ch.disabled ? false : checked}
                      disabled={ch.disabled}
                      onToggle={(v) => setChannel(cat.key, ch.id, v)}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {saveError ? (
        <p className={styles.notifPrefError} role="alert">
          {saveError}
        </p>
      ) : null}

      <div className={styles.notifPrefFooter}>
        <Link href="/admin/notifications" className={styles.notificationsCta}>
          View all notifications →
        </Link>
      </div>
    </section>
  )
})

AdminNotificationPreferencesPanel.displayName = 'AdminNotificationPreferencesPanel'

/* ─────────────────────────────────────────────────────────────────────────────
   Site Content Panel
   ───────────────────────────────────────────────────────────────────────────── */

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

export function AdminSiteContentPanel({
  embeddedInMobileSettings = false,
  profileDetailPage = false,
}) {
  const isMobile = useMediaQuery('(max-width: 640px)')
  const hideProgramHead = embeddedInMobileSettings || profileDetailPage
  const [draft, setDraft] = useState(EMPTY_SITE_CONTENT)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [modal, setModal] = useState(null)
  const [modalValue, setModalValue] = useState('')
  const { data: loadedContent, isLoading, error } = useSiteContent()
  const toast = useToast()
  const contentRefs = useRef(null)

  useEffect(() => {
    if (isMobile) setIsEditing(false)
  }, [isMobile])

  useEffect(() => {
    // Sync from server payload only when it changes. Avoid re-syncing on
    // local edit-mode toggles, which can temporarily overwrite just-saved
    // draft values with stale hook data until realtime update arrives.
    if (loadedContent && !isEditing) setDraft(loadedContent)
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
          <div
            className={`${loadingStyles.root} ${loadingStyles.variantEmbed}`}
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            <span className={loadingStyles.spinner} aria-hidden />
            <span className={loadingStyles.label}>Loading site content</span>
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

/* ─────────────────────────────────────────────────────────────────────────────
   Admin Settings Client (main)
   ───────────────────────────────────────────────────────────────────────────── */

export default function AdminSettingsClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fileRef = useRef(null)
  const avatarPreviewRef = useRef('')
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [isEditingPersonal, setIsEditingPersonal] = useState(false)
  const [profile, setProfile] = useState(null)
  const [draftFirstName, setDraftFirstName] = useState('')
  const [draftLastName, setDraftLastName] = useState('')
  const [draftEmail, setDraftEmail] = useState('')
  const [draftSmsPhone, setDraftSmsPhone] = useState('')
  const [avatarPreview, setAvatarPreview] = useState('')
  const [personalStatus, setPersonalStatus] = useState('')
  const [personalError, setPersonalError] = useState('')
  const [avatarLoading, setAvatarLoading] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passStatus, setPassStatus] = useState('')
  const [passError, setPassError] = useState('')
  const [isEditingPassword, setIsEditingPassword] = useState(false)

  const isMobile = useMediaQuery('(max-width: 640px)')

  useEffect(() => {
    if (!isMobile) return
    const q = searchParams.toString()
    router.replace(q ? `/admin/profile?${q}` : '/admin/profile', { scroll: false })
  }, [isMobile, router, searchParams])

  useEffect(() => {
    let cancelled = false
    async function loadProfile() {
      setLoading(true)
      setPersonalError('')
      setPersonalStatus('')
      try {
        const data = await fetchCurrentAdminProfile()
        if (cancelled) return
        setProfile(data)
        setDraftFirstName(data.firstName || (data.fullName || '').trim().split(' ')[0] || '')
        setDraftLastName(
          data.lastName ||
            (() => {
              const parts = (data.fullName || '').trim().split(' ').filter(Boolean)
              return parts.length > 1 ? parts.slice(1).join(' ') : ''
            })(),
        )
        setDraftEmail(data.email || '')
        setDraftSmsPhone(data.smsPhone || '')
      } catch (err) {
        if (!cancelled) setPersonalError(err.message || 'Failed to load profile.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadProfile()
    return () => {
      cancelled = true
      if (avatarPreviewRef.current) URL.revokeObjectURL(avatarPreviewRef.current)
    }
  }, [])

  const validateImage = (file) => {
    if (!file) return 'No file selected.'
    if (!ALLOWED.includes(file.type)) return 'Only PNG, JPG, or WEBP images are allowed.'
    const mb = file.size / (1024 * 1024)
    if (mb > MAX_MB) return `Image must be ${MAX_MB}MB or less.`
    return ''
  }

  const validateEmail = (value) => {
    const v = value.trim()
    if (!v) return 'Please enter a valid email.'
    if (!/^\S+@\S+\.\S+$/.test(v)) return 'Please enter a valid email format.'
    return ''
  }

  const validateFirstName = (value) => {
    const v = String(value || '').trim()
    if (!v) return 'Please enter your first name.'
    if (v.length < 2) return 'First name is too short.'
    return ''
  }

  const validateSmsPhone = (value) => {
    const v = value.trim()
    if (!v) return ''
    const digits = v.replace(/\D/g, '')
    if (digits.length < 7) return 'Enter a valid phone number (at least 7 digits).'
    if (digits.length > 15) return 'Phone number is too long.'
    return ''
  }

  const onPickAvatar = async (e) => {
    setPersonalError('')
    setPersonalStatus('')
    const file = e.target.files?.[0]
    if (!file) return
    const error = validateImage(file)
    if (error) {
      setPersonalError(error)
      return
    }
    if (!profile) {
      setPersonalError('Profile is not loaded yet.')
      return
    }
    if (avatarPreviewRef.current) URL.revokeObjectURL(avatarPreviewRef.current)
    const url = URL.createObjectURL(file)
    avatarPreviewRef.current = url
    setAvatarPreview(url)
    try {
      setAvatarLoading(true)
      const fileExt = file.name.split('.').pop()
      const fileName = `avatar-${Date.now()}.${fileExt}`
      const filePath = `${profile.id}/${fileName}`
      if (profile.avatarPath) {
        await supabase.storage.from(AVATARS_BUCKET).remove([profile.avatarPath])
      }
      const { error: uploadError } = await supabase.storage
        .from(AVATARS_BUCKET)
        .upload(filePath, file, { upsert: true, cacheControl: '3600' })
      if (uploadError) throw uploadError
      const { error: updateError } = await supabase
        .from('admins')
        .update({ avatar_url: filePath, updated_at: new Date().toISOString() })
        .eq('id', profile.id)
      if (updateError) throw updateError
      const { data: { publicUrl } } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(filePath)
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', profile.id)
      setProfile((prev) => (prev ? { ...prev, avatarPath: filePath, avatarUrl: publicUrl } : prev))
      setPersonalStatus('Avatar updated successfully.')
    } catch (err) {
      setPersonalError(err.message || 'Failed to upload avatar.')
    } finally {
      setAvatarLoading(false)
    }
  }

  const onRemoveAvatar = async () => {
    setPersonalError('')
    setPersonalStatus('')
    if (!profile || (!profile.avatarPath && !profile.avatarUrl)) return
    if (avatarPreviewRef.current) {
      URL.revokeObjectURL(avatarPreviewRef.current)
      avatarPreviewRef.current = ''
      setAvatarPreview('')
    }
    if (fileRef.current) fileRef.current.value = ''
    try {
      setAvatarLoading(true)
      if (profile.avatarPath) {
        await supabase.storage.from(AVATARS_BUCKET).remove([profile.avatarPath])
      }
      const { error } = await supabase
        .from('admins')
        .update({ avatar_url: null, updated_at: new Date().toISOString() })
        .eq('id', profile.id)
      if (error) throw error
      await supabase.from('profiles').update({ avatar_url: null }).eq('id', profile.id)
      setProfile((prev) => (prev ? { ...prev, avatarPath: null, avatarUrl: null } : prev))
      setPersonalStatus('Avatar removed.')
    } catch (err) {
      setPersonalError(err.message || 'Failed to remove avatar.')
    } finally {
      setAvatarLoading(false)
    }
  }

  const onStartPersonalEdit = () => {
    setPersonalError('')
    setPersonalStatus('')
    if (profile) {
      setDraftFirstName(profile.firstName || (profile.fullName || '').trim().split(' ')[0] || '')
      setDraftLastName(
        profile.lastName ||
          (() => {
            const parts = (profile.fullName || '').trim().split(' ').filter(Boolean)
            return parts.length > 1 ? parts.slice(1).join(' ') : ''
          })(),
      )
      setDraftEmail(profile.email || '')
      setDraftSmsPhone(profile.smsPhone || '')
    }
    setIsEditingPersonal(true)
  }

  const onSavePersonal = async () => {
    setPersonalError('')
    setPersonalStatus('')
    const firstErr = validateFirstName(draftFirstName)
    if (firstErr) {
      setPersonalError(firstErr)
      return
    }
    const emailErr = validateEmail(draftEmail)
    if (emailErr) {
      setPersonalError(emailErr)
      return
    }
    const phoneErr = validateSmsPhone(draftSmsPhone)
    if (phoneErr) {
      setPersonalError(phoneErr)
      return
    }
    if (!profile) {
      setPersonalError('Profile is not loaded yet.')
      return
    }
    const firstName = String(draftFirstName || '').trim()
    const lastNameRaw = String(draftLastName || '').trim()
    const lastName = lastNameRaw ? lastNameRaw : null
    const trimmedName = [firstName, lastNameRaw].filter(Boolean).join(' ')
    const trimmedEmail = draftEmail.trim()
    const trimmedSms = draftSmsPhone.trim()
    try {
      const { error: authError } = await supabase.auth.updateUser({ email: trimmedEmail })
      if (authError) throw authError
      const { error } = await supabase
        .from('admins')
        .update({
          first_name: firstName,
          last_name: lastName,
          email: trimmedEmail,
          sms_phone: trimmedSms || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id)
      if (error) throw error
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              firstName,
              lastName,
              fullName: trimmedName,
              email: trimmedEmail,
              smsPhone: trimmedSms,
            }
          : prev,
      )
      setIsEditingPersonal(false)
      setPersonalStatus('Profile updated successfully.')
      toast.success('Profile updated successfully.')
    } catch (err) {
      const message = err.message || 'Failed to update profile.'
      setPersonalError(message)
      toast.error(message)
    }
  }

  const onCancelPersonalEdit = () => {
    setPersonalError('')
    setPersonalStatus('')
    if (profile) {
      setDraftFirstName(profile.firstName || (profile.fullName || '').trim().split(' ')[0] || '')
      setDraftLastName(
        profile.lastName ||
          (() => {
            const parts = (profile.fullName || '').trim().split(' ').filter(Boolean)
            return parts.length > 1 ? parts.slice(1).join(' ') : ''
          })(),
      )
      setDraftEmail(profile.email || '')
      setDraftSmsPhone(profile.smsPhone || '')
    }
    if (avatarPreviewRef.current) {
      URL.revokeObjectURL(avatarPreviewRef.current)
      avatarPreviewRef.current = ''
    }
    setAvatarPreview('')
    if (fileRef.current) fileRef.current.value = ''
    setIsEditingPersonal(false)
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    setPassError('')
    setPassStatus('')
    if (!currentPassword) {
      const message = 'Please enter your current password.'
      setPassError(message)
      toast.error(message)
      return false
    }
    const validation = validateNewPassword(newPassword, confirmPassword)
    if (!validation.valid) {
      setPassError(validation.message)
      toast.error(validation.message)
      return false
    }
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) {
        const message = error.message || 'Failed to update password.'
        setPassError(message)
        toast.error(message)
        return false
      }
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPassStatus('Password updated successfully.')
      toast.success('Password updated successfully.')
      setIsEditingPassword(false)
      return true
    } catch (err) {
      const message = err.message || 'Failed to update password.'
      setPassError(message)
      toast.error(message)
      return false
    }
  }

  const onStartPasswordEdit = () => {
    setPassError('')
    setPassStatus('')
    setIsEditingPassword(true)
  }

  const onCancelPasswordEdit = () => {
    setPassError('')
    setPassStatus('')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setIsEditingPassword(false)
  }

  const shownAvatar = avatarPreview || profile?.avatarUrl || ''
  const shownAvatarIsBlob = Boolean(shownAvatar && shownAvatar.startsWith('blob:'))
  const formId = 'adminPasswordForm'
  const id = (name) => `admin_${name}`

  const [activeTab, setActiveTab] = useState(() =>
    normalizeSettingsTab(searchParams.get('tab') || undefined),
  )

  useEffect(() => {
    const t = searchParams.get('tab')
    setActiveTab(normalizeSettingsTab(t || undefined))
  }, [searchParams])

  const goTab = (tabId) => {
    const next = normalizeSettingsTab(tabId)
    setActiveTab(next)
    router.replace(`/admin/settings?tab=${next}`, { scroll: false })
  }

  if (isMobile) {
    const profileHref = searchParams.toString()
      ? `/admin/profile?${searchParams.toString()}`
      : '/admin/profile'
    return (
      <div className={styles.page}>
        <div className={`${styles.contentArea} ${styles.grid}`}>
          <section className={`${styles.card} ${styles.full}`}>
            <h2 className={styles.desktopSettingsNoticeTitle}>Settings are for desktop</h2>
            <p className={styles.desktopSettingsNoticeBody}>
              This page is optimized for larger screens. On your phone, use Profile for account
              options, notifications, billing, and site content.
            </p>
            <p className={styles.desktopSettingsNoticeHint}>Redirecting you to Profile…</p>
            <Link href={profileHref} className={styles.desktopSettingsNoticeLink}>
              Go to Profile now
            </Link>
          </section>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={`${styles.contentArea} ${styles.grid}`}>
          <section className={`${styles.card} ${styles.full}`}>
            <div
              className={`${loadingStyles.root} ${loadingStyles.variantCard}`}
              role="status"
              aria-live="polite"
              aria-busy="true"
            >
              <span className={loadingStyles.spinner} aria-hidden />
              <span className={loadingStyles.label}>Loading your profile</span>
            </div>
          </section>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <nav className={styles.tabBar} aria-label="Settings sections">
        {[
          { id: 'profile', label: 'Profile' },
          { id: 'password', label: 'Password' },
          { id: 'notifications', label: 'Notification' },
          { id: 'billing', label: 'Billing' },
          { id: 'content', label: 'Content' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`${styles.tabItem} ${activeTab === tab.id ? styles.tabItemActive : ''}`}
            onClick={() => goTab(tab.id)}
            aria-current={activeTab === tab.id ? 'page' : undefined}
          >
            <span className={styles.tabLabel}>{tab.label}</span>
          </button>
        ))}
      </nav>

      <div className={`${styles.contentArea} ${styles.grid}`}>
        {activeTab === 'profile' && (
        <section className={`${styles.card} ${styles.full}`}>
          <div className={styles.tabDetailHead}>
            <div className={styles.tabDetailHeadRow}>
              <div className={styles.tabDetailHeadText}>
                <h2 className={styles.tabDetailTitle}>Manage Profile</h2>
                <p className={styles.tabDetailSubtitle}>
                  View and update your name, email, and profile photo.
                </p>
              </div>
              <div className={styles.headActions}>
                {isEditingPersonal ? (
                  <>
                    <button
                      type="button"
                      className={styles.secondaryBtn}
                      onClick={onCancelPersonalEdit}
                      disabled={avatarLoading}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className={styles.primaryBtn}
                      onClick={onSavePersonal}
                      disabled={avatarLoading}
                    >
                      Save Changes
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className={styles.primaryBtn}
                    onClick={onStartPersonalEdit}
                    disabled={avatarLoading}
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className={styles.profileDetails}>
            <div className={styles.settingsRow}>
              <div className={styles.settingsRowMeta}>
                <div className={styles.settingsRowTitleRow}>
                  <p className={styles.settingsRowTitle}>Avatar</p>
                </div>
                <p className={styles.settingsRowDesc}>Shown across admin-facing experiences.</p>
              </div>
              <div className={`${styles.settingsRowControl} ${styles.profileControl}`}>
                <div className={styles.profilePhotoControl}>
                  <div
                    className={styles.avatar}
                    style={isEditingPersonal ? { cursor: 'pointer' } : {}}
                    onClick={isEditingPersonal ? () => fileRef.current?.click() : undefined}
                    title={isEditingPersonal ? 'Change photo' : undefined}
                  >
                    {shownAvatar ? (
                      <Image
                        src={shownAvatar}
                        alt="Profile avatar"
                        width={96}
                        height={96}
                        className={styles.avatarImg}
                        sizes="96px"
                        unoptimized={shownAvatarIsBlob}
                      />
                    ) : (
                      <div className={styles.avatarFallback}><FaUser /></div>
                    )}
                  </div>
                  {isEditingPersonal && (
                    <div className={styles.avatarBtnRow}>
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={() => fileRef.current?.click()}
                        disabled={avatarLoading}
                        style={{ fontSize: '11px' }}
                      >
                        <FiUpload /> Upload
                      </button>
                      {shownAvatar && (
                        <button
                          type="button"
                          className={styles.dangerBtn}
                          onClick={onRemoveAvatar}
                          disabled={avatarLoading}
                          style={{ fontSize: '11px' }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept={ALLOWED.join(',')}
                    className={styles.fileInput}
                    onChange={onPickAvatar}
                  />
                </div>
              </div>
            </div>

            <div className={styles.settingsRow}>
              <div className={styles.settingsRowMeta}>
                <div className={styles.settingsRowTitleRow}>
                  <p className={styles.settingsRowTitle}>Name</p>
                </div>
                <p className={styles.settingsRowDesc}>Used for account and audit references.</p>
              </div>
              <div className={`${styles.settingsRowControl} ${styles.profileControl}`}>
                <div className={styles.nameFieldsRow}>
                  <input
                    id={id('first_name')}
                    placeholder="First name"
                    value={draftFirstName}
                    onChange={(e) => setDraftFirstName(e.target.value)}
                    className={`${styles.input} ${!isEditingPersonal ? styles.inputReadOnly : ''}`}
                    disabled={!isEditingPersonal}
                  />
                  <input
                    id={id('last_name')}
                    placeholder="Last name"
                    value={draftLastName}
                    onChange={(e) => setDraftLastName(e.target.value)}
                    className={`${styles.input} ${!isEditingPersonal ? styles.inputReadOnly : ''}`}
                    disabled={!isEditingPersonal}
                  />
                </div>
              </div>
            </div>

            <div className={styles.settingsRow}>
              <div className={styles.settingsRowMeta}>
                <div className={styles.settingsRowTitleRow}>
                  <p className={styles.settingsRowTitle}>Email</p>
                </div>
                <p className={styles.settingsRowDesc}>Changes will update your sign-in email.</p>
              </div>
              <div className={`${styles.settingsRowControl} ${styles.profileControl}`}>
                <input
                  id={id('email')}
                  value={draftEmail}
                  onChange={(e) => setDraftEmail(e.target.value)}
                  className={`${styles.input} ${!isEditingPersonal ? styles.inputReadOnly : ''}`}
                  disabled={!isEditingPersonal}
                />
              </div>
            </div>

            <div className={styles.settingsRow}>
              <div className={styles.settingsRowMeta}>
                <div className={styles.settingsRowTitleRow}>
                  <p className={styles.settingsRowTitle}>SMS contact number</p>
                </div>
                <p className={styles.settingsRowDesc}>
                  Optional mobile number for SMS contact.
                </p>
              </div>
              <div className={`${styles.settingsRowControl} ${styles.profileControl}`}>
                <input
                  id={id('sms_phone')}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="e.g. +63 900 000 0000"
                  value={draftSmsPhone}
                  onChange={(e) => setDraftSmsPhone(e.target.value)}
                  className={`${styles.input} ${!isEditingPersonal ? styles.inputReadOnly : ''}`}
                  disabled={!isEditingPersonal}
                  aria-label="SMS contact number"
                />
              </div>
            </div>
          </div>

          {isEditingPersonal && personalError && (
            <div className={styles.msgError}><MdErrorOutline /> {personalError}</div>
          )}
          {isEditingPersonal && personalStatus && (
            <div className={styles.msgOk}><MdCheckCircle /> {personalStatus}</div>
          )}
        </section>
        )}

        {activeTab === 'password' && (
        <section className={`${styles.card} ${styles.full}`}>
          <div className={styles.tabDetailHead}>
            <div className={styles.tabDetailHeadRow}>
              <div className={styles.tabDetailHeadText}>
                <h2 className={styles.tabDetailTitle}>Change Password</h2>
                <p className={styles.tabDetailSubtitle}>
                  Update your password to keep your account secure.
                </p>
              </div>
              <div className={styles.headActions}>
                {isEditingPassword ? (
                  <>
                    <button
                      type="button"
                      className={styles.secondaryBtn}
                      onClick={onCancelPasswordEdit}
                    >
                      Cancel
                    </button>
                    <button form={formId} type="submit" className={styles.primaryBtn}>
                      Save Changes
                    </button>
                  </>
                ) : (
                  <button type="button" className={styles.primaryBtn} onClick={onStartPasswordEdit}>
                    Change password
                  </button>
                )}
              </div>
            </div>
          </div>
          <form id={formId} onSubmit={handlePasswordSubmit} className={styles.form}>
            <div className={styles.passGrid}>
              <div className={styles.passField}>
                <label htmlFor={id('current_password')} className={styles.label}>
                  Current Password
                </label>
                <input
                  id={id('current_password')}
                  type="password"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className={styles.input}
                  disabled={!isEditingPassword}
                />
              </div>
              <div className={styles.passField}>
                <label htmlFor={id('new_password')} className={styles.label}>
                  New Password
                </label>
                <input
                  id={id('new_password')}
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={styles.input}
                  disabled={!isEditingPassword}
                />
              </div>
              <div className={styles.passField}>
                <label htmlFor={id('confirm_password')} className={styles.label}>
                  Confirm New Password
                </label>
                <input
                  id={id('confirm_password')}
                  type="password"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={styles.input}
                  disabled={!isEditingPassword}
                />
              </div>
            </div>
            <div className={styles.passwordReqBox}>
              <p className={styles.passwordReqTitle}>Password requirements</p>
              <ul className={styles.passwordReqList}>
                <li>At least 8 characters</li>
                <li>One uppercase letter</li>
                <li>One lowercase letter</li>
                <li>One number</li>
              </ul>
            </div>
            {passError && (
              <div className={styles.msgError}><MdErrorOutline /> {passError}</div>
            )}
            {passStatus && (
              <div className={styles.msgOk}><MdCheckCircle /> {passStatus}</div>
            )}
          </form>
        </section>
        )}

        {activeTab === 'billing' && <AdminBillingSettingsPanel />}

        {activeTab === 'notifications' && <AdminNotificationPreferencesPanel />}

        {activeTab === 'content' && <AdminSiteContentPanel />}
      </div>
    </div>
  )
}
