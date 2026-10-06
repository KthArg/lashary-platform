export type {
  ProductoPublico,
  TarjetaProductoPublico,
  EstadoGridProductos,
  CadenaProductos,
} from './domain/product';

export { aProductoEnTarjeta, formatearPrecioCrc } from './domain/product';

export type { CatalogoProductosPublico } from './application/public-grid/get-public-grid-state';

export { CADENAS_GRID_PRODUCTOS_ES } from './constants/grid-productos-publicos-cadenas-es';
export type { GridProductosPublicosProps } from './components/GridProductosPublicos';
export { GridProductosPublicos } from './components/GridProductosPublicos';

export {
  estadoGridProductosInicial,
  obtenerEstadoGridProductos,
} from './application/public-grid/get-public-grid-state';

export type { ClienteCms, DtoProductoCms } from './http/products-cms-catalog';
export { catalogoProductosCms } from './http/products-cms-catalog';
export { catalogoProductosDb } from './db/public-products';

export { PanelAdminProductos } from './components/PanelAdminProductos';
export { mensajesAdminProductos } from './constants/mensajes-admin-productos';
export type { ProductoAdminVista } from './domain/product';
