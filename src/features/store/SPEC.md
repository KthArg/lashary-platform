---
feature: store
dri: pendiente
estado: en_progreso
actualizado: 2026-09-27
historias:
  - id: US-PROD-02
    estado: en_progreso
    falta: Panel admin (criterio 3) — faltan la UI y el wiring de la ruta `/admin/store`; dominio, aplicación, adaptador de escritura y acciones ya están.
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
- Adaptador base de datos (`db/productos-db.ts`): lectura pública desde Supabase
- Componente React (`ui/grid-productos-publicos.tsx`): grid responsivo con estados de UI
- Strings externalizados (`ui/grid-productos-publicos.cadenas.es.ts`): i18n base
- Integración en ruta pública `/productos` con catálogo desde la base de datos
- Pruebas automatizadas de UI/integración para el grid, el adaptador CMS y la ruta pública
- Endurecimiento anti-XSS en renderer HTML: escape de contenido y sanitización de URLs provenientes de CMS
- Etiquetas ARIA y mensaje de carga externalizados en cadenas de UI
- Acción de reintento configurable por URL (`urlReintento`) en el renderer

Panel admin (criterio 3, "administrables desde el panel") — en construcción, aún no montado:
- Constructor validado (`domain/producto.ts`, `construirProducto`): invariantes de negocio (DOM-007) — slug, nombre y URL de imagen no vacíos, precio entero positivo, orden de presentación entero no negativo; sin clases, `ProductoAdminVista` es un objeto plano
- Errores tipados (`domain/errores-producto.ts`): `ProductoInvalido`, `ProductoNoEncontrado`, `ProductoSlugDuplicado` (DOM-006)
- Casos de uso (`application/productos-admin-consultas.ts`, `application/productos-admin-comandos.ts`): listar paginado, obtener, crear, actualizar, desactivar — sobre el puerto `ProductoRepositorioAdmin` (`application/productos-admin-puertos.ts`), probados con repositorio fake (`application/__tests__/`)
- Adaptador de escritura (`db/productos-admin-repositorio.ts`): CRUD contra `store_products` vía Supabase, mapea `23505` (slug duplicado) a error de dominio; sin clase, función factory con closures

`db/productos-db.ts` y `http/catalogo-productos-cms.ts` (lectura pública) pasaron de clase a función factory (`catalogoProductosDb`, `catalogoProductosCms`) en la misma pieza, para no dejar dos convenciones a medio camino.
- Server actions (`actions/productos-admin-actions.ts`) con validación de formato en el borde (`actions/esquema-producto-admin.ts`, Zod) y chequeo de rol amable (`actions/permiso-staff.ts`) — la autorización real la hace RLS
- Lógica de formulario separada del render en `hooks/useFormularioProductoAdmin.ts` (mismo patrón que `auth/hooks/useAdminLoginForm`)
- Textos y rutas del panel externalizados en `constants/mensajes-admin-productos.ts` y `constants/rutas-admin-productos.ts` (DOM-009)

## Contrato público

`index.ts` exporta el contrato completo para listar productos, renderizar grid y consultar catálogos (ARCH-003).
