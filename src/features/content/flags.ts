// landing_cms_content — feature flag (INT-004). Dueño y fecha de retiro: content/SPEC.md.
//
// La integración con el CMS externo está CODIFICADA pero NO VERIFICADA: no hay instancia del
// CMS con URL ni token, y el esquema de "Sección inicio" está asumido, no confirmado con el
// mantenedor (INT-003, docs/contracts/cms-api.md). Con el flag en `false`,
// `cmsGateway.fetchHomeContent()` devuelve `null` sin llamar al CMS, y la landing sirve su
// contenido de respaldo (ADR-0001). El criterio 3 de US-LAND-01 ("contenido editable desde el
// CMS") queda `en_progreso` hasta encender esto.
//
// Al encender: confirmar el contrato con el mantenedor, probar `fetchHomeContent` contra el
// CMS real (test de integración), poner esto en `true`, y borrar este archivo.
export const LANDING_CMS_CONTENT = false
