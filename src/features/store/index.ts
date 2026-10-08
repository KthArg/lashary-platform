export type {
  PublicProduct,
  PublicProductCard,
  ProductGridState,
  ProductGridStrings,
} from './domain/product';

export { toProductCard, formatPriceCrc } from './domain/product';

export type { PublicProductCatalog } from './application/public-grid/get-public-grid-state';

export { CADENAS_GRID_PRODUCTOS_ES } from './ui/public-grid/constants/public-grid-strings';
export type { GridProductosPublicosProps } from './ui/public-grid/components/PublicProductsGrid';
export { GridProductosPublicos } from './ui/public-grid/components/PublicProductsGrid';

export {
  initialProductGridState,
  getProductGridState,
} from './application/public-grid/get-public-grid-state';

export type { CmsClient, CmsProductDto } from './http/products-cms-catalog';
export { cmsProductCatalog } from './http/products-cms-catalog';
export { publicProductsDb } from './db/public-products';

export { PanelAdminProductos } from './ui/admin-products/components/ProductsAdminPanel';
export { mensajesAdminProductos } from './ui/admin-products/constants/product-strings';
export type { AdminProduct } from './domain/product';
