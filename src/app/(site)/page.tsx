import { getLandingContent } from '@/features/content'
import { LandingHome } from '@/features/landing'

// Estática con revalidación: el TTL de respaldo del contrato del CMS (10 min). El aviso al
// publicar la renueva antes (POST /api/cms/webhook).
export const revalidate = 600

export default async function HomePage() {
  const content = await getLandingContent()
  return <LandingHome content={content} />
}
