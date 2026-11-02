import { Bodoni_Moda, Schibsted_Grotesk } from 'next/font/google'

export const siteDisplay = Bodoni_Moda({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  axes: ['opsz'],
  variable: '--font-site-display',
  display: 'swap',
})

export const siteSans = Schibsted_Grotesk({
  subsets: ['latin'],
  variable: '--font-site-sans',
  display: 'swap',
})
