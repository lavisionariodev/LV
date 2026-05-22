 "use client"

 import { useEffect, useMemo, useState } from "react"
 import Image from "next/image"
 import { useRouter, useSearchParams } from "next/navigation"
 import Link from "next/link"
 import styles from "./checkout.module.css"
import { useCart } from "@/contexts/CartContext"
import { getUser } from "@/lib/auth/session"
import { getBuyerAccountStatus, ROLE_BUYER } from "@/lib/auth/roles"
import { formatPhpAmount } from "@/lib/cart/formatPhp"
import { enrichCartItemsWithSellerMeta, mapCartItemToDisplayRow } from "@/lib/cart/fromListing"
import { fetchActiveShopListings } from "@/lib/shop-listings/client"
import { supabase } from "@/lib/supabase/client"

function SellerCircleAvatar({ name, avatarUrl, className, imgClassName }) {
  const [failed, setFailed] = useState(false)
  const url = typeof avatarUrl === "string" && avatarUrl.trim() ? avatarUrl.trim() : ""
  const show = Boolean(url) && !failed
  const initial = (name || "S").charAt(0).toUpperCase()

  return (
    <div className={className}>
      {show ? (
        <Image
          src={url}
          alt=""
          width={20}
          height={20}
          className={imgClassName}
          onError={() => setFailed(true)}
          unoptimized={url.startsWith("blob:")}
        />
      ) : (
        initial
      )}
    </div>
  )
}

 export default function CheckoutPage() {
   const router = useRouter()
   const searchParams = useSearchParams()
   const { items: cartItems, loading: cartLoading, refreshCart } = useCart()
  const [loadingUser, setLoadingUser] = useState(true)
  const [user, setUser] = useState(null)
  const [isBuyerRole, setIsBuyerRole] = useState(false)
  const [buyerSuspended, setBuyerSuspended] = useState(false)
  const [profile, setProfile] = useState(null)
  const [contactName, setContactName] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [contactPhone, setContactPhone] = useState("")
  const [serviceLocation, setServiceLocation] = useState("")
  const [deceasedName, setDeceasedName] = useState("")
  const [dateOfDeath, setDateOfDeath] = useState("")
  const [wakeDurationDays, setWakeDurationDays] = useState("")
  const [preferredDate, setPreferredDate] = useState("")
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [listingRows, setListingRows] = useState([])

  useEffect(() => {
    let cancelled = false
    fetchActiveShopListings().then((rows) => {
      if (!cancelled) setListingRows(Array.isArray(rows) ? rows : [])
    })
    return () => {
      cancelled = true
    }
  }, [])

   useEffect(() => {
     let mounted = true
    getUser().then(async (currentUser) => {
      if (!mounted) return
      if (!currentUser) {
        setLoadingUser(false)
        router.replace("/buyer/login?redirect=/checkout")
        return
      }
      const { role, status } = await getBuyerAccountStatus(currentUser.id)
      setUser(currentUser)
      setIsBuyerRole(role === ROLE_BUYER)
      setBuyerSuspended(role === ROLE_BUYER && status === 'suspended')
      setContactEmail(currentUser.email || "")

      const { data: profileRow } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", currentUser.id)
        .maybeSingle()

      if (!mounted) return
      setProfile(profileRow || null)

      const fullNameFromProfile = (profileRow?.full_name || "").trim()
      setContactName(fullNameFromProfile || currentUser.user_metadata?.full_name || "")

      const phoneFromProfile = (profileRow?.phone || "").trim()
      if (phoneFromProfile) setContactPhone(phoneFromProfile)

      setLoadingUser(false)
    })
     return () => {
       mounted = false
     }
   }, [router])

   const filteredItems = useMemo(() => {
     const itemsParam = searchParams.get("items")
     const base = !itemsParam
       ? cartItems
       : cartItems.filter((item) => {
           const ids = new Set(
             itemsParam
               .split(",")
               .map((v) => v.trim())
               .filter(Boolean)
           )
           return ids.has(String(item.id))
         })
     return enrichCartItemsWithSellerMeta(base, listingRows)
   }, [cartItems, searchParams, listingRows])

   const summaryRows = useMemo(
     () => filteredItems.map((item) => mapCartItemToDisplayRow(item)),
     [filteredItems],
   )

   const subtotal = summaryRows.reduce(
     (sum, item) => sum + (item.price || 0) * (item.qty || 1),
     0
   )

   if (loadingUser) {
     return (
       <main className={styles.checkoutPage}>
         <div className={styles.centeredBox}>
           <p className={styles.muted}>Checking your session…</p>
         </div>
       </main>
     )
   }

  if (!user) {
     return null
   }

  if (user && !isBuyerRole) {
    router.replace('/buyer/login?redirect=/checkout')
    return null
  }

  if (buyerSuspended) {
    return (
      <main className={styles.checkoutPage}>
        <div className={styles.centeredBox}>
          <p className={styles.muted}>
            Your buyer account has been suspended. Please contact support if you believe this is in error.
          </p>
          <Link href="/" className={styles.crumb}>Back to homepage</Link>
        </div>
      </main>
    )
  }

  const hasScopedItemsParam = Boolean(searchParams.get("items")?.trim())

  if (hasScopedItemsParam && cartLoading) {
    return (
      <main className={styles.checkoutPage}>
        <header className={styles.hero}>
          <div className={styles.heroInner}>
            <nav className={styles.breadcrumb} aria-label="Breadcrumb">
              <Link href="/" className={styles.crumb}>Home</Link>
              <span className={styles.slash}>/</span>
              <Link href="/cart" className={styles.crumb}>Cart</Link>
              <span className={styles.slash}>/</span>
              <span className={styles.crumbActive}>Checkout</span>
            </nav>
            <h1 className={styles.heroTitle}>Checkout</h1>
          </div>
        </header>
        <section className={styles.content}>
          <div className={styles.centeredBox}>
            <p className={styles.muted}>Loading your cart…</p>
          </div>
        </section>
      </main>
    )
  }

  const isEmpty = summaryRows.length === 0

  const productIds = filteredItems.map((i) => String(i.id))

  const checkoutAndPay = async () => {
    setSubmitError("")
    if (submitting) return
    setSubmitting(true)
    try {
      const phoneToSend = (contactPhone || profile?.phone || "").trim()
      if (!phoneToSend) {
        setSubmitError("Please add a contact number to continue.")
        return
      }
      const locationToSend = (serviceLocation || "").trim()
      if (!locationToSend) {
        setSubmitError("Please add a service location to continue.")
        return
      }

      const res = await fetch("/api/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productIds,
          contact: {
            contact_name: (contactName || "").trim(),
            contact_email: (contactEmail || "").trim(),
            contact_phone: phoneToSend,
            service_location: locationToSend,
            deceased_name: (deceasedName || "").trim(),
            date_of_death: dateOfDeath,
            wake_duration_days: wakeDurationDays,
            preferred_date: preferredDate,
            notes,
          },
        }),
      })

      const body = await res.json().catch(() => null)
      if (!res.ok) {
        setSubmitError(body?.error || "Could not proceed to checkout. Please try again.")
        return
      }

      const orderIds = Array.isArray(body?.order_ids)
        ? body.order_ids.map((id) => String(id).trim()).filter(Boolean)
        : []

      if (orderIds.length === 0) {
        setSubmitError("Checkout could not continue. Contact support if this persists.")
        await refreshCart()
        router.replace('/profile/purchases')
        return
      }

      await refreshCart()

      const payRes = await fetch('/api/checkout/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds }),
      })

      const payBody = await payRes.json().catch(() => null)
      if (payRes.ok && payBody?.redirect_url) {
        window.location.href = payBody.redirect_url
        return
      }

      const payErrMsg =
        typeof payBody?.error === 'string'
          ? payBody.error
          : 'Could not open secure payment. Add items again from cart to checkout and pay.'
      try {
        sessionStorage.setItem('lv_checkout_pay_error', payErrMsg)
      } catch {
        /* ignore quota / privacy mode */
      }
      await refreshCart()
      router.replace('/profile/purchases')
    } catch {
      setSubmitError("Network error. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

   return (
     <main className={styles.checkoutPage}>
       <header className={styles.hero}>
         <div className={styles.heroInner}>
           <nav className={styles.breadcrumb} aria-label="Breadcrumb">
             <Link href="/" className={styles.crumb}>Home</Link>
             <span className={styles.slash}>/</span>
             <Link href="/cart" className={styles.crumb}>Cart</Link>
             <span className={styles.slash}>/</span>
             <span className={styles.crumbActive}>Checkout</span>
           </nav>
           <h1 className={styles.heroTitle}>Checkout</h1>
         </div>
       </header>

       <section className={styles.content}>
         {isEmpty ? (
           <div className={styles.emptyState}>
             <div style={{ color: "rgba(16,40,32,0.22)", marginBottom: 4 }}>
               <svg viewBox="0 0 48 48" width="44" height="44" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                 <path d="M4 6h4l5 22h22l4-16H13" />
                 <circle cx="18" cy="38" r="2.5" fill="currentColor" stroke="none" />
                 <circle cx="32" cy="38" r="2.5" fill="currentColor" stroke="none" />
               </svg>
             </div>
             <h2 className={styles.emptyTitle}>Nothing to checkout</h2>
             <p className={styles.emptyText}>
               Your cart is empty or the selected items are no longer available.
             </p>
             <Link href="/shop" className={styles.primaryLink}>
               Browse services
             </Link>
           </div>
         ) : (
           <div className={styles.layout}>
             <div className={styles.leftColumn}>
               <h2 className={styles.sectionTitle}>Your details</h2>
               <p className={styles.sectionHint}>
                 Review your order on the right, then use Checkout &amp; pay. Payment happens on the next secure PayMongo screen. Your provider confirms the booking afterward.
               </p>

               <div className={styles.formBody}>
                 {!profile?.phone && (
                   <div className={styles.fieldGroup}>
                     <label className={styles.label} htmlFor="contact_phone">Phone number</label>
                     <input
                       id="contact_phone"
                       type="tel"
                       className={styles.input}
                       value={contactPhone}
                       onChange={(e) => setContactPhone(e.target.value)}
                       placeholder="09XX XXX XXXX"
                       autoComplete="tel"
                       inputMode="tel"
                       required
                     />
                     <Link href="/profile/account" className={styles.inlineLink} style={{ marginTop: 10 }}>
                       Update your profile details
                       <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                         <path d="M6 3h7v7" />
                         <path d="M13 3L3 13" />
                       </svg>
                     </Link>
                   </div>
                 )}

                 <div className={styles.fieldGroup}>
                   <label className={styles.label} htmlFor="preferred_date">Preferred schedule</label>
                   <input
                     id="preferred_date"
                     type="date"
                     className={styles.input}
                     value={preferredDate}
                     onChange={(e) => setPreferredDate(e.target.value)}
                   />
                 </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label} htmlFor="service_location">Service location</label>
                  <input
                    id="service_location"
                    type="text"
                    className={styles.input}
                    value={serviceLocation}
                    onChange={(e) => setServiceLocation(e.target.value)}
                    placeholder="City, venue, or full address"
                    autoComplete="street-address"
                    required
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label} htmlFor="deceased_name">Deceased name (optional)</label>
                  <input
                    id="deceased_name"
                    type="text"
                    className={styles.input}
                    value={deceasedName}
                    onChange={(e) => setDeceasedName(e.target.value)}
                    placeholder="Full name"
                  />
                </div>

                <div className={styles.fieldRow}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label} htmlFor="date_of_death">Date of death (optional)</label>
                    <input
                      id="date_of_death"
                      type="date"
                      className={styles.input}
                      value={dateOfDeath}
                      onChange={(e) => setDateOfDeath(e.target.value)}
                    />
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label} htmlFor="wake_duration_days">Wake duration (days, optional)</label>
                    <input
                      id="wake_duration_days"
                      type="number"
                      min={0}
                      className={styles.input}
                      value={wakeDurationDays}
                      onChange={(e) => setWakeDurationDays(e.target.value)}
                      placeholder="e.g. 3"
                      inputMode="numeric"
                    />
                  </div>
                </div>

                 <div className={styles.fieldGroup}>
                   <label className={styles.label} htmlFor="notes">Notes for provider</label>
                   <textarea
                     id="notes"
                     className={`${styles.input} ${styles.textarea}`}
                     rows={5}
                     value={notes}
                     onChange={(e) => setNotes(e.target.value)}
                     placeholder="Share any specific requests, traditions, or considerations you want the provider to know."
                   />
                 </div>
               </div>

               <div className={styles.noteBox}>
                 <h4 className={styles.noteTitle}>Note</h4>
                 <p className={styles.noteText}>
                   Completing Checkout &amp; pay places your paid order. Provider confirmation completes the arrangement; contact them or support for refunds if plans change.
                 </p>
               </div>
             </div>

             <aside className={styles.rightColumn}>
               <h2 className={styles.sectionTitle}>Summary</h2>
               <ul className={styles.itemsList}>
                 {summaryRows.map((row) => (
                   <li key={row.id} className={styles.itemRow}>
                     <div className={styles.itemMain}>
                      <p className={styles.itemName}>{row.name}</p>
                       {row.description && (
                         <p className={styles.itemMeta}>{row.description}</p>
                       )}
                       <div className={styles.itemProviderRow}>
                         <SellerCircleAvatar
                           name={row.sellerName}
                           avatarUrl={row.sellerAvatarUrl}
                           className={styles.itemProviderAvatar}
                           imgClassName={styles.itemProviderAvatarImg}
                         />
                         <span className={styles.itemProviderName}>{row.provider}</span>
                       </div>
                     </div>
                     <div className={styles.itemMetaRight}>
                       <span className={styles.itemQty}>×{row.qty ?? 1}</span>
                       <span className={styles.itemPrice}>
                         {formatPhpAmount((row.price || 0) * (row.qty || 1))}
                       </span>
                     </div>
                   </li>
                 ))}
               </ul>

               <div className={styles.summaryRow}>
                 <span>Subtotal</span>
                 <span>{formatPhpAmount(subtotal)}</span>
               </div>
              <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
                 <span>Total</span>
                 <span>{formatPhpAmount(subtotal)}</span>
               </div>

              {submitError && (
                <p className={styles.emptyText} style={{ marginTop: 12 }}>
                  {submitError}
                </p>
              )}

               <button
                 type="button"
                 className={styles.primaryButton}
                onClick={checkoutAndPay}
                disabled={submitting}
               >
                {submitting ? "Opening secure payment…" : "Checkout & pay"}
               </button>

               <button
                 type="button"
                 className={styles.secondaryButton}
                 onClick={() => router.push("/cart")}
                disabled={submitting}
               >
                 Back to Cart
               </button>

               <div className={styles.trustList}>
                 <div className={styles.trustItem}>
                   <svg className={styles.trustIcon} viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="var(--color-gold-base,#B8962E)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                     <path d="M8 1L2 4v4c0 3.3 2.5 6.4 6 7.3 3.5-.9 6-4 6-7.3V4L8 1z" />
                     <path d="M5.5 8l2 2 3-3" />
                   </svg>
                   <span>Secure &amp; verified payment</span>
                 </div>
                 <div className={styles.trustItem}>
                   <svg className={styles.trustIcon} viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="var(--color-gold-base,#B8962E)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                     <rect x="2" y="2" width="12" height="13" rx="1.5" />
                     <path d="M5 2V1M11 2V1M2 6h12" />
                     <path d="M5 9h1M8 9h1M11 9h1M5 12h1M8 12h1" />
                   </svg>
                   <span>Provider confirms details after payment</span>
                 </div>
                 <div className={styles.trustItem}>
                   <svg className={styles.trustIcon} viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="var(--color-gold-base,#B8962E)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                     <path d="M14 10.7c0 .7-.6 1.3-1.3 1.3H4L1 15V3.3C1 2.6 1.6 2 2.3 2h10.4C13.4 2 14 2.6 14 3.3v7.4z" />
                   </svg>
                   <span>Dedicated concierge support</span>
                 </div>
               </div>
             </aside>
           </div>
         )}
       </section>
     </main>
   )
 }

