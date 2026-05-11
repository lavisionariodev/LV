function fallbackLabelFromId(serviceId) {
  const raw = String(serviceId || '').trim()
  if (!raw) return ''
  return raw.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function buildShopCategoryCatalog(listings = []) {
  const byId = new Map()

  listings.forEach((listing) => {
    const id = String(listing?.serviceId || '').trim()
    if (!id) return

    const existing = byId.get(id) ?? {
      id,
      label: '',
      count: 0,
      image: '',
      bestInStock: false,
      bestCreatedAtTs: 0,
    }

    const categoryLabel = String(listing?.categoryLabel || '').trim()
    if (!existing.label && categoryLabel) {
      existing.label = categoryLabel
    }

    existing.count += 1

    const image = listing?.imageUrl || listing?.imageUrls?.[0] || ''
    const candidateInStock = listing?.inStock !== false
    const candidateCreatedAtTs = new Date(listing?.createdAt || 0).getTime() || 0
    const shouldUseImage =
      !!image &&
      (!existing.image ||
        (candidateInStock && !existing.bestInStock) ||
        (candidateInStock === existing.bestInStock &&
          candidateCreatedAtTs > existing.bestCreatedAtTs))

    if (shouldUseImage) {
      existing.image = image
      existing.bestInStock = candidateInStock
      existing.bestCreatedAtTs = candidateCreatedAtTs
    }

    byId.set(id, existing)
  })

  return [...byId.values()]
    .map((item) => ({
      id: item.id,
      label: item.label || fallbackLabelFromId(item.id),
      count: item.count,
      image: item.image,
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

export function categoryLabelFromListings(serviceId, listings = []) {
  const id = String(serviceId || '').trim()
  if (!id) return ''
  for (const listing of listings) {
    if (String(listing?.serviceId || '').trim() !== id) continue
    const label = String(listing?.categoryLabel || '').trim()
    if (label) return label
  }
  return fallbackLabelFromId(id)
}