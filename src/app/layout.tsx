import './globals.css'
import type { Metadata } from 'next'
import { Playfair_Display, Inter } from 'next/font/google'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'LASHARY Beauty Studio',
  description: 'Estudio de belleza y agendamiento',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" data-theme="lashary" className={`${playfair.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-brand-cream text-brand-dark font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
