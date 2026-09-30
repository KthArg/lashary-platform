---
feature: store
dri: pendiente
estado: en_progreso
actualizado: 2026-09-30
historias:
  - id: US-PROD-02
    estado: en_revision
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
- Componente React (`components/GridProductosPublicos/`): grid responsivo con estados de UI, JSX real (no HTML a mano) — React escapa contenido y atributos; sanitización de esquema de URL (`javascript:`/`data:`) aislada en `sanitizarUrl` (`domain/producto.ts`). Las variantes de estado (cargando/vacío/error/listo) y los botones de reintento viven consolidados en `Estados.tsx`, un archivo por familia en vez de uno por variante
- Strings externalizados (`constants/grid-productos-publicos-cadenas-es.ts`): i18n base
- Integración en ruta pública `/productos` con catálogo desde la base de datos
- Pruebas automatizadas de UI/integración para el grid, el adaptador CMS y la ruta pública
- Etiquetas ARIA y mensaje de carga externalizados en cadenas de UI
- Acción de reintento configurable por URL (`urlReintento`) en el componente

Panel admin (criterio 3, "administrables desde el panel") en `/admin/store`, protegido por `requireAdminSession` (redirect si no hay sesión staff) y por las políticas RLS `store_products_*_admin` (SEC-001):
- Constructor validado (`domain/producto.ts`, `construirProducto`): invariantes de negocio (DOM-007) — slug, nombre y URL de imagen no vacíos, precio entero positivo, orden de presentación entero no negativo; sin clases, `ProductoAdminVista` es un objeto plano
- Errores tipados (`domain/errores-producto.ts`): `ProductoInvalido`, `ProductoNoEncontrado`, `ProductoSlugDuplicado` (DOM-006), objetos discriminados por `tipo` con su type guard en vez de `instanceof`
- Casos de uso (`application/productos-admin-consultas.ts`, `application/productos-admin-comandos.ts`): listar paginado, obtener, crear, actualizar, desactivar — sobre el puerto `ProductoRepositorioAdmin` (`application/productos-admin-puertos.ts`), probados con repositorio fake (`application/__tests__/`)
- Adaptador de escritura (`db/productos-admin-repositorio.ts`): CRUD contra `store_products` vía Supabase, mapea `23505` (slug duplicado) a error de dominio; sin clase, función factory con closures — `db/productos-db.ts` y `http/catalogo-productos-cms.ts` (lectura pública) siguen el mismo patrón
- Server actions (`actions/productos-admin-actions.ts`) con validación de formato en el borde (`actions/esquema-producto-admin.ts`, Zod) y chequeo de rol amable (`actions/permiso-staff.ts`) — la autorización real la hace RLS
- Lógica de formulario separada del render en `hooks/useFormularioProductoAdmin.ts` (mismo patrón que `auth/hooks/useAdminLoginForm`)
- Textos y rutas del panel externalizados en `constants/mensajes-admin-productos.ts` y `constants/rutas-admin-productos.ts` (DOM-009)
- Componentes (`components/FormularioProductoAdmin/`, `components/TablaProductosAdmin/`, `components/PanelAdminProductos/`): listado, alta, edición y desactivación (no hay borrado físico) con estados vacío/carga/error (UI-003) y feedback accesible por rol `alert`/`status` (UI-004) — cada decisión de qué pintar sale precalculada de un `.data.ts` o un hook; los `.tsx` solo despachan por tabla o pintan, sin `if`/`?:`/`&&`
- Pruebas automatizadas: dominio, casos de uso (repositorio fake), esquema, server actions, protección de layout, y aislamiento RLS (`__tests__/rls-productos-admin.test.ts`, se salta sin Supabase local)

Organización de la capa de presentación (`components/`, `hooks/`, `actions/`, `constants/`) igual a la de `auth`: `domain/`, `application/`, `db/`, `http/` son la arquitectura DDD (ARCH-002/DOM-006/007) y no se solapan con esta convención.

## Contrato público

`index.ts` exporta el contrato completo para listar productos, renderizar grid, consultar catálogos y administrar productos (ARCH-003). `client.ts` expone solo los textos, para los boundaries de ruta que corren en el cliente.

