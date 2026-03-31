export const SERVICES = [
  {
    id: 'cremation',
    name: 'Cremation Services',
    description: 'Dignified cremation with options for memorialization and ash handling.',
    longDescription:
      'We offer respectful cremation services with flexible options for memorialization, ash scattering, or keepsake urns. Our team guides you through each step with sensitivity and clarity.',
    image: '/sample/services/1.jpg',
  },
  {
    id: 'traditional-burial',
    name: 'Traditional Burial',
    description: 'Full funeral and burial arrangements with casket and venue options.',
    longDescription:
      'Traditional burial services include casket selection, venue arrangement, and coordination with cemeteries. We help you honor your loved one with a dignified farewell.',
    image: '/sample/services/2.jpg',
  },
  {
    id: 'memorial-planning',
    name: 'Memorial Planning',
    description: 'Custom memorial services and tributes tailored to your family.',
    longDescription:
      'From intimate gatherings to larger memorials, we tailor every detail to reflect the life and wishes of your loved one. Music, readings, and tributes can be customized.',
    image: '/sample/services/3.jpg',
  },
]

export function getServiceById(id) {
  return SERVICES.find((s) => s.id === id) ?? null
}

// ─── Extended marketplace data (additive — does not change existing exports) ──

export const CATEGORIES = [
  { id: 'all', label: 'All Services' },
  { id: 'cremation', label: 'Cremation' },
  { id: 'traditional-burial', label: 'Traditional Burial' },
  { id: 'memorial-planning', label: 'Memorial Planning' },
]

export const PROVIDERS = [
  {
    id: 'serenity-chapel',
    name: 'Serenity Chapel',
    location: 'Manila, NCR',
    rating: 4.9,
    reviews: 124,
    badge: 'Top Rated',
  },
  {
    id: 'eternal-rest',
    name: 'Eternal Rest Services',
    location: 'Quezon City, NCR',
    rating: 4.7,
    reviews: 89,
    badge: 'Verified',
  },
  {
    id: 'golden-lily',
    name: 'Golden Lily Funerals',
    location: 'Makati, NCR',
    rating: 4.8,
    reviews: 203,
    badge: 'Premium',
  },
  {
    id: 'compassion-care',
    name: 'Compassion Care',
    location: 'Pasig, NCR',
    rating: 4.6,
    reviews: 57,
    badge: null,
  },
  {
    id: 'haven-memorial',
    name: 'Haven Memorial',
    location: 'Caloocan, NCR',
    rating: 4.5,
    reviews: 41,
    badge: 'Verified',
  },
]

export const LISTINGS = [
  // ── Cremation
  {
    id: 'cremation-basic',
    serviceId: 'cremation',
    providerId: 'eternal-rest',
    name: 'Direct Cremation',
    price: 18500,
    popular: false,
    inclusions: [
      'Death certificate processing',
      'Cremation urn (standard)',
      'Ash release permit',
      '1 viewing day',
    ],
  },
  {
    id: 'cremation-premium',
    serviceId: 'cremation',
    providerId: 'serenity-chapel',
    name: 'Premium Cremation Package',
    price: 38000,
    popular: true,
    inclusions: [
      'Death certificate processing',
      'Mahogany urn',
      '2-day chapel viewing',
      'Flower arrangement',
      'Embalming',
    ],
  },
  {
    id: 'cremation-private',
    serviceId: 'cremation',
    providerId: 'golden-lily',
    name: 'Private Cremation',
    price: 28500,
    popular: false,
    inclusions: [
      'Private cremation chamber',
      'Personalized urn',
      '1 viewing day',
      'Memorial candle set',
    ],
  },
  {
    id: 'cremation-eco',
    serviceId: 'cremation',
    providerId: 'compassion-care',
    name: 'Eco Cremation',
    price: 22000,
    popular: false,
    inclusions: [
      'Biodegradable urn',
      'Ash scattering ceremony',
      'Death certificate',
      'Memorial card printing',
    ],
  },
  // ── Traditional Burial
  {
    id: 'burial-standard',
    serviceId: 'traditional-burial',
    providerId: 'compassion-care',
    name: 'Standard Burial Package',
    price: 55000,
    popular: false,
    inclusions: [
      'Casket (wood)',
      '3-day viewing',
      'Embalming',
      'Cemetery coordination',
      'Hearse service',
    ],
  },
  {
    id: 'burial-full',
    serviceId: 'traditional-burial',
    providerId: 'serenity-chapel',
    name: 'Full Traditional Burial',
    price: 95000,
    popular: true,
    inclusions: [
      'Premium casket',
      '5-day chapel viewing',
      'Full embalming',
      'Flower arrangement',
      'Hearse convoy',
      'Reception catering (50 pax)',
    ],
  },
  {
    id: 'burial-deluxe',
    serviceId: 'traditional-burial',
    providerId: 'golden-lily',
    name: 'Deluxe Burial Service',
    price: 120000,
    popular: false,
    inclusions: [
      'Mahogany casket',
      '7-day viewing',
      'Embalming + cosmetology',
      'Floral tributes',
      'Hearse + escort',
      'Catering (100 pax)',
      'Video tribute',
    ],
  },
  {
    id: 'burial-haven',
    serviceId: 'traditional-burial',
    providerId: 'haven-memorial',
    name: 'Simple Burial Package',
    price: 42000,
    popular: false,
    inclusions: [
      'Basic casket',
      '2-day viewing',
      'Embalming',
      'Cemetery coordination',
    ],
  },
  // ── Memorial Planning
  {
    id: 'memorial-intimate',
    serviceId: 'memorial-planning',
    providerId: 'haven-memorial',
    name: 'Intimate Memorial Gathering',
    price: 15000,
    popular: false,
    inclusions: [
      'Venue (up to 30 guests)',
      'Photo display setup',
      'Memorial program booklets',
      'Sound system',
    ],
  },
  {
    id: 'memorial-classic',
    serviceId: 'memorial-planning',
    providerId: 'eternal-rest',
    name: 'Classic Memorial Service',
    price: 32000,
    popular: true,
    inclusions: [
      'Venue (up to 80 guests)',
      'Custom AV tribute video',
      'Floral arrangements',
      'Memorial program',
      'Live music',
    ],
  },
  {
    id: 'memorial-grand',
    serviceId: 'memorial-planning',
    providerId: 'golden-lily',
    name: 'Grand Memorial Celebration',
    price: 75000,
    popular: false,
    inclusions: [
      'Large venue (150+ guests)',
      'Custom video tribute',
      'Full floral décor',
      'Catering',
      'Live musician',
      'Memory book',
      'Keepsake gifts',
    ],
  },
]

