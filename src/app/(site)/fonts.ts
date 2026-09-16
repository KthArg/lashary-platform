import { Bodoni_Moda, Schibsted_Grotesk } from 'next/font/google'

// Tipografía del sitio público. Se cargan solo en el layout de (site): el panel y el portal no
// las descargan. Las dos son variables, así que un archivo cubre todos los pesos.
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
