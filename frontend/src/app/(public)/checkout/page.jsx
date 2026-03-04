 "use client"

 import { useEffect, useMemo, useState } from "react"
 import { useRouter, useSearchParams } from "next/navigation"
 import Link from "next/link"
 import styles from "./checkout.module.css"
import { useCart } from "@/contexts/CartContext"
import { getUser } from "@/lib/auth/session"
import { getUserRole, ROLE_SELLER } from "@/lib/auth/roles"

 function formatPrice(n) {
   return `₱${Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`
 }

 export default function CheckoutPage() {
   const router = useRouter()
   const searchParams = useSearchParams()
   const { items: cartItems } = useCart()
   const [loadingUser, setLoadingUser] = useState(true)
   const [user, setUser] = useState(null)
  const [isSeller, setIsSeller] = useState(false)

   useEffect(() => {
     let mounted = true
    getUser().then(async (currentUser) => {
      if (!mounted) return
      if (!currentUser) {
        router.replace("/buyer/login?redirect=/checkout")
        return
      }
      const role = await getUserRole(currentUser.id)
      if (role === ROLE_SELLER) {
        setIsSeller(true)
        setUser(currentUser)
        setLoadingUser(false)
        return
      }
      setUser(currentUser)
      setLoadingUser(false)
    })
     return () => {
       mounted = false
     }
   }, [router])

   const filteredItems = useMemo(() => {
     const itemsParam = searchParams.get("items")
     if (!itemsParam) return cartItems
     const ids = new Set(
       itemsParam
         .split(",")
         .map((v) => v.trim())
         .filter(Boolean)
     )
     return cartItems.filter((item) => ids.has(String(item.id)))
   }, [cartItems, searchParams])

   const subtotal = filteredItems.reduce(
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

  const isEmpty = filteredItems.length === 0

  if (isSeller) {
    return (
      <main className={styles.checkoutPage}>
        <div className={styles.centeredBox}>
          <h1 className={styles.heroTitle}>Checkout (Buyer only)</h1>
          <p className={styles.muted}>
            You are currently signed in as a seller. Sellers cannot book services or complete checkout.
          </p>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => router.push('/')}
          >
            Back to homepage
          </button>
        </div>
      </main>
    )
  }

   return (
     <main className={styles.checkoutPage}>
       <header className={styles.hero}>
         <div className={styles.heroOverlay} />
         <div className={styles.heroInner}>
           <h1 className={styles.heroTitle}>Checkout</h1>
           <p className={styles.breadcrumb}>
             <Link href="/" className={styles.crumb}>
               Home
             </Link>
             <span className={styles.slash}>/</span>
             <Link href="/cart" className={styles.crumb}>
               Cart
             </Link>
             <span className={styles.slash}>/</span>
             <span className={styles.crumbActive}>Checkout</span>
           </p>
           <p className={styles.subtleTagline}>
             Signed in as <strong>{user.email}</strong>
           </p>
         </div>
       </header>

       <section className={styles.content}>
         {isEmpty ? (
           <div className={styles.emptyState}>
             <h2 className={styles.emptyTitle}>No items to book</h2>
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
               <h2 className={styles.sectionTitle}>Booking Details</h2>
               <p className={styles.sectionHint}>
                 A dedicated coordinator will contact you to confirm the schedule and
                 specific arrangements.
               </p>

               <div className={styles.fieldGroup}>
                 <label className={styles.label}>Contact name</label>
                 <input
                   type="text"
                   className={styles.input}
                   defaultValue={user.user_metadata?.full_name || ""}
                   placeholder="Full name of primary contact"
                 />
               </div>

               <div className={styles.fieldRow}>
                 <div className={styles.fieldGroup}>
                   <label className={styles.label}>Email</label>
                   <input
                     type="email"
                     className={styles.input}
                     defaultValue={user.email || ""}
                     placeholder="you@example.com"
                   />
                 </div>
                 <div className={styles.fieldGroup}>
                   <label className={styles.label}>Phone number</label>
                   <input
                     type="tel"
                     className={styles.input}
                     placeholder="09XX XXX XXXX"
                   />
                 </div>
               </div>

               <div className={styles.fieldGroup}>
                 <label className={styles.label}>Preferred schedule</label>
                 <input
                   type="date"
                   className={styles.input}
                 />
               </div>

               <div className={styles.fieldGroup}>
                 <label className={styles.label}>Notes for provider</label>
                 <textarea
                   className={`${styles.input} ${styles.textarea}`}
                   rows={4}
                   placeholder="Share any specific requests, traditions, or considerations you want the provider to know."
                 />
               </div>
             </div>

             <aside className={styles.rightColumn}>
               <h2 className={styles.sectionTitle}>Summary</h2>
               <ul className={styles.itemsList}>
                 {filteredItems.map((item) => (
                   <li key={item.id} className={styles.itemRow}>
                     <div className={styles.itemMain}>
                       <p className={styles.itemName}>{item.name}</p>
                       {item.description && (
                         <p className={styles.itemMeta}>{item.description}</p>
                       )}
                     </div>
                     <div className={styles.itemMetaRight}>
                       <span className={styles.itemQty}>×{item.qty ?? 1}</span>
                       <span className={styles.itemPrice}>
                         {formatPrice((item.price || 0) * (item.qty || 1))}
                       </span>
                     </div>
                   </li>
                 ))}
               </ul>

               <div className={styles.summaryRow}>
                 <span>Subtotal</span>
                 <span>{formatPrice(subtotal)}</span>
               </div>
               <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
                 <span>Total</span>
                 <span>{formatPrice(subtotal)}</span>
               </div>

               <button
                 type="button"
                 className={styles.primaryButton}
                 onClick={() => {
                   alert(
                     "Your booking request has been captured. Our team will reach out to you to finalize the details."
                   )
                   router.push("/cart")
                 }}
               >
                 Confirm Booking Request
               </button>

               <button
                 type="button"
                 className={styles.secondaryButton}
                 onClick={() => router.push("/cart")}
               >
                 Back to Cart
               </button>
             </aside>
           </div>
         )}
       </section>
     </main>
   )
 }

