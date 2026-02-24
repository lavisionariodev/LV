export const SERVICES = [
  {
    id: 'cremation',
    name: 'Cremation Services',
    description: 'Dignified cremation with options for memorialization and ash handling.',
    longDescription: 'We offer respectful cremation services with flexible options for memorialization, ash scattering, or keepsake urns. Our team guides you through each step with sensitivity and clarity.',
    image: '/sample/services/2.jpg',
  },
  {
    id: 'traditional-burial',
    name: 'Traditional Burial',
    description: 'Full funeral and burial arrangements with casket and venue options.',
    longDescription: 'Traditional burial services include casket selection, venue arrangement, and coordination with cemeteries. We help you honor your loved one with a dignified farewell.',
    image: '/sample/services/3.jpg',
  },
  {
    id: 'memorial-planning',
    name: 'Memorial Planning',
    description: 'Custom memorial services and tributes tailored to your family.',
    longDescription: 'From intimate gatherings to larger memorials, we tailor every detail to reflect the life and wishes of your loved one. Music, readings, and tributes can be customized.',
    image: '/sample/services/4.jpg',
  },
]

export function getServiceById(id) {
  return SERVICES.find((s) => s.id === id) ?? null
}
