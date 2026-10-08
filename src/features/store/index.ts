export type {
  ProductoPublico,
  TarjetaProductoPublico,
  EstadoGridProductos,
  CadenaProductos,
} from './domain/product';

export { aProductoEnTarjeta, formatearPrecioCrc } from './domain/product';

export type { CatalogoProductosPublico } from './application/public-grid/get-public-grid-state';

export { CADENAS_GRID_PRODUCTOS_ES } from './ui/public-grid/constants/public-grid-strings';
export type { GridProductosPublicosProps } from './ui/public-grid/components/PublicProductsGrid';
export { GridProductosPublicos } from './ui/public-grid/components/PublicProductsGrid';

export {
  estadoGridProductosInicial,
  obtenerEstadoGridProductos,
} from './application/public-grid/get-public-grid-state';

export type { ClienteCms, DtoProductoCms } from './http/products-cms-catalog';
export { catalogoProductosCms } from './http/products-cms-catalog';
export { catalogoProductosDb } from './db/public-products';

export { PanelAdminProductos } from './ui/admin-products/components/ProductsAdminPanel';
export { mensajesAdminProductos } from './ui/admin-products/constants/product-strings';
export type { ProductoAdminVista } from './domain/product';
