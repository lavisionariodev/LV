import { Suspense } from 'react'
import NewListingLoadingState from '@/components/ui/Load/NewListingLoadingState'
import NewListingClient from '../SellerListingForm'

export const metadata = {
  title: 'Add New Listing',
}

export default function SellerProductsNewPage() {
  return (
    <Suspense fallback={<NewListingLoadingState />}>
      <NewListingClient />
    </Suspense>
  )
}
