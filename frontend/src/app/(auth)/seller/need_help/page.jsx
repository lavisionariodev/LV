'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  FaCartShopping,
  FaTag,
  FaCreditCard,
  FaTruck,
  FaRotateLeft,
  FaCircleQuestion,
  FaFileContract,
  FaMagnifyingGlass,
  FaChevronRight,
  FaChevronDown,
  FaPhone,
  FaEnvelope,
  FaComments,
} from 'react-icons/fa6';
import styles from './need_help.module.css';

const categoryIcons = {
  shopping: FaCartShopping,
  deals: FaTag,
  payments: FaCreditCard,
  orders: FaTruck,
  returns: FaRotateLeft,
  general: FaCircleQuestion,
  policies: FaFileContract,
};

/* Categories with sub-categories and articles (Shopee-style dropdown → article view) */
const categoriesWithArticles = [
  {
    id: 'shopping',
    title: 'Shop with Lavisionario',
    subCategories: [
      { id: 'browse', title: 'Browse & search', article: { title: 'How do I browse and search on Lavisionario?', content: 'You can browse by category from the home page or use the search bar at the top. Type keywords, filter by category, and sort by relevance or price. Save items to your wishlist for later.', note: null } },
      { id: 'vouchers', title: 'Vouchers & promos', article: { title: 'How do I use vouchers?', content: 'At checkout, go to the "Vouchers" section and select a valid voucher. Vouchers may have a minimum spend or expiry date. Only one voucher can be applied per order unless otherwise stated.', note: null } },
    ],
  },
  {
    id: 'deals',
    title: 'Deals & Promos',
    subCategories: [
      { id: 'flash', title: 'Flash deals', article: { title: 'What are flash deals?', content: 'Flash deals are time-limited offers with special prices. They appear on the Deals page and in the app. Add items to cart before the timer ends to secure the deal price.', note: null } },
      { id: 'voucher-center', title: 'Voucher center', article: { title: 'Where do I find vouchers?', content: 'Open the app and go to "Voucher Center" or "Deals & Promos". You can claim store vouchers, platform vouchers, and shipping vouchers. Check the terms for each voucher before use.', note: null } },
    ],
  },
  {
    id: 'payments',
    title: 'Payments',
    subCategories: [
      { id: 'payment-options', title: 'Payment options', article: { title: 'What payment methods are accepted?', content: 'We accept Payment Center (over-the-counter), e-Wallets (GCash, Maya, etc.), and card payments. Select your preferred method at checkout. Some options may vary by region.', note: null } },
      { id: 'e-wallet', title: 'e-Wallet', article: { title: 'How do I pay with e-Wallet?', content: 'At checkout, choose your e-Wallet (e.g. GCash, Maya). You will be redirected to log in and confirm the payment in the e-Wallet app. Ensure you have sufficient balance and complete within the time shown.', note: 'Payment must be completed within the allowed time; otherwise the order may be cancelled.' } },
      { id: 'sss-gsis', title: 'SSS / GSIS benefits', article: { title: 'How do I use SSS or GSIS funeral benefits?', content: 'You can use your SSS or GSIS benefit as payment or reimbursement. During checkout or when contacting support, select "SSS/GSIS" and follow the steps to submit the required documents. We will guide you through the claim process.', note: 'Keep your claim reference and supporting documents for your records.' } },
    ],
  },
  {
    id: 'orders',
    title: 'Orders & Shipping',
    subCategories: [
      { id: 'tracking', title: 'Track order', article: { title: 'How do I track my order?', content: 'After your order is shipped, you will receive a tracking number by email and in the app under "My Orders" → order details. Use the link or number on the courier\'s website to see real-time status. For issues like delayed or missing delivery, contact the courier first; if they can\'t resolve it, contact our Support with your order ID.', note: null } },
      { id: 'delivery', title: 'Delivery options', article: { title: 'What delivery options are available?', content: 'We work with supported logistics partners for standard and express delivery. Delivery time and cost depend on your location and the option you choose at checkout. You can also arrange pick-up at a partner branch if available.', note: null } },
      { id: 'cancel-order', title: 'Cancel order', article: { title: 'Can I cancel my order?', content: 'You can cancel an order only while it\'s still unpaid or before it\'s been shipped. In "My Orders", open the order and tap "Cancel order", then confirm. If the order is already paid and/or shipped, we can\'t cancel it. In that case, you can wait for delivery and request a return/refund if the item is defective or not as described.', note: null } },
      { id: 'not-received', title: 'Order not received', article: { title: 'What if I have not received my order after the estimated delivery date?', content: 'First, check the tracking status in "My Orders" to see the latest update from the courier. If the status hasn\'t changed for several days or shows an issue, contact the logistics partner using the details on the tracking page. If they can\'t help or the parcel is lost, contact our Support with your order ID and a short description. We\'ll coordinate with the courier and, depending on the case, may offer a reshipment or a refund once the investigation is done.', note: null } },
    ],
  },
  {
    id: 'returns',
    title: 'Returns & Refunds',
    subCategories: [
      { id: 'return-policy', title: 'Return policy', article: { title: 'How do I request a return or refund?', content: 'Go to "My Orders", open the order, and tap "Request Return/Refund". Upload photos and a short description. For defective or wrong items, keep the original packaging. We will review and respond within 3–5 business days.', note: 'Refunds are processed to the original payment method and may take 5–10 business days.' } },
      { id: 'documents', title: 'Supporting documents', article: { title: 'What documents are needed for refund/return?', content: 'Please have ready: (1) Order ID and proof of purchase, (2) Photos or video of the item showing the issue, (3) A short written description. For wrong or defective items, keep the original packaging if possible.', note: null } },
    ],
  },
  {
    id: 'general',
    title: 'General',
    subCategories: [
      { id: 'account', title: 'Account & security', article: { title: 'How do I change my phone number or email?', content: 'Go to Account or Profile → "Personal information" or "Security". Select the field you want to change and follow the verification steps. You may need to verify your current number/email (e.g. via OTP) before adding a new one.', note: 'If you no longer have access, contact Support for account verification.' } },
      { id: 'contact', title: 'Contact support', article: { title: 'How do I contact support?', content: 'You can reach us via the 24/7 hotline, Live Chat in the app, or email. For faster help, have your order ID or account email ready. Our team will respond as soon as possible.', note: null } },
    ],
  },
  {
    id: 'policies',
    title: 'Policies',
    subCategories: [
      { id: 'privacy', title: 'Privacy policy', article: { title: 'Privacy policy', content: 'We collect and use your data in line with our Privacy Policy to provide services, process orders, and improve your experience. You can review the full policy on our website or in the app under Settings → Legal.', note: null } },
      { id: 'terms', title: 'Terms of service', article: { title: 'Terms of service', content: 'By using Lavisionario, you agree to our Terms of Service. These cover account use, orders, payments, and dispute resolution. Please read the full terms on our website or in the app.', note: null } },
    ],
  },
];

const categories = [
  { id: 'shopping', title: 'Shop with Lavisionario', iconColor: 'orange' },
  { id: 'deals', title: 'Deals & Promos', iconColor: 'orange' },
  { id: 'payments', title: 'Payments', iconColor: 'orange' },
  { id: 'orders', title: 'Orders & Shipping', iconColor: 'teal' },
  { id: 'returns', title: 'Returns & Refunds', iconColor: 'orange' },
  { id: 'general', title: 'General', iconColor: 'blue' },
  { id: 'policies', title: 'Policies', iconColor: 'orange' },
];

export default function NeedHelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [articleView, setArticleView] = useState(false);
  const [expandedCategoryId, setExpandedCategoryId] = useState(null);
  const [selectedArticle, setSelectedArticle] = useState(null);

  const popularQuestions = [
    { question: 'What are the effective supporting documents for refund/return requests?', categoryId: 'returns', subId: 'documents' },
    { question: 'Why is my account being limited?', categoryId: 'general', subId: 'account' },
    { question: 'How do I contact and track Lavisionario supported logistics partners?', categoryId: 'orders', subId: 'tracking' },
    { question: 'How do I choose Payment Center or e-Wallet as a payment option?', categoryId: 'payments', subId: 'payment-options' },
    { question: 'What should I do if I have not received my order after the estimated delivery date?', categoryId: 'orders', subId: 'not-received' },
    { question: 'Can I cancel my order?', categoryId: 'orders', subId: 'cancel-order' },
    { question: 'How do I change or update my phone number?', categoryId: 'general', subId: 'account' },
  ];

  const [advisoryDismissed, setAdvisoryDismissed] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    const q = searchQuery.trim().toLowerCase();
    if (!q) return;
    for (const cat of categoriesWithArticles) {
      const sub = cat.subCategories.find(
        (s) =>
          s.article.title.toLowerCase().includes(q) ||
          s.article.content.toLowerCase().includes(q)
      );
      if (sub) {
        setExpandedCategoryId(cat.id);
        setSelectedArticle({ categoryId: cat.id, subId: sub.id });
        setArticleView(true);
        return;
      }
    }
  };

  const handleCategoryClick = (categoryId) => {
    const cat = categoriesWithArticles.find((c) => c.id === categoryId);
    if (cat?.subCategories?.length) {
      setExpandedCategoryId(categoryId);
      setSelectedArticle({ categoryId, subId: cat.subCategories[0].id });
      setArticleView(true);
    }
  };

  const toggleCategoryExpand = (categoryId) => {
    setExpandedCategoryId((prev) => (prev === categoryId ? null : categoryId));
  };

  const selectSubArticle = (categoryId, subId) => {
    setSelectedArticle({ categoryId, subId });
  };

  const currentArticleData = selectedArticle && (() => {
    const cat = categoriesWithArticles.find((c) => c.id === selectedArticle.categoryId);
    const sub = cat?.subCategories.find((s) => s.id === selectedArticle.subId);
    return sub?.article ?? null;
  })();

  const handleQuestionClick = (categoryId, subId) => {
    setExpandedCategoryId(categoryId);
    setSelectedArticle({ categoryId, subId });
    setArticleView(true);
  };

  return (
    <div className={styles.container}>
      <div className={styles.contentWrap}>
        {/* Top Navigation – white bar like Shopee */}
        <nav className={styles.topNav}>
          <div className={styles.navContent}>
            {articleView ? (
              <button
                type="button"
                className={styles.logoGroup}
                onClick={() => setArticleView(false)}
              >
                <span className={styles.logoIcon} aria-hidden><span className={styles.logoLetter}>L</span></span>
                <span className={styles.logoText}>Lavisionario</span>
                <span className={styles.helpCenterText}>Help Center</span>
              </button>
            ) : (
              <Link href="/" className={styles.logoGroup}>
                <span className={styles.logoIcon} aria-hidden><span className={styles.logoLetter}>L</span></span>
                <span className={styles.logoText}>Lavisionario</span>
                <span className={styles.helpCenterText}>Help Center</span>
              </Link>
            )}
            <Link href="/policies" className={styles.policiesLink}>Policies</Link>
          </div>
        </nav>

        {/* Hero – green band, title + search only */}
        <div className={styles.heroWrap}>
          <section className={styles.hero}>
            <h1 className={styles.heroTitle}>Hi, how can we help?</h1>
            <form onSubmit={handleSearch} className={styles.searchForm}>
              <div className={styles.searchWrapper}>
                <div className={styles.searchInputWrap}>
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={styles.searchInput}
                  />
                </div>
                <button type="submit" className={styles.searchBtn} aria-label="Search">
                  <FaMagnifyingGlass className={styles.searchIcon} aria-hidden />
                </button>
              </div>
            </form>
          </section>
        </div>

        {/* Advisory banner – dismissible */}
        {!advisoryDismissed && (
          <div className={styles.advisoryBanner}>
            <p className={styles.advisoryText}>
              Advisory: Make sure your Lavisionario app is always updated to the latest version to enjoy the newest features!
            </p>
            <button
              type="button"
              className={styles.advisoryClose}
              onClick={() => setAdvisoryDismissed(true)}
              aria-label="Close advisory"
            >
              ×
            </button>
          </div>
        )}

        {articleView ? (
          /* Article view: sidebar (dropdown categories) + article content */
          <div className={styles.articleLayout}>
            <aside className={styles.sidebar}>
              {categoriesWithArticles.map((cat) => {
                const isExpanded = expandedCategoryId === cat.id;
                return (
                  <div key={cat.id} className={styles.sidebarCategory}>
                    <button
                      type="button"
                      className={styles.sidebarCategoryBtn}
                      onClick={() => toggleCategoryExpand(cat.id)}
                      aria-expanded={isExpanded}
                    >
                      {isExpanded ? (
                        <FaChevronDown className={styles.sidebarCaret} aria-hidden />
                      ) : (
                        <FaChevronRight className={styles.sidebarCaret} aria-hidden />
                      )}
                      <span>{cat.title}</span>
                    </button>
                    {isExpanded && (
                      <ul className={styles.sidebarSubList}>
                        {cat.subCategories.map((sub) => {
                          const isSelected =
                            selectedArticle?.categoryId === cat.id && selectedArticle?.subId === sub.id;
                          return (
                            <li key={sub.id}>
                              <button
                                type="button"
                                className={`${styles.sidebarSubItem} ${isSelected ? styles.sidebarSubItemActive : ''}`}
                                onClick={() => selectSubArticle(cat.id, sub.id)}
                              >
                                {sub.title}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
            </aside>
            <div className={styles.articlePanel}>
              {currentArticleData ? (
                <>
                  <h1 className={styles.articleTitle}>{currentArticleData.title}</h1>
                  <p className={styles.articleContent}>{currentArticleData.content}</p>
                  {currentArticleData.note && (
                    <div className={styles.articleNote}>
                      <p>{currentArticleData.note}</p>
                    </div>
                  )}
                </>
              ) : (
                <p className={styles.articlePlaceholder}>Select an article from the left.</p>
              )}
            </div>
          </div>
        ) : (
        <main className={styles.main}>
          {/* Categories – icon above title, card layout like Shopee */}
          <section className={styles.categoriesSection}>
            <h2 className={styles.sectionTitle}>Categories</h2>
            <div className={styles.categoriesGrid}>
              {categories.map((category) => {
                const IconComponent = categoryIcons[category.id];
                const iconCircleClass = styles[`categoryIconCircle_${category.iconColor}`];
                return (
                  <div
                    key={category.id}
                    className={styles.categoryCard}
                    onClick={() => handleCategoryClick(category.id)}
                  >
                    <div className={`${styles.categoryIconCircle} ${iconCircleClass}`}>
                      {IconComponent && <IconComponent className={styles.categoryIconSvg} aria-hidden />}
                    </div>
                    <h3 className={styles.categoryTitle}>{category.title}</h3>
                  </div>
                );
              })}
            </div>
          </section>

        {/* Popular questions – tap goes to categorized article (no dropdown) */}
        <section className={styles.popularSection}>
          <h2 className={styles.sectionTitle}>Popular questions</h2>
          <div className={styles.questionsList}>
            {popularQuestions.map((item, index) => (
              <div
                key={index}
                className={styles.questionItem}
                onClick={() => handleQuestionClick(item.categoryId, item.subId)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleQuestionClick(item.categoryId, item.subId)}
              >
                <span className={styles.questionText}>{item.question}</span>
                <FaChevronRight className={styles.questionArrow} aria-hidden />
              </div>
            ))}
          </div>
        </section>

        {/* Still need help? Contact - Shopee-style CTA strip */}
        <section className={styles.contactStrip}>
          <div className={styles.contactStripContent}>
            <h2 className={styles.contactStripTitle}>Still need help?</h2>
            <p className={styles.contactStripText}>Get in touch with our support team</p>
            <div className={styles.contactGrid}>
              <a href="tel:+6327123456" className={styles.contactCard}>
                <FaPhone className={styles.contactIcon} aria-hidden />
                <h3 className={styles.contactTitle}>24/7 Hotline</h3>
                <p className={styles.contactText}>Call us anytime</p>
              </a>
              <button type="button" className={styles.contactCard}>
                <FaComments className={styles.contactIcon} aria-hidden />
                <h3 className={styles.contactTitle}>Live Chat</h3>
                <p className={styles.contactText}>Chat with support</p>
              </button>
              <a href="mailto:support@lavisionario.ph" className={styles.contactCard}>
                <FaEnvelope className={styles.contactIcon} aria-hidden />
                <h3 className={styles.contactTitle}>Email</h3>
                <p className={styles.contactText}>Send us a message</p>
              </a>
            </div>
          </div>
        </section>
        </main>
        )}

        <footer className={styles.footer}>
          <div className={styles.footerContent}>
            <p>© 2026 Lavisionario. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}