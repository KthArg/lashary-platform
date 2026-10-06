---
feature: store
dri: pendiente
estado: en_progreso
actualizado: 2026-10-06
historias:
  - id: US-PROD-02
    estado: terminada
    evidencia: "PRs #92, #93 (grid publico), #123 a #133 (panel admin, criterio 3) y el PR de cierre us/US-PROD-02 a main (prueba del criterio 2); tests: store.test.tsx (criterios 1 y 2), producto.test.ts, productos-admin-comandos.test.ts, productos-admin-consultas.test.ts, esquema-producto-admin.test.ts, productos-admin-actions.test.ts, layout.test.tsx, rls-productos-admin.test.ts (omitida sin Supabase local, ver deuda)"
  - id: US-PROD-03
    estado: no_iniciada
  - id: US-SHOP-01
    estado: no_iniciada
  - id: US-SHOP-02
    estado: no_iniciada
flags: []
deuda:
  - que: "Prueba de aislamiento RLS (SEC-002) de las politicas store_products_*_admin (supabase/migrations/20260912000000_store_products.sql): src/features/store/__tests__/rls-productos-admin.test.ts se omite con describe.skipIf cuando no hay Supabase local, y CI no lo levanta, asi que no demuestra que anon y una clienta sin rol de staff no puedan INSERT, UPDATE ni DELETE"
    aceptada_en: "PR de cierre us/US-PROD-02 a main"
    costo: "1h si ya existe el arnes de Supabase local en CI de la deuda de auth (PR #3); 3h si no: arnes mas correr la suite existente en CI"
defectos: []
---

# store

Tienda (F4): productos, carrito, checkout con comprobante. Stock y pedidos admin: criterios existentes de US-SHOP-02 y US-PROD-02/03 (ADR-0007).

## Qué hace hoy

`US-PROD-02` terminada (2026-10-06): PRs #92, #93 y #123 a #133; el criterio 2 (grid responsivo) lo demuestra `store.test.tsx`, que comprueba `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`. Implementado con:
- Modelo de dominio (`domain/producto.ts`): tipos puros sin dependencias
- Caso de uso (`application/obtener-grid-productos-publicos.ts`): orquestación de listado
- Adaptador CMS (`http/catalogo-productos-cms.ts`): lectura desde API externa
- Adaptador base de datos (`db/productos-db.ts`): lectura pública desde Supabase
- Componente React (`ui/public-grid/components/PublicProductsGrid/`): grid responsivo con estados de UI, JSX real (no HTML a mano) — React escapa contenido y atributos; sanitización de esquema de URL (`javascript:`/`data:`) aislada en `sanitizeUrl` (`domain/producto.ts`)
- Strings externalizados (`ui/public-grid/constants/public-grid-strings.ts` (`PUBLIC_GRID_STRINGS`)): i18n base
- Integración en ruta pública `/productos` con catálogo desde la base de datos
- Pruebas automatizadas de UI/integración para el grid, el adaptador CMS y la ruta pública
- Etiquetas ARIA y mensaje de carga externalizados en cadenas de UI
- Acción de reintento configurable por URL (`urlReintento`) en el componente

Panel admin (criterio 3, "administrables desde el panel") en `/admin/catalog/products`, como pestaña Productos de la sección Catálogo (los componentes importan sus estilos como `STYLES`, igual que catalog y clients) junto a Técnicas y Paquetes (`/admin/store` redirige ahí; `productRoutes` se expone en `client.ts` para las pestañas), protegido por `requireAdminSession` del layout de `/admin/catalog` (redirect si no hay sesión staff) y por las políticas RLS `store_products_*_admin` (SEC-001):
- Constructor validado (`domain/producto.ts`, `buildProduct`): invariantes de negocio (DOM-007) — slug, nombre y URL de imagen no vacíos, precio entero positivo, orden de presentación entero no negativo; sin clases, `AdminProduct` es un objeto plano
- Errores tipados (`domain/errores-producto.ts`): `InvalidProduct`, `ProductNotFound`, `DuplicateProductSlug` (DOM-006), objetos discriminados por `kind` con su type guard en vez de `instanceof`
- Casos de uso (`application/productos-admin-consultas.ts`, `application/productos-admin-comandos.ts`): listar paginado, obtener, crear, actualizar, desactivar — sobre el puerto `AdminProductRepository` (`application/productos-admin-puertos.ts`), probados con repositorio fake (`application/__tests__/`)
- Adaptador de escritura (`db/productos-admin-repositorio.ts`): CRUD contra `store_products` vía Supabase, mapea `23505` (slug duplicado) a error de dominio; sin clase, función factory con closures — `db/productos-db.ts` y `http/catalogo-productos-cms.ts` (lectura pública) siguen el mismo patrón
- Server actions (`ui/admin-products/actions/product-actions.ts`) con validación de formato en el borde (`ui/admin-products/validation/product-schema.ts`, `productSchema`, Zod) y chequeo de rol amable (`ui/admin-products/actions/staff-permission.ts`, `isStaff`) — la autorización real la hace RLS
- Lógica de formulario separada del render en `ui/admin-products/hooks/useProductForm.ts` (mismo patrón que `auth/hooks/useAdminLoginForm`)
- Textos y rutas del panel externalizados en `ui/admin-products/constants/product-strings.ts` (`productStrings`) y `product-routes.ts` (`productRoutes`) (DOM-009)
- Componentes (`ProductForm`, `ProductsAdminTable` y `ProductsAdminPanel` en `ui/admin-products/components/`): listado, alta, edición y desactivación (no hay borrado físico) con estados vacío/carga/error (UI-003) y feedback accesible por rol `alert`/`status` (UI-004) — cada decisión de qué pintar sale precalculada de un `.data.ts` o un hook; los `.tsx` solo despachan por tabla o pintan, sin `if`/`?:`/`&&`
- Pruebas automatizadas: dominio, casos de uso (repositorio fake), esquema, server actions, protección de layout, y aislamiento RLS (`__tests__/rls-productos-admin.test.ts`, se salta sin Supabase local)

Disposición actual de archivos (nombres en inglés): `ui/admin-products/` y `ui/public-grid/` (components, hooks, actions, constants, types, validation, `__tests__`), `application/admin-products/`, `application/public-grid/`, `domain/product.ts`, `db/` y `http/`; las rutas citadas arriba con nombres en español corresponden a los equivalentes de este mapa.

Organización de la capa de presentación (`components/`, `hooks/`, `actions/`, `constants/`) igual a la de `auth`: `domain/`, `application/`, `db/`, `http/` son la arquitectura DDD (ARCH-002/DOM-006/007) y no se solapan con esta convención.

## Contrato público

`index.ts` exporta el contrato completo para listar productos, renderizar grid, consultar catálogos y administrar productos (ARCH-003). `client.ts` expone solo los textos, para los boundaries de ruta que corren en el cliente.

