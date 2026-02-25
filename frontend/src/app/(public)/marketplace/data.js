export const MARKETPLACE_ITEMS = [
  {
    id: 'flower-arrangements',
    name: 'Flower Arrangements',
    description: 'Classic and custom floral arrangements to honor your loved one.',
    longDescription:
      'Choose from curated wreaths, standing sprays, and custom floral designs to reflect your family’s preferences. Our partner florists prepare and deliver arrangements in coordination with your chosen service schedule.',
    badge: 'Popular choice',
    image: '/sample/services/2.jpg',
  },
  {
    id: 'urn-collection',
    name: 'Urn Collection',
    description: 'Elegant urns in different styles and finishes to fit every family.',
    longDescription:
      'Browse a selection of classic, modern, and keepsake urns in different materials and finishes. We help you choose an urn that matches your desired tone—from traditional to understated and modern.',
    badge: 'Curated selection',
    image: '/sample/services/3.jpg',
  },
  {
    id: 'keepsake-items',
    name: 'Keepsake Items',
    description: 'Memory books, candles, and other keepsakes for meaningful remembrance.',
    longDescription:
      'Complement your service with keepsake items such as memory books, candles, framed photos, and other small touches that help family and friends remember and reflect.',
    badge: 'Thoughtful details',
    image: '/sample/services/4.jpg',
  },
]

export function getMarketplaceItemById(id) {
  return MARKETPLACE_ITEMS.find((item) => item.id === id) ?? null
}

