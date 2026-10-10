---
feature: store
dri: pendiente
estado: en_progreso
actualizado: 2026-10-08
historias:
  - id: US-PROD-02
    estado: terminada
    evidencia: "PRs #92, #93 (grid publico), #123 a #133 (panel admin, criterio 3) y el PR de cierre us/US-PROD-02 a main (prueba del criterio 2); tests: store.test.tsx (criterios 1 y 2), product.test.ts, commands.test.ts, queries.test.ts, product-schema.test.ts, product-actions.test.ts, layout.test.tsx, products-admin-rls.test.ts (omitida sin Supabase local, ver deuda)"
  - id: US-PROD-03
    estado: en_progreso
    falta: "los criterios 1, 2 y 3 tienen prueba en product-detail-page.test.tsx (ruta /productos/[slug] con imagen, nombre, descripcion, precio, boton de agregar al carrito y aviso Agotado con la compra deshabilitada; enlace desde el grid en store.test.tsx); la administradora sube la imagen como archivo validado por contenido (product-actions.test.ts); falta el PR de cierre us/US-PROD-03 a main para marcarla terminada (EST-005)"
  - id: US-SHOP-01
    estado: no_iniciada
  - id: US-SHOP-02
    estado: no_iniciada
flags: []
deuda:
  - que: "Prueba de aislamiento RLS (SEC-002) de las politicas store_products_*_admin (supabase/migrations/20260912000000_store_products.sql): src/features/store/__tests__/products-admin-rls.test.ts se omite con describe.skipIf cuando no hay Supabase local, y CI no lo levanta, asi que no demuestra que anon y una clienta sin rol de staff no puedan INSERT, UPDATE ni DELETE"
    aceptada_en: "PR de cierre us/US-PROD-02 a main"
    costo: "1h si ya existe el arnes de Supabase local en CI de la deuda de auth (PR #3); 3h si no: arnes mas correr la suite existente en CI"
  - que: "Prueba de aislamiento (SEC-002) del bucket store-product-images: src/features/store/__tests__/product-images-storage-rls.test.ts se omite sin Supabase local y CI no lo levanta, asi que no demuestra que anon y una clienta no puedan subir, listar ni borrar"
    aceptada_en: "PR de la pieza US-PROD-03 1/8"
    costo: "el mismo arnes de la deuda anterior; con el arnes, 0h extra"
  - que: "Las server actions de Next aceptan 1 MB por defecto y next.config.js no lo cambia: una imagen de entre ~1 MB y 2 MB pasa validateProductImage pero Next corta la peticion antes con un error generico; el formulario dice 'hasta 1 MB'"
    aceptada_en: "PR de la pieza US-PROD-03 8/8"
    costo: "1 linea en next.config.js (experimental.serverActions.bodySizeLimit '3mb') y cambiar el texto del campo; decision pendiente de investigar"
defectos: []
---

# store

Tienda (F4): productos, carrito, checkout con comprobante. Stock y pedidos admin: criterios existentes de US-SHOP-02 y US-PROD-02/03 (ADR-0007).

## Qué hace hoy

`US-PROD-02` terminada (2026-10-06): PRs #92, #93 y #123 a #133; el criterio 2 (grid responsivo) lo demuestra `store.test.tsx`, que comprueba `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`. Implementado con:
- Modelo de dominio (`domain/product.ts`): tipos puros sin dependencias; `PublicProduct` tiene `id`, `name`, `imageUrl`, `priceCrc` e `isActive`
- Caso de uso (`application/public-grid/get-public-grid-state.ts`): orquestación de listado
- Adaptador CMS (`http/products-cms-catalog.ts`): lectura desde API externa
- Adaptador base de datos (`db/public-products.ts`): lectura pública desde Supabase
- Componente React (`ui/public-grid/components/PublicProductsGrid/`): grid responsivo con estados de UI, JSX real (no HTML a mano) — React escapa contenido y atributos; sanitización de esquema de URL (`javascript:`/`data:`) aislada en `sanitizeUrl` (`domain/product.ts`)
- Strings externalizados (`ui/public-grid/constants/public-grid-strings.ts` (`PUBLIC_GRID_STRINGS`)): i18n base
- Integración en ruta pública `/productos` con catálogo desde la base de datos
- Pruebas automatizadas de UI/integración para el grid, el adaptador CMS y la ruta pública
- Etiquetas ARIA y mensaje de carga externalizados en cadenas de UI
- Acción de reintento configurable por URL (`retryUrl`) en el componente

Panel admin (criterio 3, "administrables desde el panel") en `/admin/catalog/products`, como pestaña Productos de la sección Catálogo (los componentes importan sus estilos como `STYLES`, igual que catalog y clients) junto a Técnicas y Paquetes (`/admin/store` redirige ahí; `productRoutes` se expone en `client.ts` para las pestañas), protegido por `requireAdminSession` del layout de `/admin/catalog` (redirect si no hay sesión staff) y por las políticas RLS `store_products_*_admin` (SEC-001):
- Constructor validado (`domain/product.ts`, `buildProduct`): invariantes de negocio (DOM-007) — slug (lo genera el sistema desde US-PROD-03, ver abajo), nombre (`name`) y URL de imagen (`imageUrl`) no vacíos, precio entero positivo (`priceCrc`), orden de presentación entero no negativo (`displayOrder`); sin clases, `AdminProduct` es un objeto plano
- Errores tipados (`domain/product-errors.ts`): `InvalidProduct`, `ProductNotFound`, `DuplicateProductSlug` (DOM-006), objetos discriminados por `kind` con su type guard en vez de `instanceof`
- Casos de uso (`application/admin-products/queries.ts`, `application/admin-products/commands.ts`): listar paginado, obtener, crear, actualizar, desactivar — sobre el puerto `AdminProductRepository` (`application/admin-products/ports.ts`), probados con repositorio fake (`application/admin-products/__tests__/`)
- Adaptador de escritura (`db/admin-product-repository.ts`): CRUD contra `store_products` vía Supabase, mapea `23505` (slug duplicado) a error de dominio; sin clase, función factory con closures — `db/public-products.ts` y `http/products-cms-catalog.ts` (lectura pública) siguen el mismo patrón
- Server actions (`ui/admin-products/actions/product-actions.ts`) con validación de formato en el borde (`ui/admin-products/validation/product-schema.ts`, `productSchema`, Zod) y chequeo de rol amable (`ui/admin-products/actions/staff-permission.ts`, `isStaff`) — la autorización real la hace RLS
- Lógica de formulario separada del render en `ui/admin-products/hooks/useProductForm.ts` (mismo patrón que `auth/hooks/useAdminLoginForm`)
- Textos y rutas del panel externalizados en `ui/admin-products/constants/product-strings.ts` (`productStrings`) y `product-routes.ts` (`productRoutes`) (DOM-009)
- Componentes (`ProductForm`, `ProductsAdminTable` y `ProductsAdminPanel` en `ui/admin-products/components/`): listado, alta, edición y desactivación (no hay borrado físico) con estados vacío/carga/error (UI-003) y feedback accesible por rol `alert`/`status` (UI-004) — cada decisión de qué pintar sale precalculada de un `.data.ts` o un hook; los `.tsx` solo despachan por tabla o pintan, sin `if`/`?:`/`&&`
- Pruebas automatizadas: dominio, casos de uso (repositorio fake), esquema, server actions, protección de layout, y aislamiento RLS (`__tests__/products-admin-rls.test.ts`, se salta sin Supabase local)


`US-PROD-03` en progreso (2026-10-08). Existencias: la columna `store_products.existencias` (entero, `DEFAULT 0`, `CHECK >= 0`) la crea US-PROD-03 en `supabase/migrations/20261006000000_store_products_existencias_e_imagenes.sql`, para que el detalle indique "agotado" y deshabilite la compra (criterio 3). La columna queda en español como las demás de `store_products` (`nombre`, `precio_crc`, `activo`); el código la lee como `stock`, igual que `precio_crc` se lee como `priceCrc`. El descuento al vender y el impedir vender más unidades de las disponibles son de US-SHOP-02. Las filas que ya existían quedan en 0 hasta que se carguen sus existencias. La administradora las carga en `/admin/catalog/products`: `buildProduct` exige un entero no negativo (DOM-007) y `productSchema` rechaza el campo vacío en vez de convertirlo en 0, porque `z.coerce.number()` convierte `""` en 0 y un descuido quedaría guardado como "agotado"; el 0 escrito a propósito sí se acepta. Sin índice: ninguna consulta filtra por esa columna (PERF-003). Sin política nueva: las políticas `store_products_*` cubren la fila completa.

Imágenes (US-PROD-03): la misma migración crea el bucket público `store-product-images` (2 MB, `image/jpeg`, `image/png`, `image/webp`) y cuatro políticas en `storage.objects` (`store_product_images_{select,insert,update,delete}_admin`, solo staff, SEC-001). Va en la misma migración porque INT-008 permite una por PR y el cierre de la historia es un PR. Es público porque las fotos del catálogo las ve cualquiera, a diferencia del expediente (SECURITY.md); no hay SELECT público, así que nadie fuera del staff puede listar el bucket. El tamaño y el tipo del bucket son defensa extra: la validación por contenido (DOM-008) va en el servidor.

Slug (US-PROD-03, condición previa de la URL `/productos/[slug]`; cambia el panel de US-PROD-02): la administradora ya no lo escribe. Al crear, `slugFromName` (`domain/product-slug.ts`) lo saca del nombre: minúsculas, sin tildes (`ñ` → `n`), y cada tramo de espacios o símbolos se vuelve un `-`. Si ya existe, `firstAvailableSlug` agrega `-2`, `-3`… con los slugs que devuelve `listSlugsStartingWith`, que incluye los productos desactivados porque el `UNIQUE` de la columna también los cuenta. Si dos altas simultáneas eligen el mismo slug, el `UNIQUE` sigue respondiendo `DuplicateProductSlug` (DOM-006). Al editar, el slug se conserva aunque cambie el nombre, para no romper enlaces ya compartidos; se descartó regenerarlo. `productSchema` descarta un `slug` enviado en el formulario y rechaza un nombre sin letras ni números, porque no daría slug (DOM-007). Sin migración: la columna y su `UNIQUE` se quedan.

Lectura del detalle (US-PROD-03, primera mitad del criterio 3): `getPublicProductDetail` (`application/public-detail/get-public-product-detail.ts`) recibe un slug y devuelve un `PublicProductDetail` (`domain/product-detail.ts`) o `PublicProductNotFound` (DOM-006). Es un error aparte de `ProductNotFound`, porque aquel identifica por `productId` y este por slug. El detalle lleva slug, nombre, descripción, imagen saneada con `sanitizeUrl`, precio formateado e `isAvailable`. No lleva el número de existencias: la tienda solo necesita saber si hay o no. Un producto desactivado responde igual que uno inexistente, para que la tienda no revele que existió. Lo filtran tres capas: RLS (`store_products_select_public_active`, SEC-001), el `.eq('activo', true)` de `db/public-product-detail.ts` y el caso de uso. Un error de la base lanza, porque es inesperado; la página de la pieza siguiente lo muestra como estado de error (UI-003). Sin índice nuevo: el `UNIQUE` de `slug` ya indexa la búsqueda (PERF-003).

Página de detalle (US-PROD-03, criterios 1, 2 y 3): la ruta `/productos/[slug]` (`src/app/productos/[slug]/`) lee con `getPublicProductDetail` y pinta `ProductDetail` (`ui/public-detail/`). Muestra imagen, nombre como `<h1>`, precio, descripción, el aviso "Disponible" o "Agotado" y el botón "Agregar al carrito", que queda `disabled` cuando no hay existencias. El botón se describe con el aviso mediante `aria-describedby`, para que un lector de pantalla diga por qué no se puede comprar (UI-004). El botón todavía no tiene acción: el carrito llega con US-SHOP-01, que le conecta el agregado; se descartó esconderlo detrás de un flag porque el criterio 2 pide que exista. Los estados de la ruta (UI-003) son `loading.tsx` (carga), `error.tsx` (error, con reintento) y `not-found.tsx`, que es el "vacío" de un detalle: un slug inexistente o un producto desactivado llaman `notFound()`. Esos tres toman los textos de `client.ts` (`PUBLIC_DETAIL_STRINGS`, `publicDetailRoutes`). `getProductDetail` (`page.data.ts`) va envuelto en `cache` de React, para que `generateMetadata` (el título de la pestaña lleva el nombre del producto) y la página compartan una sola consulta por petición. El grid enlaza el nombre de cada tarjeta a `publicDetailRoutes.product(slug)`; para eso `PublicProduct` y `PublicProductCard` llevan `slug`, que leen `db/public-products.ts` y `http/products-cms-catalog.ts` (el DTO del CMS gana `slug`).

Pieza 6 (US-PROD-03): tarjeta con hover (`motion-safe:`, UI-004), nombre por encima del precio y un único enlace "Ver más" con el nombre en `sr-only`; detalle con botón "Volver al catálogo" con flecha (`aria-hidden`). Panel: un producto desactivado no se podía reactivar; ahora `activateProduct` y `ProductStatusSection` (antes `DeactivateSection`) muestran "Activar" o "Desactivar" según su estado. `catalog` tiene el mismo hueco (técnicas y paquetes), fuera de esta pieza.

Pieza 7 (US-PROD-03): `validateProductImage` (`domain/product-image.ts`) reconoce JPEG, PNG y WebP por sus primeros bytes y rechaza vacíos o de más de 2 MB (DOM-008); SVG no pasa porque puede traer scripts. `uploadProductImage` y `removeStoredProductImage` (`application/admin-products/product-images.ts`) usan el puerto `ProductImageStorage`; el adaptador (`db/product-image-storage.ts`) sube con la sesión de la administradora (SEC-003), sin pisar archivos (`upsert: false`), a `<productId>/<uuid>.<extensión detectada>`, y solo borra URLs de su propio bucket: los links cargados a mano antes del bucket no se tocan.

Pieza 8 (US-PROD-03): el formulario pide un archivo (`ProductImageField`) en vez de una URL: obligatorio al crear, opcional al editar (sin archivo se conserva la imagen). `createProductAction` y `updateProductAction` validan, suben a `<productId>/…`, guardan la URL pública en `url_imagen` y, si guardar falla, borran lo subido; al reemplazar borran la imagen anterior si era del bucket. Los productos con links viejos siguen funcionando.

La capa de presentación se organiza por área en `ui/<area>/` (`admin-products`, `public-grid`, `public-detail`), cada una con `components/<Componente>/` (`.tsx`, `.styles.ts`, `.types.ts`, `index.ts`), `hooks/`, `actions/`, `constants/`, `types/`, `validation/` y `__tests__/`; `domain/`, `application/`, `db/`, `http/` son la arquitectura DDD (ARCH-002/DOM-006/007) y no se solapan con esta convención.

## Contrato público

`index.ts` exporta el contrato completo para listar productos, renderizar grid, consultar catálogos, leer y pintar el detalle público por slug (`getPublicProductDetail`, `publicProductDetailDb`, `ProductDetail`) y administrar productos (ARCH-003). `client.ts` expone solo textos y rutas, para los boundaries de ruta que corren en el cliente.

