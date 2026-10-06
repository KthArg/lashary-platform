export type {
  ProductoPublico,
  TarjetaProductoPublico,
  EstadoGridProductos,
  CadenaProductos,
} from './domain/producto';

export { aProductoEnTarjeta, formatearPrecioCrc } from './domain/producto';

export type { CatalogoProductosPublico } from './application/obtener-grid-productos-publicos';

export { CADENAS_GRID_PRODUCTOS_ES } from './constants/grid-productos-publicos-cadenas-es';
export type { GridProductosPublicosProps } from './components/GridProductosPublicos';
export { GridProductosPublicos } from './components/GridProductosPublicos';

export {
  estadoGridProductosInicial,
  obtenerEstadoGridProductos,
} from './application/obtener-grid-productos-publicos';

export type { ClienteCms, DtoProductoCms } from './http/catalogo-productos-cms';
export { catalogoProductosCms } from './http/catalogo-productos-cms';
export { catalogoProductosDb } from './db/productos-db';

export { PanelAdminProductos } from './components/PanelAdminProductos';
export { mensajesAdminProductos } from './constants/mensajes-admin-productos';
export type { ProductoAdminVista } from './domain/producto';
