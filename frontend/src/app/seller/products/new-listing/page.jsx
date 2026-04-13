import { Suspense } from 'react'
import NewListingLoadingState from '@/components/ui/Load/NewListingLoadingState'
import NewListingClient from '../SellerListingForm'
import styles from '../products.module.css'

export const metadata = {
  title: 'Add New Listing',
}

export default function SellerProductsNewPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.newListingPage}>
          <NewListingLoadingState />
        </div>
      }
    >
      <NewListingClient />
    </Suspense>
  )
}
