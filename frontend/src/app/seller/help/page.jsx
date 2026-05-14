'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { TbChevronDown, TbMail, TbSearch } from 'react-icons/tb'
import { useToast } from '@/contexts/ToastContext'
import { useSiteContent } from '@/lib/siteContent/client'
import styles from './help.module.css'

const CATEGORY_TABS = [
  'Getting Started',
  'Bookings & Service Dates',
  'Refunds & Disputes',
  'Listings & Approval',
  'Payouts & Escrow',
  'Account & Compliance',
]

const FAQ_BY_TAB = {
  'Getting Started': [
    {
      id: 'gs_1',
      question: 'What should I complete before accepting bookings?',
      answer:
        'Finish seller onboarding, keep your business profile accurate, add payout details, upload required compliance documents, and submit service listings for admin approval.',
    },
    {
      id: 'gs_2',
      question: 'When can families book my services?',
      answer:
        'Families can book approved listings once your seller account is active. Draft, rejected, or pending listings are not treated as bookable services.',
    },
  ],
  'Bookings & Service Dates': [
    {
      id: 'book_1',
      question: 'How do booking statuses work?',
      answer:
        'New paid bookings start as pending. Confirm the booking when you can serve the requested date, move it to in progress when preparation or service work begins, and mark it completed only after the service is fulfilled.',
    },
    {
      id: 'book_2',
      question: 'What should I check before confirming a booking?',
      answer:
        'Review the requested service date, location, deceased details, family contact information, add-ons, and special notes. If you cannot fulfill the booking, decline it so the buyer refund process can start.',
    },
  ],
  'Refunds & Disputes': [
    {
      id: 'refund_1',
      question: 'What happens when I decline a paid booking?',
      answer:
        'Declining a non-completed paid booking cancels it and starts a buyer refund to the original payment method. The order is held out of seller payout while the payment provider processes the refund.',
    },
    {
      id: 'refund_2',
      question: 'How should I handle buyer refund or help requests?',
      answer:
        'Open the order details from the Orders page, review the buyer reason and attachments, and mark the request under review when you are investigating. Platform admins close cases and handle refunds.',
    },
  ],
  'Listings & Approval': [
    {
      id: 'listing_1',
      question: 'Why is my service listing pending or rejected?',
      answer:
        'Listings may wait for admin review when newly submitted or edited. Rejections usually mean required service details, pricing, images, or policy requirements need correction before families can book it.',
    },
    {
      id: 'listing_2',
      question: 'Can I edit an approved listing?',
      answer:
        'Yes. Changes to approved listings may create pending changes for review, so keep descriptions, package inclusions, images, and prices clear before submitting.',
    },
  ],
  'Payouts & Escrow': [
    {
      id: 'escrow_1',
      question: 'Why are paid bookings held in escrow?',
      answer:
        'Buyer payments are held while the service is pending, in progress, disputed, or refunding. Eligible completed bookings can move toward payout after platform commission and any holds are applied.',
    },
    {
      id: 'escrow_2',
      question: 'Where do I manage payout details?',
      answer:
        'Open Seller Settings, then Payouts, to keep bank or payment account details current. Incorrect payout details may delay release of eligible escrow funds.',
    },
  ],
  'Account & Compliance': [
    {
      id: 'acct_1',
      question: 'Which documents should I upload?',
      answer:
        'Upload the required business or compliance documents requested in Seller Settings. Admin may use these documents to verify your funeral service provider account.',
    },
    {
      id: 'acct_2',
      question: 'Why was I redirected to onboarding?',
      answer:
        'Seller accounts that are pending, rejected, suspended, or missing required approval steps may be routed to onboarding until the account is ready for the full seller portal.',
    },
  ],
}

export default function SellerHelpPage() {
  const toast = useToast()
  const { data: siteContent } = useSiteContent()
  const searchRef = useRef(null)
  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState('Bookings & Service Dates')
  const [openFaqs, setOpenFaqs] = useState({ book_1: true })
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)
  const [emailSubject, setEmailSubject] = useState('Seller Help Request')
  const [emailMessage, setEmailMessage] = useState('')
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false)
  const [supportRequests, setSupportRequests] = useState([])
  const [supportLoading, setSupportLoading] = useState(true)

  const faqByTab = useMemo(() => {
    const merged = { ...FAQ_BY_TAB }
    const groups = siteContent?.sellerHelpFaq
    if (!Array.isArray(groups)) return merged
    for (const group of groups) {
      if (group?.category && Array.isArray(group.items) && group.items.length > 0) {
        merged[group.category] = group.items
      }
    }
    return merged
  }, [siteContent])

  const categoryTabs = useMemo(() => {
    const keys = Object.keys(faqByTab)
    return keys.length ? keys : CATEGORY_TABS
  }, [faqByTab])

  const resolvedActiveTab = useMemo(() => {
    if (categoryTabs.includes(activeTab)) return activeTab
    return categoryTabs[0] || CATEGORY_TABS[0]
  }, [activeTab, categoryTabs])

  useEffect(() => {
    let cancelled = false
    async function loadSupportRequests() {
      setSupportLoading(true)
      try {
        const res = await fetch('/api/seller/support', { cache: 'no-store' })
        const body = await res.json().catch(() => null)
        if (!res.ok) throw new Error(body?.error || 'Failed to load support requests.')
        if (!cancelled) setSupportRequests(Array.isArray(body?.requests) ? body.requests : [])
      } catch {
        if (!cancelled) setSupportRequests([])
      } finally {
        if (!cancelled) setSupportLoading(false)
      }
    }
    loadSupportRequests()
    return () => {
      cancelled = true
    }
  }, [])

  const refreshSupportRequests = async () => {
    setSupportLoading(true)
    try {
      const res = await fetch('/api/seller/support', { cache: 'no-store' })
      const body = await res.json().catch(() => null)
      if (!res.ok) throw new Error(body?.error || 'Failed to load support requests.')
      setSupportRequests(Array.isArray(body?.requests) ? body.requests : [])
    } catch {
      setSupportRequests([])
    } finally {
      setSupportLoading(false)
    }
  }

  const filteredFaqs = useMemo(() => {
    const q = query.trim().toLowerCase()
    const allFaqs = categoryTabs.flatMap((tab) =>
      (faqByTab[tab] ?? []).map((item) => ({ ...item, tab })),
    )
    if (!q) {
      return (faqByTab[resolvedActiveTab] ?? []).map((item) => ({ ...item, tab: resolvedActiveTab }))
    }
    return allFaqs.filter((item) => {
      const haystack = `${item.question} ${item.answer} ${item.tab}`.toLowerCase()
      return haystack.includes(q)
    })
  }, [resolvedActiveTab, categoryTabs, faqByTab, query])

  const handleSendSupportEmail = async (e) => {
    e.preventDefault()
    const subject = emailSubject.trim() || 'Seller Help Request'
    const body = emailMessage.trim()
    if (!body) {
      toast.error('Please enter your message before submitting.')
      return
    }

    setIsSubmittingEmail(true)

    try {
      const res = await fetch('/api/seller/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, message: body }),
      })
      const responseBody = await res.json().catch(() => null)
      if (!res.ok) {
        toast.error(responseBody?.error || 'Unable to submit right now. Please try again in a moment.')
        return
      }

      toast.success('Message sent. Admin has been notified.')
      setEmailSubject('Seller Help Request')
      setEmailMessage('')
      setIsEmailModalOpen(false)
      await refreshSupportRequests()
    } catch {
      toast.error('Unable to submit right now. Please try again in a moment.')
    } finally {
      setIsSubmittingEmail(false)
    }
  }

  return (
    <div className={styles.pageWrap}>
      <section className={styles.searchBarCard}>
        <h1 className={styles.heroTitle}>Hello, how can we help?</h1>
        <div className={styles.searchWrap}>
          <TbSearch className={styles.searchIcon} />
          <input
            ref={searchRef}
            className={styles.searchInput}
            placeholder="Search bookings, refunds, listings, payouts, or documents"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            type="button"
            className={styles.searchBtn}
            onClick={() => searchRef.current?.focus()}
          >
            Search
          </button>
        </div>
      </section>

      <div className={styles.categoryTabs}>
        {categoryTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`${styles.tabBtn} ${resolvedActiveTab === tab ? styles.tabBtnActive : ''}`}
            onClick={() => {
              setActiveTab(tab)
              const firstItem = (faqByTab[tab] ?? [])[0]
              setOpenFaqs(firstItem ? { [firstItem.id]: true } : {})
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <section className={styles.layoutGrid}>
        <div className={styles.mainColumn}>
          <div className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>
              {query.trim() ? 'Search results' : `${resolvedActiveTab} FAQs`}
            </h2>
            <div className={styles.faqAccordion}>
              {filteredFaqs.map((item) => {
                const isOpen = Boolean(openFaqs[item.id])
                return (
                  <article key={item.id} className={styles.faqItem}>
                    <button
                      type="button"
                      className={styles.faqQuestion}
                      aria-expanded={isOpen}
                      onClick={() =>
                        setOpenFaqs((prev) => ({
                          ...prev,
                          [item.id]: !prev[item.id],
                        }))
                      }
                    >
                      <span>{item.question}</span>
                      <TbChevronDown className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`} />
                    </button>
                    {isOpen && <p className={styles.faqAnswer}>{item.answer}</p>}
                  </article>
                )
              })}
            </div>
          </div>
        </div>

        <aside className={styles.sideColumn}>
          <div className={styles.supportCard}>
            <h3 className={styles.supportTitle}>Support requests</h3>
            <p className={styles.supportSubtitle}>Recent help requests submitted from this account.</p>
            {supportLoading ? (
              <p className={styles.supportMeta}>Loading support history…</p>
            ) : supportRequests.length === 0 ? (
              <p className={styles.supportMeta}>No support requests yet.</p>
            ) : (
              <ul className={styles.supportHistoryList}>
                {supportRequests.map((request) => (
                  <li key={request.id} className={styles.supportHistoryItem}>
                    <p className={styles.supportHistorySubject}>{request.subject}</p>
                    <p className={styles.supportHistoryMeta}>
                      {request.status} · {new Date(request.created_at).toLocaleString('en-PH')}
                    </p>
                    <p className={styles.supportHistoryMessage}>{request.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={styles.supportCard}>
            <h3 className={styles.supportTitle}>Contact Support</h3>
            <p className={styles.supportSubtitle}>You still have a question?</p>
            <p className={styles.supportMeta}>Average response time: under 2 hours</p>

            <div className={styles.supportOptions}>
              <button
                type="button"
                className={styles.supportOption}
                onClick={() => setIsEmailModalOpen(true)}
              >
                <TbMail />
                Email support
              </button>
            </div>
          </div>
        </aside>
      </section>

      {isEmailModalOpen && (
        <div
          className={styles.modalOverlay}
          onClick={() => {
            if (isSubmittingEmail) return
            setIsEmailModalOpen(false)
          }}
        >
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Email Support</h3>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setIsEmailModalOpen(false)}
                aria-label="Close email support modal"
                disabled={isSubmittingEmail}
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.modalSubtitle}>Send your concern to our support team.</p>

              <form className={styles.modalForm} onSubmit={handleSendSupportEmail}>
              <label className={styles.modalLabel}>
                Subject
                <input
                  className={styles.modalInput}
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Enter subject"
                  required
                />
              </label>

              <label className={styles.modalLabel}>
                Message
                <textarea
                  className={styles.modalTextarea}
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  placeholder="Describe your issue"
                  rows={6}
                  required
                />
              </label>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.modalGhostBtn}
                  onClick={() => setIsEmailModalOpen(false)}
                  disabled={isSubmittingEmail}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.modalPrimaryBtn} disabled={isSubmittingEmail}>
                  {isSubmittingEmail ? 'Submitting...' : 'Submit'}
                </button>
              </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
