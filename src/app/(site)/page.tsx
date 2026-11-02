import {
  getContact,
  getGallery,
  getLandingContent,
  getLoyalty,
  getStudio,
  getTechniqueMedia,
} from '@/features/content'
import { listTechniques } from '@/features/catalog'
import type { Metadata } from 'next'
import { LandingHome, landingMessages, toLandingTechnique } from '@/features/landing'

// TTL de respaldo del CMS (10 min); el aviso al publicar la renueva antes
export const revalidate = 600

export const metadata: Metadata = {
  title: landingMessages.metadata.title,
  description: landingMessages.metadata.description,
  openGraph: {
    title: landingMessages.metadata.title,
    description: landingMessages.metadata.description,
    locale: 'es_CR',
    type: 'website',
  },
}

async function readTechniques() {
  try {
    const [page, media] = await Promise.all([
      listTechniques({ activeOnly: true }),
      getTechniqueMedia(),
    ])
    return page.items.map((technique) => toLandingTechnique(technique, media))
  } catch (error) {
    console.warn('[landing] catálogo no disponible; la sección de técnicas queda vacía', error)
    return []
  }
}

export default async function HomePage() {
  const [content, techniques, studio, gallery, loyalty, contact] = await Promise.all([
    getLandingContent(),
    readTechniques(),
    getStudio(),
    getGallery(),
    getLoyalty(),
    getContact(),
  ])
  return (
    <LandingHome
      content={content}
      techniques={techniques}
      studio={studio}
      gallery={gallery}
      loyalty={loyalty}
      contact={contact}
    />
  )
}
