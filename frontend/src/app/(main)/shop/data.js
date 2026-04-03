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
    lastActive: new Date(Date.now() - 8 * 60 * 1000).toISOString(),       // 8 mins ago
    joinedDate: '2019-03-15',
  },
  {
    id: 'eternal-rest',
    name: 'Eternal Rest Services',
    location: 'Quezon City, NCR',
    rating: 4.7,
    reviews: 89,
    badge: 'Verified',
    lastActive: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),  // 3 hours ago
    joinedDate: '2021-08-01',
  },
  {
    id: 'golden-lily',
    name: 'Golden Lily Funerals',
    location: 'Makati, NCR',
    rating: 4.8,
    reviews: 203,
    badge: 'Premium',
    lastActive: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    joinedDate: '2018-06-20',
  },
  {
    id: 'compassion-care',
    name: 'Compassion Care',
    location: 'Pasig, NCR',
    rating: 4.6,
    reviews: 57,
    badge: null,
    lastActive: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    joinedDate: '2022-11-10',
  },
  {
    id: 'haven-memorial',
    name: 'Haven Memorial',
    location: 'Caloocan, NCR',
    rating: 4.5,
    reviews: 41,
    badge: 'Verified',
    lastActive: new Date(Date.now() - 2 * 7 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks ago
    joinedDate: '2020-01-05',
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


// ─── Reviews ─────────────────────────────────────────────────────────────────
// Each review is tied to a serviceId and optionally a listingId / providerId.
// rating: 1–5  |  date: ISO string

export const REVIEWS = [
  // ── Cremation
  {
    id: 'r1',
    serviceId: 'cremation',
    listingId: 'cremation-premium',
    providerId: 'serenity-chapel',
    author: 'Maria Santos',
    rating: 5,
    date: '2024-11-14',
    title: 'Handled everything with such grace',
    body: 'The team at Serenity Chapel made an incredibly difficult time much easier for our family. Every detail was taken care of, and they were patient with all of our questions. Highly recommend the premium package.',
  },
  {
    id: 'r2',
    serviceId: 'cremation',
    listingId: 'cremation-premium',
    providerId: 'serenity-chapel',
    author: 'Jose Reyes',
    rating: 5,
    date: '2024-10-02',
    title: 'Professional and compassionate',
    body: 'From the first call to the final ash release, the staff were warm and professional. The mahogany urn was beautiful, and the chapel viewing was well-organized.',
  },
  {
    id: 'r3',
    serviceId: 'cremation',
    listingId: 'cremation-basic',
    providerId: 'eternal-rest',
    author: 'Ana Cruz',
    rating: 4,
    date: '2024-09-18',
    title: 'Good value, smooth process',
    body: 'We chose the Direct Cremation for its simplicity and affordability. The paperwork was handled quickly and the staff were respectful throughout. Only minor issue was a slight delay in the permit release.',
  },
  {
    id: 'r4',
    serviceId: 'cremation',
    listingId: 'cremation-eco',
    providerId: 'compassion-care',
    author: 'Lina Bautista',
    rating: 5,
    date: '2024-08-30',
    title: 'Beautiful and meaningful',
    body: 'My mother would have loved the eco option. The biodegradable urn and ash scattering ceremony were handled so thoughtfully. Thank you, Compassion Care.',
  },

  // ── Traditional Burial
  {
    id: 'r5',
    serviceId: 'traditional-burial',
    listingId: 'burial-full',
    providerId: 'serenity-chapel',
    author: 'Roberto Dela Cruz',
    rating: 5,
    date: '2024-12-01',
    title: 'Exceeded every expectation',
    body: 'The Full Traditional Burial package was everything we hoped for. The chapel was immaculate, the catering was excellent, and the hearse convoy was handled with full dignity. Worth every peso.',
  },
  {
    id: 'r6',
    serviceId: 'traditional-burial',
    listingId: 'burial-full',
    providerId: 'serenity-chapel',
    author: 'Carla Mendoza',
    rating: 4,
    date: '2024-11-20',
    title: 'Caring and thorough',
    body: 'Staff were very attentive to our family\'s needs. The five-day viewing allowed relatives from the province to attend. Flower arrangements were stunning.',
  },
  {
    id: 'r7',
    serviceId: 'traditional-burial',
    listingId: 'burial-standard',
    providerId: 'compassion-care',
    author: 'Eduardo Villanueva',
    rating: 4,
    date: '2024-10-10',
    title: 'Solid and reliable',
    body: 'Simple and straightforward. The coordinator was easy to reach and kept us informed at every step. Casket quality was good for the price.',
  },
  {
    id: 'r8',
    serviceId: 'traditional-burial',
    listingId: 'burial-deluxe',
    providerId: 'golden-lily',
    author: 'Theresa Ong',
    rating: 5,
    date: '2024-09-05',
    title: 'A truly dignified farewell',
    body: 'Golden Lily went above and beyond. The video tribute made our whole family weep — in the best way. The mahogany casket was beautiful and the catering for 100 guests was seamless.',
  },

  // ── Memorial Planning
  {
    id: 'r9',
    serviceId: 'memorial-planning',
    listingId: 'memorial-classic',
    providerId: 'eternal-rest',
    author: 'Nadia Flores',
    rating: 5,
    date: '2024-11-28',
    title: 'The AV tribute was perfect',
    body: 'Eternal Rest put together a custom tribute video that captured my father\'s life beautifully. The live music added so much warmth to the service. We couldn\'t have asked for more.',
  },
  {
    id: 'r10',
    serviceId: 'memorial-planning',
    listingId: 'memorial-grand',
    providerId: 'golden-lily',
    author: 'Patricia Lim',
    rating: 5,
    date: '2024-10-22',
    title: 'Grand in every sense',
    body: 'Over 150 guests attended and everything ran like clockwork. The floral décor was breathtaking, the keepsake gifts were a lovely touch, and the memory book is something our family will treasure forever.',
  },
  {
    id: 'r11',
    serviceId: 'memorial-planning',
    listingId: 'memorial-intimate',
    providerId: 'haven-memorial',
    author: 'Ben Aquino',
    rating: 4,
    date: '2024-09-14',
    title: 'Intimate and heartfelt',
    body: 'Haven Memorial handled our small gathering with care. The photo display setup was elegant and the sound system was clear. Great for families who prefer something quiet and personal.',
  },
]

export function getReviewsByServiceId(serviceId) {
  return REVIEWS.filter((r) => r.serviceId === serviceId)
}