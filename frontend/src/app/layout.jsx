import './globals.css'

export const metadata = {
  title: {
    default: 'Lavisionario',
    template: '%s | Lavisionario',
  },
  description: 'No description yet',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}