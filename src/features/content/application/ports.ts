import type { HomeContent } from '../domain/home-content'

/**
 * Puerto de salida hacia el CMS externo (ADR-0001). Único punto de acceso al CMS desde la
 * plataforma; ninguna feature habla con el CMS por fuera de este gateway.
 */
export interface CmsGateway {
  /**
   * Contenido de la sección de inicio, o `null` si no hay contenido disponible:
   * CMS caído, respuesta inválida, sin publicar, o integración apagada (flag `landing_cms_content`).
   */
  fetchHomeContent(): Promise<HomeContent | null>
}
