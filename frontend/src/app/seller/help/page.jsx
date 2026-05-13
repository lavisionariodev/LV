'use client'

import { useMemo, useState } from 'react'
import { TbChevronDown, TbMail, TbSearch } from 'react-icons/tb'
import { useToast } from '@/contexts/ToastContext'
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
        'Open the order details from the Orders page, review the buyer reason and attachments, then approve, decline, or mark the request under review based on the case. Refund completion is finalized by the payment provider webhook.',
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
  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState('Bookings & Service Dates')
  const [openFaqs, setOpenFaqs] = useState({ book_1: true })
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)
  const [emailSubject, setEmailSubject] = useState('Seller Help Request')
  const [emailMessage, setEmailMessage] = useState('')
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false)

  const filteredFaqs = useMemo(() => {
    const activeFaqItems = FAQ_BY_TAB[activeTab] ?? []
    const q = query.trim().toLowerCase()
    if (!q) return activeFaqItems
    return activeFaqItems.filter((item) => {
      const haystack = `${item.question} ${item.answer}`.toLowerCase()
      return haystack.includes(q)
    })
  }, [activeTab, query])

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
            className={styles.searchInput}
            placeholder="Search bookings, refunds, listings, payouts, or documents"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="button" className={styles.searchBtn}>
            Search
          </button>
        </div>
      </section>

      <div className={styles.categoryTabs}>
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`${styles.tabBtn} ${activeTab === tab ? styles.tabBtnActive : ''}`}
            onClick={() => {
              setActiveTab(tab)
              const firstItem = (FAQ_BY_TAB[tab] ?? [])[0]
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
            <h2 className={styles.sectionTitle}>{activeTab} FAQs</h2>
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
