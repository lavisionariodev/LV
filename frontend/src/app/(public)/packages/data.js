export const PACKAGES = [
  {
    id: 'basic',
    name: 'Basic Package',
    description: 'Essential services for a simple, dignified farewell.',
    longDescription: 'Our Basic Package includes essential coordination, documentation support, and a simple service arrangement. Ideal for families who prefer a minimal, respectful option.',
    price: 'From ₱45,000',
    image: '/sample/services/1.jpg',
  },
  {
    id: 'standard',
    name: 'Standard Package',
    description: 'Full service with casket, venue, and memorial options.',
    longDescription: 'The Standard Package covers full funeral coordination, casket selection, venue arrangement, and basic memorial elements. A balanced option for most families.',
    price: 'From ₱85,000',
    image: '/sample/services/6.jpg',
  },
  {
    id: 'premium',
    name: 'Premium Package',
    description: 'Comprehensive care with premium choices and extras.',
    longDescription: 'Our Premium Package offers comprehensive care with premium casket and venue options, floral arrangements, printed materials, and extended support for out-of-town family.',
    price: 'From ₱150,000',
    image: '/sample/services/9.jpg',
  },
]

export function getPackageById(id) {
  return PACKAGES.find((p) => p.id === id) ?? null
}
