'use client'

import { useEffect, useMemo, useState } from 'react'
import { TbChevronDown, TbHelpCircle, TbLifebuoy, TbSearch, TbSend } from 'react-icons/tb'
import { supabase } from '@/lib/supabase/client'
import styles from './help.module.css'

const CATEGORY_ORDER = [
  'orders_payments',
  'products_management',
  'customers',
  'analytics',
  'marketing_centre',
  'account_settings',
]

const CATEGORY_LABELS = {
  orders_payments: 'Orders & Payments',
  products_management: 'Products Management',
  customers: 'Customers',
  analytics: 'Analytics',
  marketing_centre: 'Marketing Centre',
  account_settings: 'Account & Settings',
}

const ISSUE_FALLBACK_STEPS = {
  'Campaign budget threshold reached': [
    'Open Campaign Management and review active campaign spend.',
    'Reduce daily budget or pause low-performing ad groups.',
    'Monitor conversion rate after budget adjustment.',
  ],
  'Voucher blast underperforming': [
    'Check voucher targeting and audience segment.',
    'Increase voucher relevance or adjust offer value.',
    'Track redemption trend for 24 hours after changes.',
  ],
  'Discount schedule conflict detected': [
    'Open Discounts and inspect overlapping date ranges.',
    'Disable one conflicting discount or adjust schedule.',
    'Re-test checkout pricing after saving changes.',
  ],
}

const FALLBACK_ARTICLES = [
  {
    id: 'faq_1',
    title: 'How do I confirm and complete orders?',
    content:
      'Go to Orders, open an order, then update status step-by-step from Pending to Completed. Use the order timeline for progress tracking.',
    category: 'orders_payments',
    article_type: 'faq',
    priority: 1,
  },
  {
    id: 'faq_2',
    title: 'How do I add a new service or package?',
    content:
      'Open Products > Services or Packages, click create, complete pricing and details, then publish.',
    category: 'products_management',
    article_type: 'faq',
    priority: 2,
  },
  {
    id: 'faq_3',
    title: 'How do I use marketing campaigns?',
    content:
      'Go to Marketing Centre, create a campaign, attach voucher/discount rules, and monitor performance in Campaign Management.',
    category: 'marketing_centre',
    article_type: 'faq',
    priority: 3,
  },
  {
    id: 'guide_1',
    title: 'Create your first product',
    content: 'Step-by-step product creation guide',
    category: 'products_management',
    article_type: 'guide',
    steps: [
      'Open Products > Services.',
      'Click Create Service and complete required fields.',
      'Set pricing, availability, and publish.',
    ],
    priority: 1,
  },
  {
    id: 'guide_2',
    title: 'Handle payouts safely',
    content: 'Step-by-step payout handling',
    category: 'orders_payments',
    article_type: 'guide',
    steps: [
      'Review payout status in the Payouts view.',
      'Validate order completion and payment status.',
      'Update payout status and record payout reference.',
    ],
    priority: 2,
  },
]

function normalizeArticle(row) {
  return {
    id: String(row.id),
    title: row.title || 'Untitled article',
    content: row.content || row.answer || 'No answer provided yet.',
    category: row.category || 'account_settings',
    article_type: row.article_type || 'faq',
    steps: Array.isArray(row.steps) ? row.steps : [],
    priority: Number(row.priority || 0),
  }
}

function relativeTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Recently'
  const diff = Date.now() - date.getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'Just now'
  if (min < 60) return `${min} minutes ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} hours ago`
  const day = Math.floor(hr / 24)
  return `${day} days ago`
}

export default function SellerHelpPage() {
  const [query, setQuery] = useState('')
  const [articles, setArticles] = useState(FALLBACK_ARTICLES)
  const [issues, setIssues] = useState([])
  const [contacts, setContacts] = useState([
    { id: 'email', label: 'Email support', value: 'support@lavisionario.com' },
    { id: 'ticket', label: 'Submit ticket', value: 'Open support ticket below' },
  ])
  const [openFaq, setOpenFaq] = useState({})
  const [feedbackMap, setFeedbackMap] = useState({})
  const [ticketDraft, setTicketDraft] = useState({ subject: '', message: '' })
  const [ticketState, setTicketState] = useState({ saving: false, message: '' })

  useEffect(() => {
    let cancelled = false

    const loadAll = async () => {
      const [articlesRes, issuesRes, contactsRes] = await Promise.all([
        supabase.from('help_articles').select('*').order('priority', { ascending: true }),
        supabase
          .from('notifications')
          .select('*')
          .in('type', ['alerts', 'marketing'])
          .order('created_at', { ascending: false })
          .limit(6),
        supabase.from('support_contacts').select('*').order('priority', { ascending: true }),
      ])

      if (cancelled) return

      if (!articlesRes.error && Array.isArray(articlesRes.data) && articlesRes.data.length > 0) {
        setArticles(articlesRes.data.map(normalizeArticle))
      }

      if (!issuesRes.error && Array.isArray(issuesRes.data)) {
        setIssues(
          issuesRes.data.map((item) => ({
            id: String(item.id),
            title: item.title || 'System issue',
            type: item.type || 'alerts',
            priority: item.priority || 'medium',
            createdAt: item.created_at,
          })),
        )
      }

      if (!contactsRes.error && Array.isArray(contactsRes.data) && contactsRes.data.length > 0) {
        setContacts(
          contactsRes.data.map((row) => ({
            id: String(row.id),
            label: row.label || 'Support',
            value: row.value || '',
          })),
        )
      }
    }

    loadAll()

    const helpChannel = supabase
      .channel('help-center-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'help_articles' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_contacts' }, loadAll)
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(helpChannel)
    }
  }, [])

  const filteredArticles = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return articles
    return articles.filter((a) => {
      const bucket = `${a.title} ${a.content} ${CATEGORY_LABELS[a.category] || a.category}`.toLowerCase()
      return bucket.includes(q)
    })
  }, [articles, query])

  const faqByCategory = useMemo(() => {
    const map = new Map()
    CATEGORY_ORDER.forEach((c) => map.set(c, []))
    filteredArticles
      .filter((a) => a.article_type === 'faq')
      .forEach((a) => {
        if (!map.has(a.category)) map.set(a.category, [])
        map.get(a.category).push(a)
      })
    return map
  }, [filteredArticles])

  const guides = useMemo(
    () => filteredArticles.filter((a) => a.article_type === 'guide'),
    [filteredArticles],
  )

  const onFeedback = async (articleId, helpful) => {
    setFeedbackMap((prev) => ({ ...prev, [articleId]: helpful ? 'yes' : 'no' }))
    await supabase.from('help_article_feedback').insert({
      article_id: articleId,
      helpful,
      source: 'seller_help_center',
    })
  }

  const submitTicket = async () => {
    if (!ticketDraft.subject.trim() || !ticketDraft.message.trim()) {
      setTicketState({ saving: false, message: 'Please fill in both subject and message.' })
      return
    }

    setTicketState({ saving: true, message: '' })
    const { error } = await supabase.from('support_tickets').insert({
      source: 'seller_help_center',
      subject: ticketDraft.subject.trim(),
      message: ticketDraft.message.trim(),
      status: 'open',
    })

    if (error) {
      setTicketState({ saving: false, message: 'Ticket submission failed. Please try again.' })
      return
    }

    setTicketDraft({ subject: '', message: '' })
    setTicketState({ saving: false, message: 'Ticket submitted successfully.' })
  }

  return (
    <div className={styles.pageWrap}>
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Help Center</h1>
          <p className={styles.pageSubtitle}>Find answers, guides, and support for your seller operations.</p>
        </div>
      </header>

      <section className={styles.searchCard}>
        <div className={styles.searchWrap}>
          <TbSearch className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search help articles, guides, and issues..."
          />
        </div>
      </section>

      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>FAQs by Category</h2>
        </div>

        {CATEGORY_ORDER.map((categoryKey) => {
          const items = faqByCategory.get(categoryKey) || []
          return (
            <div key={categoryKey} className={styles.categoryBlock}>
              <h3 className={styles.categoryTitle}>{CATEGORY_LABELS[categoryKey] || categoryKey}</h3>
              {items.length === 0 ? (
                <p className={styles.emptyText}>No FAQ articles in this category.</p>
              ) : (
                <div className={styles.accordionList}>
                  {items.map((item) => {
                    const isOpen = Boolean(openFaq[item.id])
                    return (
                      <div key={item.id} className={`${styles.accordionItem} ${isOpen ? styles.accordionOpen : ''}`}>
                        <button
                          type="button"
                          className={styles.accordionBtn}
                          onClick={() => setOpenFaq((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                          aria-expanded={isOpen}
                        >
                          <span>{item.title}</span>
                          <TbChevronDown className={`${styles.chev} ${isOpen ? styles.chevOpen : ''}`} />
                        </button>
                        {isOpen && (
                          <div className={styles.accordionContent}>
                            <p>{item.content}</p>
                            <div className={styles.feedbackRow}>
                              <span className={styles.feedbackLabel}>Was this helpful?</span>
                              <button
                                type="button"
                                className={`${styles.feedbackBtn} ${
                                  feedbackMap[item.id] === 'yes' ? styles.feedbackBtnActive : ''
                                }`}
                                onClick={() => onFeedback(item.id, true)}
                              >
                                Yes
                              </button>
                              <button
                                type="button"
                                className={`${styles.feedbackBtn} ${
                                  feedbackMap[item.id] === 'no' ? styles.feedbackBtnActive : ''
                                }`}
                                onClick={() => onFeedback(item.id, false)}
                              >
                                No
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </section>

      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Guides & Tutorials</h2>
        </div>
        <div className={styles.guidesGrid}>
          {guides.length === 0 ? (
            <p className={styles.emptyText}>No guides available.</p>
          ) : (
            guides.map((guide) => (
              <article key={guide.id} className={styles.guideCard}>
                <h3 className={styles.guideTitle}>{guide.title}</h3>
                <p className={styles.guideDesc}>{guide.content}</p>
                {guide.steps?.length > 0 && (
                  <ol className={styles.stepList}>
                    {guide.steps.map((step, idx) => (
                      <li key={`${guide.id}-${idx}`}>{step}</li>
                    ))}
                  </ol>
                )}
              </article>
            ))
          )}
        </div>
      </section>

      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Common Issues</h2>
        </div>
        <div className={styles.issuesList}>
          {(issues.length ? issues : Object.keys(ISSUE_FALLBACK_STEPS).map((title, i) => ({
            id: `fallback_${i}`,
            title,
            type: 'alerts',
            priority: 'medium',
            createdAt: new Date().toISOString(),
          }))).map((issue) => (
            <article key={issue.id} className={styles.issueCard}>
              <div className={styles.issueTop}>
                <div className={styles.issueTitleWrap}>
                  <TbHelpCircle className={styles.issueIcon} />
                  <h3 className={styles.issueTitle}>{issue.title}</h3>
                </div>
                <span className={styles.issueMeta}>
                  {issue.priority} · {relativeTime(issue.createdAt)}
                </span>
              </div>
              <p className={styles.issueDesc}>
                {issue.type === 'marketing'
                  ? 'This issue indicates campaign performance needs immediate optimization.'
                  : 'This issue indicates a system or setup conflict that needs manual review.'}
              </p>
              <ol className={styles.stepList}>
                {(ISSUE_FALLBACK_STEPS[issue.title] || [
                  'Open the related module from your Seller Dashboard.',
                  'Review the flagged record and adjust configuration.',
                  'Validate the result and monitor for recurring triggers.',
                ]).map((s, idx) => (
                  <li key={`${issue.id}_step_${idx}`}>{s}</li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Contact Support</h2>
        </div>
        <div className={styles.supportGrid}>
          <div className={styles.contactCards}>
            {contacts.map((c) => (
              <div key={c.id} className={styles.contactCard}>
                <div className={styles.contactLabel}>{c.label}</div>
                <div className={styles.contactValue}>{c.value}</div>
              </div>
            ))}
          </div>

          <div className={styles.ticketCard}>
            <div className={styles.ticketTitle}>
              <TbLifebuoy />
              Submit a support ticket
            </div>
            <input
              className={styles.input}
              placeholder="Subject"
              value={ticketDraft.subject}
              onChange={(e) => setTicketDraft((p) => ({ ...p, subject: e.target.value }))}
            />
            <textarea
              className={styles.textarea}
              rows={4}
              placeholder="Describe your concern..."
              value={ticketDraft.message}
              onChange={(e) => setTicketDraft((p) => ({ ...p, message: e.target.value }))}
            />
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={submitTicket}
              disabled={ticketState.saving}
            >
              <TbSend />
              {ticketState.saving ? 'Submitting...' : 'Submit Ticket'}
            </button>
            {ticketState.message && <p className={styles.ticketNote}>{ticketState.message}</p>}
          </div>
        </div>
      </section>
    </div>
  )
}
