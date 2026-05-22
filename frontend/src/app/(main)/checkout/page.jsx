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
import {
  buildListingKindById,
  checkoutLaneFromCartItems,
  checkoutLaneFromKind,
  formatListingKindLabel,
  getCheckoutCopy,
} from "@/lib/listings/kind"
import {
  applyCheckoutDraftContact,
  clearCheckoutDraft,
  loadCheckoutDraft,
  saveCheckoutDraft,
} from "@/lib/checkout/checkoutDraft"
import { fetchActiveShopListings } from "@/lib/shop-listings/client"
import {
  deliveryAddressFromProfile,
  emptyDeliveryAddress,
  formatDeliveryAddressForOrder,
  validateCheckoutContact,
} from "@/lib/checkout/deliveryAddress"
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

function CheckoutAddressFields({
  variant,
  styles,
  contactName,
  onContactNameChange,
  deliveryAddress,
  setDeliveryAddress,
}) {
  const isProduct = variant === 'product'
  const idPrefix = isProduct ? 'delivery' : 'service_loc'

  return (
    <div className={styles.deliveryBlock}>
      <h3 className={styles.deliveryBlockTitle}>
        {isProduct ? 'Delivery information' : 'Service location'}
      </h3>
      <p className={styles.deliveryBlockHint}>
        {isProduct
          ? 'Enter the full address where your order should be delivered. Required fields are marked with *.'
          : 'Enter the full address where the service will take place (venue, chapel, residence, etc.). Required fields are marked with *.'}
      </p>

      {!isProduct ? (
        <div className={styles.fieldGroup}>
          <label className={styles.label} htmlFor={`${idPrefix}_contact_name`}>
            * Contact name
          </label>
          <input
            id={`${idPrefix}_contact_name`}
            type="text"
            className={styles.input}
            value={contactName}
            onChange={(e) => onContactNameChange(e.target.value)}
            placeholder="Your full name"
            autoComplete="name"
            required
          />
        </div>
      ) : null}

      {isProduct ? (
        <div className={styles.fieldGroup}>
          <label className={styles.label} htmlFor={`${idPrefix}_recipient`}>
            * Recipient name
          </label>
          <input
            id={`${idPrefix}_recipient`}
            type="text"
            className={styles.input}
            value={contactName}
            onChange={(e) => onContactNameChange(e.target.value)}
            placeholder="Full name of person receiving the order"
            autoComplete="name"
            required
          />
        </div>
      ) : null}

      <div className={styles.fieldGroup}>
        <label className={styles.label} htmlFor={`${idPrefix}_street`}>
          * Street / house no.
        </label>
        <input
          id={`${idPrefix}_street`}
          type="text"
          className={styles.input}
          value={deliveryAddress.street}
          onChange={(e) => setDeliveryAddress((prev) => ({ ...prev, street: e.target.value }))}
          placeholder="House no., building, street name"
          autoComplete="address-line1"
          required
        />
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.label} htmlFor={`${idPrefix}_unit`}>
          Unit / floor / subdivision (optional)
        </label>
        <input
          id={`${idPrefix}_unit`}
          type="text"
          className={styles.input}
          value={deliveryAddress.unit}
          onChange={(e) => setDeliveryAddress((prev) => ({ ...prev, unit: e.target.value }))}
          placeholder="e.g. Unit 12B, Villa Verde"
          autoComplete="address-line2"
        />
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.label} htmlFor={`${idPrefix}_barangay`}>
          Barangay (optional)
        </label>
        <input
          id={`${idPrefix}_barangay`}
          type="text"
          className={styles.input}
          value={deliveryAddress.barangay}
          onChange={(e) => setDeliveryAddress((prev) => ({ ...prev, barangay: e.target.value }))}
          placeholder="Barangay"
        />
      </div>

      <div className={styles.addressGrid}>
        <div className={styles.fieldGroup}>
          <label className={styles.label} htmlFor={`${idPrefix}_city`}>
            * City / municipality
          </label>
          <input
            id={`${idPrefix}_city`}
            type="text"
            className={styles.input}
            value={deliveryAddress.city}
            onChange={(e) => setDeliveryAddress((prev) => ({ ...prev, city: e.target.value }))}
            placeholder="City"
            autoComplete="address-level2"
            required
          />
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label} htmlFor={`${idPrefix}_province`}>
            * Province
          </label>
          <input
            id={`${idPrefix}_province`}
            type="text"
            className={styles.input}
            value={deliveryAddress.province}
            onChange={(e) => setDeliveryAddress((prev) => ({ ...prev, province: e.target.value }))}
            placeholder="Province"
            autoComplete="address-level1"
            required
          />
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label} htmlFor={`${idPrefix}_zip`}>
            Postal / ZIP code
          </label>
          <input
            id={`${idPrefix}_zip`}
            type="text"
            className={styles.input}
            value={deliveryAddress.zip}
            onChange={(e) => setDeliveryAddress((prev) => ({ ...prev, zip: e.target.value }))}
            placeholder="e.g. 1605"
            autoComplete="postal-code"
            inputMode="numeric"
          />
        </div>
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.label} htmlFor={`${idPrefix}_landmark`}>
          {isProduct ? 'Landmark (optional)' : 'Venue / landmark (optional)'}
        </label>
        <input
          id={`${idPrefix}_landmark`}
          type="text"
          className={styles.input}
          value={deliveryAddress.landmark}
          onChange={(e) => setDeliveryAddress((prev) => ({ ...prev, landmark: e.target.value }))}
          placeholder={
            isProduct
              ? 'e.g. Near 7-Eleven, blue gate'
              : 'e.g. Chapel name, funeral home wing, gate color'
          }
        />
      </div>

      <Link href="/profile/account" className={styles.inlineLink}>
        Update saved address in your profile
        <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 3h7v7" />
          <path d="M13 3L3 13" />
        </svg>
      </Link>
    </div>
  )
}

function CheckoutPaymentOverlay({ title, subtitle }) {
  return (
    <div className={styles.paymentOverlay} role="status" aria-live="polite" aria-busy="true">
      <div className={styles.paymentOverlayCard}>
        <div className={styles.paymentSpinner} aria-hidden />
        <p className={styles.paymentOverlayTitle}>{title}</p>
        {subtitle ? <p className={styles.paymentOverlaySub}>{subtitle}</p> : null}
      </div>
    </div>
  )
}

function CheckoutLoadingSkeleton() {
  return (
    <main className={styles.checkoutPage} aria-busy="true" aria-label="Loading checkout">
      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <nav className={styles.breadcrumb} aria-hidden>
            <span className={`${styles.skeletonBlock} ${styles.skBreadSm}`} />
            <span className={styles.slash}>/</span>
            <span className={`${styles.skeletonBlock} ${styles.skBreadMd}`} />
            <span className={styles.slash}>/</span>
            <span className={`${styles.skeletonBlock} ${styles.skBreadMd}`} />
            <span className={styles.slash}>/</span>
            <span className={`${styles.skeletonBlock} ${styles.skBreadLg}`} />
          </nav>
          <div className={`${styles.skeletonBlock} ${styles.skHeroTitle}`} />
        </div>
      </header>

      <section className={styles.content}>
        <div className={styles.layout}>
          <div className={styles.leftColumn} aria-hidden>
            <div className={`${styles.skeletonBlock} ${styles.skSectionBar}`} />
            <div className={`${styles.skeletonBlock} ${styles.skSectionHint}`} />
            <div className={styles.skFormBody}>
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className={styles.skFieldGroup}>
                  <span className={`${styles.skeletonBlock} ${styles.skLabel}`} />
                  <span className={`${styles.skeletonBlock} ${styles.skInput}`} />
                </div>
              ))}
              <div className={styles.skFieldGroup}>
                <span className={`${styles.skeletonBlock} ${styles.skLabel}`} />
                <span className={`${styles.skeletonBlock} ${styles.skTextarea}`} />
              </div>
            </div>
            <div className={styles.skNoteBox}>
              <span className={`${styles.skeletonBlock} ${styles.skNoteTitle}`} />
              <span className={`${styles.skeletonBlock} ${styles.skNoteLine}`} />
              <span className={`${styles.skeletonBlock} ${styles.skNoteLineShort}`} />
            </div>
          </div>

          <aside className={styles.rightColumn} aria-hidden>
            <div className={`${styles.skeletonBlock} ${styles.skSummaryTitle}`} />
            <ul className={styles.itemsList}>
              {Array.from({ length: 2 }).map((_, idx) => (
                <li key={idx} className={styles.skSummaryItem}>
                  <div className={styles.skSummaryItemMain}>
                    <span className={`${styles.skeletonBlock} ${styles.skSummaryName}`} />
                    <span className={`${styles.skeletonBlock} ${styles.skSummaryMeta}`} />
                  </div>
                  <span className={`${styles.skeletonBlock} ${styles.skSummaryPrice}`} />
                </li>
              ))}
            </ul>
            <div className={styles.skSummaryTotals}>
              <div className={styles.skSummaryTotalRow}>
                <span className={`${styles.skeletonBlock} ${styles.skSummaryTotalLabel}`} />
                <span className={`${styles.skeletonBlock} ${styles.skSummaryTotalValue}`} />
              </div>
              <div className={styles.skSummaryTotalRow}>
                <span className={`${styles.skeletonBlock} ${styles.skSummaryTotalLabel}`} />
                <span className={`${styles.skeletonBlock} ${styles.skSummaryTotalValueLg}`} />
              </div>
            </div>
            <div className={`${styles.skeletonBlock} ${styles.skPrimaryBtn}`} />
            <div className={`${styles.skeletonBlock} ${styles.skSecondaryBtn}`} />
          </aside>
        </div>
      </section>
    </main>
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
  const [deliveryAddress, setDeliveryAddress] = useState(emptyDeliveryAddress)
  const [deceasedName, setDeceasedName] = useState("")
  const [dateOfDeath, setDateOfDeath] = useState("")
  const [wakeDurationDays, setWakeDurationDays] = useState("")
  const [preferredDate, setPreferredDate] = useState("")
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [payRedirecting, setPayRedirecting] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [listingRows, setListingRows] = useState([])
  const [listingsLoading, setListingsLoading] = useState(true)
  const [resumeLoading, setResumeLoading] = useState(false)
  /** @type {[{ orderIds: string[], lineItems: object[], lane: string, paymentId: string } | null]} */
  const [resumeContext, setResumeContext] = useState(null)

  const resumePaymentId = searchParams.get("payment")?.trim() || ""
  const isResumeQuery = searchParams.get("resume") === "1" && Boolean(resumePaymentId)

  useEffect(() => {
    let cancelled = false
    fetchActiveShopListings()
      .then((rows) => {
        if (!cancelled) setListingRows(Array.isArray(rows) ? rows : [])
      })
      .finally(() => {
        if (!cancelled) setListingsLoading(false)
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
        .select("full_name, phone, address_street, address_city, address_province, address_zip")
        .eq("id", currentUser.id)
        .maybeSingle()

      if (!mounted) return
      setProfile(profileRow || null)

      const fullNameFromProfile = (profileRow?.full_name || "").trim()
      setContactName(fullNameFromProfile || currentUser.user_metadata?.full_name || "")

      const phoneFromProfile = (profileRow?.phone || "").trim()
      if (phoneFromProfile) setContactPhone(phoneFromProfile)

      setDeliveryAddress(deliveryAddressFromProfile(profileRow))

      setLoadingUser(false)
    })
     return () => {
       mounted = false
     }
   }, [router])

   useEffect(() => {
     if (isResumeQuery || loadingUser || !user || cartLoading) return
     const draft = loadCheckoutDraft()
     if (draft?.paymentId && cartItems.length === 0) {
       router.replace(`/checkout?resume=1&payment=${encodeURIComponent(draft.paymentId)}`)
     }
   }, [isResumeQuery, loadingUser, user, cartLoading, cartItems.length, router])

   useEffect(() => {
     if (!isResumeQuery || !user || loadingUser) return
     let cancelled = false
     ;(async () => {
       setResumeLoading(true)
       try {
         const res = await fetch(
           `/api/checkout/resume?payment=${encodeURIComponent(resumePaymentId)}`,
           { cache: "no-store" },
         )
         const body = await res.json().catch(() => null)
         if (!res.ok) {
           if (body?.redirect === "/checkout/success") {
             router.replace(`/checkout/success?payment=${encodeURIComponent(resumePaymentId)}`)
             return
           }
           if (!cancelled) {
             setSubmitError(body?.error || "Could not restore your checkout.")
           }
           return
         }
         if (cancelled) return

         const draft = loadCheckoutDraft()
         const draftContact = draft ? applyCheckoutDraftContact(draft.contact) : null
         const fromOrder = body?.contact || {}

         const restoredName = (draftContact?.contactName || fromOrder.contactName || "").trim()
         if (restoredName) setContactName(restoredName)
         if (fromOrder.contactEmail || draftContact?.contactEmail) {
           setContactEmail((draftContact?.contactEmail || fromOrder.contactEmail || "").trim())
         }
         if (draftContact?.contactPhone || fromOrder.contactPhone) {
           setContactPhone((draftContact?.contactPhone || fromOrder.contactPhone || "").trim())
         }
         if (draftContact?.deliveryAddress) {
           setDeliveryAddress({ ...emptyDeliveryAddress(), ...draftContact.deliveryAddress })
         }
         setDeceasedName((draftContact?.deceasedName || fromOrder.deceasedName || "").trim())
         setDateOfDeath((draftContact?.dateOfDeath || fromOrder.dateOfDeath || "").trim())
         setWakeDurationDays(
           (draftContact?.wakeDurationDays || fromOrder.wakeDurationDays || "").trim(),
         )
         setPreferredDate((draftContact?.preferredDate || fromOrder.preferredDate || "").trim())
         setNotes((draftContact?.notes || fromOrder.notes || "").trim())

         setResumeContext({
           orderIds: Array.isArray(body.orderIds) ? body.orderIds.map(String) : [],
           lineItems: Array.isArray(body.lineItems) ? body.lineItems : [],
           lane: body.lane === "product" ? "product" : "booking",
           paymentId: String(body.paymentId || resumePaymentId),
         })
         setSubmitError(
           "Payment was not completed. Your details are restored — you can pay when ready.",
         )
       } catch {
         if (!cancelled) setSubmitError("Could not restore your checkout. Please try again.")
       } finally {
         if (!cancelled) setResumeLoading(false)
       }
     })()
     return () => {
       cancelled = true
     }
   }, [isResumeQuery, resumePaymentId, user, loadingUser, router])

   useEffect(() => {
     if (isResumeQuery) return
     const itemsParam = searchParams.get("items")
     if (cartItems.length > 0 || itemsParam) clearCheckoutDraft()
   }, [isResumeQuery, cartItems.length, searchParams])

   const resumeCartItems = useMemo(() => {
     if (!resumeContext?.lineItems?.length) return []
     return resumeContext.lineItems.map((li) => ({
       id: String(li.id),
       name: li.name,
       price: li.price,
       qty: li.qty ?? 1,
       description: "",
       listingKind: li.listingKind,
       checkoutLane: checkoutLaneFromKind(li.listingKind),
     }))
   }, [resumeContext])

   const filteredItems = useMemo(() => {
     if (resumeContext?.lineItems?.length) {
       return enrichCartItemsWithSellerMeta(resumeCartItems, listingRows)
     }
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
   }, [cartItems, searchParams, listingRows, resumeContext, resumeCartItems])

   const kindByListingId = useMemo(
     () => buildListingKindById(listingRows),
     [listingRows],
   )

   const checkoutLane = useMemo(() => {
     if (resumeContext?.lane) {
       return resumeContext.lane === "product" ? "product" : "booking"
     }
     return checkoutLaneFromCartItems(filteredItems, kindByListingId)
   }, [filteredItems, kindByListingId, resumeContext])

   const copy = useMemo(
     () => getCheckoutCopy(checkoutLane === 'product' ? 'product' : 'booking'),
     [checkoutLane],
   )

   const isProductCheckout = checkoutLane === 'product'

   const summaryRows = useMemo(
     () => filteredItems.map((item) => mapCartItemToDisplayRow(item)),
     [filteredItems],
   )

   const bookingSummaryRows = useMemo(
     () => summaryRows.filter((row) => row.checkoutLane !== 'product'),
     [summaryRows],
   )
   const productSummaryRows = useMemo(
     () => summaryRows.filter((row) => row.checkoutLane === 'product'),
     [summaryRows],
   )

   useEffect(() => {
     if (checkoutLane === 'mixed' && !cartLoading && !submitting && !payRedirecting) {
       router.replace('/cart')
     }
   }, [checkoutLane, cartLoading, router, submitting, payRedirecting])

   const subtotal = summaryRows.reduce(
     (sum, item) => sum + (item.price || 0) * (item.qty || 1),
     0
   )

   const minScheduleDate = useMemo(() => {
     const d = new Date()
     const y = d.getFullYear()
     const m = String(d.getMonth() + 1).padStart(2, '0')
     const day = String(d.getDate()).padStart(2, '0')
     return `${y}-${m}-${day}`
   }, [])

   const hasScopedItemsParam = Boolean(searchParams.get("items")?.trim())
   const isCheckoutLoading =
     loadingUser ||
     listingsLoading ||
     (isResumeQuery && resumeLoading) ||
     (hasScopedItemsParam && cartLoading && !resumeContext)

   if (isCheckoutLoading) {
     return <CheckoutLoadingSkeleton />
   }

   if (payRedirecting) {
     return (
       <main className={styles.checkoutPage}>
         <CheckoutPaymentOverlay
           title={copy.payButtonLoading}
           subtitle="Please wait — do not close this tab. You will be taken to PayMongo secure payment."
         />
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

  const isEmpty =
    !submitting &&
    (summaryRows.length === 0 || checkoutLane === 'mixed')

  const productIds = filteredItems.map((i) => String(i.id))

  const buildDraftPayload = (orderIds, paymentId = null) => ({
    productIds,
    itemsParam: searchParams.get("items"),
    orderIds,
    paymentId,
    lane: isProductCheckout ? "product" : "booking",
    contact: {
      contactName,
      contactEmail,
      contactPhone,
      deliveryAddress,
      deceasedName,
      dateOfDeath,
      wakeDurationDays,
      preferredDate,
      notes,
    },
  })

  const focusCheckoutField = (field) => {
    const idByField = {
      contact_phone: 'contact_phone',
      contact_name: isProductCheckout ? 'delivery_recipient' : 'service_loc_contact_name',
      preferred_date: 'preferred_date',
      street: isProductCheckout ? 'delivery_street' : 'service_loc_street',
      city: isProductCheckout ? 'delivery_city' : 'service_loc_city',
      province: isProductCheckout ? 'delivery_province' : 'service_loc_province',
    }
    const id = idByField[field]
    if (!id) return
    const el = document.getElementById(id)
    el?.focus()
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const renderSummaryGroup = (title, rows) => {
    if (!rows.length) return null
    return (
      <>
        <h3 className={styles.summaryGroupTitle}>{title}</h3>
        <ul className={styles.itemsList}>
          {rows.map((row) => (
            <li key={row.id} className={styles.itemRow}>
              <div className={styles.itemMain}>
                <p className={styles.itemName}>{row.name}</p>
                {row.listingKind ? (
                  <p className={styles.itemMeta} style={{ marginTop: 2 }}>
                    {formatListingKindLabel(row.listingKind)}
                  </p>
                ) : null}
                {row.description ? <p className={styles.itemMeta}>{row.description}</p> : null}
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
      </>
    )
  }

  const checkoutAndPay = async () => {
    setSubmitError("")
    if (submitting || payRedirecting) return
    setSubmitting(true)
    let leavingForPay = false
    try {
      const phoneToSend = (contactPhone || profile?.phone || "").trim()
      const contactCheck = validateCheckoutContact({
        lane: isProductCheckout ? 'product' : 'booking',
        contactPhone: phoneToSend,
        contactName,
        deliveryAddress,
        preferredDate,
      })
      if (!contactCheck.ok) {
        setSubmitError(contactCheck.message)
        if (contactCheck.field) focusCheckoutField(contactCheck.field)
        return
      }
      const locationToSend = formatDeliveryAddressForOrder(deliveryAddress)

      let orderIds =
        resumeContext?.orderIds?.length > 0
          ? resumeContext.orderIds.map((id) => String(id).trim()).filter(Boolean)
          : []

      if (orderIds.length === 0) {
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

        orderIds = Array.isArray(body?.order_ids)
          ? body.order_ids.map((id) => String(id).trim()).filter(Boolean)
          : []

        if (orderIds.length === 0) {
          setSubmitError("Checkout could not continue. Contact support if this persists.")
          await refreshCart()
          router.replace('/profile/purchases')
          return
        }
      }

      saveCheckoutDraft(buildDraftPayload(orderIds))

      if (resumeContext?.orderIds?.length) {
        const patchRes = await fetch('/api/checkout/resume', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderIds,
            lane: isProductCheckout ? 'product' : 'booking',
            contact: {
              contact_name: (contactName || '').trim(),
              contact_email: (contactEmail || '').trim(),
              contact_phone: phoneToSend,
              service_location: locationToSend,
              deceased_name: (deceasedName || '').trim(),
              date_of_death: dateOfDeath,
              wake_duration_days: wakeDurationDays,
              preferred_date: preferredDate,
              notes,
            },
          }),
        })
        const patchBody = await patchRes.json().catch(() => null)
        if (!patchRes.ok) {
          setSubmitError(patchBody?.error || 'Could not save your updated details.')
          return
        }
      }

      const payRes = await fetch('/api/checkout/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds }),
      })

      const payBody = await payRes.json().catch(() => null)
      if (payRes.ok && payBody?.redirect_url) {
        saveCheckoutDraft(
          buildDraftPayload(orderIds, payBody.payment_id ? String(payBody.payment_id) : null),
        )
        setPayRedirecting(true)
        leavingForPay = true
        window.location.assign(payBody.redirect_url)
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
      if (!leavingForPay) setSubmitting(false)
    }
  }

   return (
     <main className={styles.checkoutPage}>
       {submitting && !payRedirecting ? (
         <CheckoutPaymentOverlay
           title="Preparing secure checkout"
           subtitle="Creating your order and connecting to PayMongo. This may take a few seconds."
         />
       ) : null}
       <header className={styles.hero}>
         <div className={styles.heroInner}>
           <nav className={styles.breadcrumb} aria-label="Breadcrumb">
             <Link href="/" className={styles.crumb}>Home</Link>
             <span className={styles.slash}>/</span>
             <Link href="/cart" className={styles.crumb}>Cart</Link>
             <span className={styles.slash}>/</span>
             <span className={styles.crumbActive}>{copy.breadcrumbActive}</span>
           </nav>
           <h1 className={styles.heroTitle}>{copy.pageTitle}</h1>
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
             <h2 className={styles.emptyTitle}>{copy.emptyTitle}</h2>
             <p className={styles.emptyText}>{copy.emptyText}</p>
             <Link href="/shop" className={styles.primaryLink}>
               {copy.browseLink}
             </Link>
           </div>
         ) : (
           <div className={styles.layout}>
             <div className={styles.leftColumn}>
               <h2 className={styles.sectionTitle}>Your details</h2>
               <p className={styles.sectionHint}>{copy.sectionHint}</p>
               {resumeContext ? (
                 <p className={styles.resumeNotice} role="status">
                   You left secure payment before paying. Your order and details below are restored.
                 </p>
               ) : null}

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

                 {!isProductCheckout ? (
                 <>
                 <div className={styles.fieldGroup}>
                   <label className={styles.label} htmlFor="preferred_date">* Preferred schedule</label>
                   <input
                     id="preferred_date"
                     type="date"
                     className={styles.input}
                     value={preferredDate}
                     onChange={(e) => setPreferredDate(e.target.value)}
                     min={minScheduleDate}
                     required
                   />
                 </div>

                <CheckoutAddressFields
                  variant="service"
                  styles={styles}
                  contactName={contactName}
                  onContactNameChange={setContactName}
                  deliveryAddress={deliveryAddress}
                  setDeliveryAddress={setDeliveryAddress}
                />

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
                 </>
                 ) : (
                <CheckoutAddressFields
                  variant="product"
                  styles={styles}
                  contactName={contactName}
                  onContactNameChange={setContactName}
                  deliveryAddress={deliveryAddress}
                  setDeliveryAddress={setDeliveryAddress}
                />
                 )}

                 <div className={styles.fieldGroup}>
                   <label className={styles.label} htmlFor="notes">
                     {isProductCheckout ? 'Delivery notes (optional)' : 'Notes for provider'}
                   </label>
                   <textarea
                     id="notes"
                     className={`${styles.input} ${styles.textarea}`}
                     rows={5}
                     value={notes}
                     onChange={(e) => setNotes(e.target.value)}
                     placeholder={
                       isProductCheckout
                         ? 'e.g. Call before delivery, gate code, preferred time window'
                         : 'Share any specific requests, traditions, or considerations you want the provider to know.'
                     }
                   />
                 </div>
               </div>

               <div className={styles.noteBox}>
                 <h4 className={styles.noteTitle}>Note</h4>
                 <p className={styles.noteText}>{copy.noteText}</p>
               </div>
             </div>

             <aside className={styles.rightColumn}>
               <h2 className={styles.summaryTitle}>Summary</h2>
               {renderSummaryGroup('Services & packages', bookingSummaryRows)}
               {renderSummaryGroup('Products', productSummaryRows)}

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
                {submitting ? copy.payButtonLoading : copy.payButton}
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

