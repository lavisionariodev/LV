// PublicFooter.jsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './PublicFooter.module.css'
import { useSiteContent } from '@/lib/siteContent/client'

export default function PublicFooter() {
  const pathname = usePathname()
  const isSeller = pathname?.startsWith('/seller')
  const { data: siteContent } = useSiteContent()
  const footer = siteContent?.footer
  const systemName = siteContent?.systemName || 'LaVisionario'

  if (isSeller) {
    return (
      <footer className={styles.footer}>
        <div className={styles.bottom}>
          <span>© 2026 {systemName}. All rights reserved.</span>
          <div className={styles.bottomLinks}>
            <Link href="/help" className={styles.bottomLink}>
              Help Center
            </Link>
          </div>
        </div>
      </footer>
    )
  }

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>
              <span className={styles.logoLetter}>L</span>
            </span>
            <span className={styles.logoText}>{systemName}</span>
          </div>
          <p className={styles.desc}>
            {footer?.tagline ||
              "A trusted funeral services marketplace connecting families with compassionate providers during life's most difficult moments."}
          </p>
        </div>

        <div className={styles.cols}>
          <div className={styles.col}>
            <h4 className={styles.title}>Quick Links</h4>
            <Link href="/shop" className={styles.link}>
              Browse Services
            </Link>
            <Link href="/shop" className={styles.link}>
              Cremation Packages
            </Link>
            <Link href="/shop" className={styles.link}>
              Burial Packages
            </Link>
            <Link href="/shop" className={styles.link}>
              Memorial Lots
            </Link>
            <Link href="/shop" className={styles.link}>
              Chapels
            </Link>
          </div>

          <div className={styles.col}>
            <h4 className={styles.title}>Company</h4>
            <Link href="/about" className={styles.link}>
              About
            </Link>
            <Link href="/how-it-works" className={styles.link}>
              How It Works
            </Link>
            <Link href="/providers" className={styles.link}>
              Become a Provider
            </Link>
            <Link href="/contact" className={styles.link}>
              Contact
            </Link>
          </div>

          <div className={styles.col}>
            <h4 className={styles.title}>Support</h4>
            <Link href="/help" className={styles.link}>
              Help Center
            </Link>
            <Link href="/faq" className={styles.link}>
              FAQs
            </Link>
            <Link href="/privacy" className={styles.link}>
              Privacy Policy
            </Link>
            <Link href="/terms" className={styles.link}>
              Terms of Service
            </Link>
          </div>

          <div className={styles.col}>
            <h4 className={styles.title}>Contact</h4>
            <div className={styles.contactItem}>
              <span className={styles.contactLabel}>24/7 Support</span>
              <a
                href={footer?.supportPhone ? `tel:${footer.supportPhone}` : 'tel:+1234567890'}
                className={styles.link}
              >
                {footer?.supportPhone || '+1 (234) 567-890'}
              </a>
            </div>
            <div className={styles.contactItem}>
              <a
                href={
                  footer?.supportEmail
                    ? `mailto:${footer.supportEmail}`
                    : 'mailto:support@lavisionario.com'
                }
                className={styles.link}
              >
                {footer?.supportEmail || 'support@lavisionario.com'}
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.bottom}>
        <span>
          © {new Date().getFullYear()} {systemName}. All rights reserved.
        </span>
        <div className={styles.bottomLinks}>
          <Link href="/sitemap" className={styles.bottomLink}>
            Sitemap
          </Link>
          <Link href="/accessibility" className={styles.bottomLink}>
            Accessibility
          </Link>
        </div>
      </div>
    </footer>
  )
}
