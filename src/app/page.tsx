import { getHomeContent } from '@/features/content'
import { HomePage, FALLBACK_HOME_CONTENT } from '@/features/landing'

// SSG + ISR: la página se regenera como máximo cada hora. Cuando se acuerde la invalidación
// del CMS (webhook o TTL — garantía 6 de docs/contracts/cms-api.md) se ajusta acá.
export const revalidate = 3600

export default async function Page() {
  // Si el CMS no entrega contenido (flag apagado, caído o respuesta inválida) se sirve el
  // respaldo estático — la landing degrada con gracia, nunca se cae (ADR-0001).
  const content = (await getHomeContent()) ?? FALLBACK_HOME_CONTENT
  return <HomePage content={content} />
}
