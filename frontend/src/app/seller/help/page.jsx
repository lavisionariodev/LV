'use client'

import { useMemo, useState } from 'react'
import { TbChevronDown, TbMail, TbSearch } from 'react-icons/tb'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/contexts/ToastContext'
import styles from './help.module.css'

const CATEGORY_TABS = ['Getting Started', 'Orders & Shipping', 'Payments', 'Products', 'Usage Guides']

const FAQ_BY_TAB = {
  'Getting Started': [
    {
      id: 'gs_1',
      question: 'What should I set up first as a new seller?',
      answer: 'Complete your profile, payout method, shipping settings, and add your first 3 products.',
    },
    {
      id: 'gs_2',
      question: 'How do I improve visibility quickly?',
      answer: 'Use clear product titles, complete attributes, and upload high-quality images.',
    },
  ],
  'Orders & Shipping': [
    {
      id: 'os_1',
      question: 'How can I track my order?',
      answer:
        'Go to Orders, open the order details, and click the tracking number to view live delivery updates.',
    },
    {
      id: 'os_2',
      question: 'How can I cancel an order?',
      answer: 'You can cancel before shipment from the order details page. The buyer is notified automatically.',
    },
  ],
  Payments: [
    {
      id: 'pay_1',
      question: 'How do I withdraw my earnings?',
      answer: 'Open Payments, select Withdraw, and confirm your payout account.',
    },
    {
      id: 'pay_2',
      question: 'Why is my payout pending?',
      answer: 'Pending payouts are usually due to verification checks or bank processing windows.',
    },
  ],
  Products: [
    {
      id: 'prod_1',
      question: 'Why was my product rejected?',
      answer: 'Rejections usually happen due to missing attributes, restricted content, or low image quality.',
    },
    {
      id: 'prod_2',
      question: 'How do I edit stock for multiple products?',
      answer: 'Use the inventory table bulk edit tools to update quantity and status quickly.',
    },
  ],
  'Usage Guides': [
    {
      id: 'ug_1',
      question: 'Where can I find platform usage guides?',
      answer: 'Open Seller Help and browse Usage Guides for onboarding, operations, and marketing steps.',
    },
    {
      id: 'ug_2',
      question: 'How often are guides updated?',
      answer: 'Guides are refreshed regularly whenever there are feature or policy changes.',
    },
  ],
}

export default function SellerHelpPage() {
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState('Orders & Shipping')
  const [openFaqs, setOpenFaqs] = useState({ os_1: true })
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

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const senderEmail = user?.email || null
    const senderId = user?.id || null

    const { error } = await supabase.from('notifications').insert({
      title: `Support Request: ${subject}`,
      body,
      type: 'system',
      priority: 'medium',
      read: false,
      resolved: false,
      payload: {
        source: 'seller_help_email_support',
        recipientRole: 'admin',
        senderRole: 'seller',
        senderId,
        senderEmail,
        subject,
        message: body,
      },
      timestamp_label: 'Just now',
    })

    setIsSubmittingEmail(false)

    if (error) {
      toast.error('Unable to submit right now. Please try again in a moment.')
      return
    }

    toast.success('Message sent. Admin has been notified.')
    setEmailSubject('Seller Help Request')
    setEmailMessage('')
    setIsEmailModalOpen(false)
  }

  return (
    <div className={styles.pageWrap}>
      <section className={styles.searchBarCard}>
        <h1 className={styles.heroTitle}>Hello, how can we help?</h1>
        <div className={styles.searchWrap}>
          <TbSearch className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Search for help, orders, or issues"
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
