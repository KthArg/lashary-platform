---
feature: store
dri: pendiente
estado: en_progreso
actualizado: 2026-09-09
historias:
  - id: US-PROD-02
    estado: en_progreso
    falta: Tests automatizados de UI/integración; panel admin para gestionar productos desde CMS.
  - id: US-PROD-03
    estado: no_iniciada
  - id: US-SHOP-01
    estado: no_iniciada
  - id: US-SHOP-02
    estado: no_iniciada
flags: []
deuda: []
defectos: []
---

# store

Tienda (F4): productos, carrito, checkout con comprobante. Stock y pedidos admin: criterios existentes de US-SHOP-02 y US-PROD-02/03 (ADR-0007).

## Qué hace hoy

`US-PROD-02` implementado con:
- Modelo de dominio (`domain/producto.ts`): tipos puros sin dependencias
- Caso de uso (`application/obtener-grid-productos-publicos.ts`): orquestación de listado
- Adaptador CMS (`http/catalogo-productos-cms.ts`): lectura desde API externa
- Componente React (`ui/grid-productos-publicos.tsx`): grid responsivo con estados de UI
- Strings externalizados (`ui/grid-productos-publicos.cadenas.es.ts`): i18n base
- Integración en ruta pública `/productos` con cliente CMS simulado
- Endurecimiento anti-XSS en renderer HTML: escape de contenido y sanitización de URLs provenientes de CMS
- Etiquetas ARIA y mensaje de carga externalizados en cadenas de UI
- Acción de reintento configurable por URL (`urlReintento`) en el renderer

Se detiene antes de tests automatizados y panel admin.

## Contrato público

`index.ts` exporta el contrato completo para listar productos, renderizar grid y consultar catálogos (ARCH-003).
