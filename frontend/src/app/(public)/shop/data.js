export const PRODUCTS = [
  {
    id: 1,
    name: 'Premium Service Package',
    category: 'Other',
    price: 2990,
    desc: 'A clean and complete service set for a smooth arrangement process.',
    img: '/sample/services/1.jpg',
  },
  {
    id: 2,
    name: 'Memorial Essentials',
    category: 'Other',
    price: 1990,
    desc: 'Basic essentials prepared with a simple, respectful presentation.',
    img: '/sample/services/2.jpg',
  },
  {
    id: 3,
    name: 'Family Comfort Set',
    category: 'For Home',
    price: 2490,
    desc: 'A practical set focused on comfort and support for the family.',
    img: '/sample/services/3.jpg',
  },
  {
    id: 4,
    name: 'Floral Tribute',
    category: 'Other',
    price: 1490,
    desc: 'A classic tribute option that feels neat and meaningful.',
    img: '/sample/services/4.jpg',
  },
  {
    id: 5,
    name: 'Music & Audio Support',
    category: 'For Music',
    price: 990,
    desc: 'Simple audio support to help with the program and background music.',
    img: '/sample/services/5.jpg',
  },
  {
    id: 6,
    name: 'Phone Assistance Kit',
    category: 'For Phone',
    price: 790,
    desc: 'Basic phone support tools for coordination and family communication.',
    img: '/sample/services/6.jpg',
  },
  {
    id: 7,
    name: 'Storage & Keepsake Box',
    category: 'For Storage',
    price: 690,
    desc: 'A small storage solution for documents and important keepsakes.',
    img: '/sample/services/7.jpg',
  },
  {
    id: 8,
    name: 'Candlelight Setup',
    category: 'For Home',
    price: 1290,
    desc: 'A warm, calm setup for a simple viewing atmosphere.',
    img: '/sample/services/8.jpg',
  },
  {
    id: 9,
    name: 'Printed Materials Bundle',
    category: 'Other',
    price: 890,
    desc: 'A ready-to-use bundle for printed details and basic announcements.',
    img: '/sample/services/9.jpg',
  },
  {
    id: 10,
    name: 'Home Viewing Add-on',
    category: 'For Home',
    price: 1590,
    desc: 'Extra support items for a cleaner, more organized home viewing.',
    img: '/sample/services/10.jpg',
  },
  {
    id: 11,
    name: 'Mobile Coordination Support',
    category: 'For Phone',
    price: 1090,
    desc: 'Light support kit for quick updates, coordination, and contact flow.',
    img: '/sample/services/11.jpg',
  },
  {
    id: 12,
    name: 'Secure Document Organizer',
    category: 'For Storage',
    price: 1190,
    desc: 'A neat organizer for papers, IDs, receipts, and important documents.',
    img: '/sample/services/12.jpg',
  },
]

export function getProductById(id) {
  const numId = Number(id)
  if (Number.isNaN(numId)) return null
  return PRODUCTS.find((p) => p.id === numId) ?? null
}
