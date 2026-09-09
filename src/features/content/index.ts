// Entry point público de la feature content (ARCH-003): lo único importable desde afuera.
// Gateway único hacia el CMS externo (ADR-0001). Contrato: docs/contracts/cms-api.md.
// Superficie de solo servidor: usa el token del CMS, que jamás llega al cliente (SEC-004).

import { cmsGateway } from './http/cms-gateway'

/**
 * Contenido de la sección de inicio del sitio público, o `null` si el CMS no lo entrega.
 * Quien consume decide qué mostrar cuando es `null` (fallback) — no es decisión de esta feature.
 */
export async function getHomeContent() {
  return cmsGateway.fetchHomeContent()
}

export { parseHomeContent } from './domain/home-content'
export type { HomeContent, HomeHeroImage } from './domain/home-content'
