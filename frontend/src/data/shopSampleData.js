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

// ─── Filters and demo providers (fallback UI) ───────────────────────────────

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
    lastActive: new Date(Date.now() - 8 * 60 * 1000).toISOString(), // 8 mins ago
    joinedDate: '2019-03-15',
    businessStartedAt: '2005-01-10',
  },
  {
    id: 'eternal-rest',
    name: 'Eternal Rest Services',
    location: 'Quezon City, NCR',
    rating: 4.7,
    reviews: 89,
    badge: null,
    lastActive: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
    joinedDate: '2021-08-01',
    businessStartedAt: '2012-04-20',
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
    businessStartedAt: '2000-11-05',
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
    businessStartedAt: '2016-02-14',
  },
  {
    id: 'haven-memorial',
    name: 'Haven Memorial',
    location: 'Caloocan, NCR',
    rating: 4.5,
    reviews: 41,
    badge: null,
    lastActive: new Date(Date.now() - 2 * 7 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks ago
    joinedDate: '2020-01-05',
    businessStartedAt: '1998-07-01',
  },
]