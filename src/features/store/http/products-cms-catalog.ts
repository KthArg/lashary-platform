import { PublicProduct } from '../domain/product';
import { PublicProductCatalog } from '../application/public-grid/get-public-grid-state';

export type CmsProductDto = {
  id: string;
  slug: string;
  nombre: string;
  url_imagen: string;
  precio_crc: number;
  activo: boolean;
};

export type CmsClient = {
  getPublicProducts(): Promise<CmsProductDto[]>;
};

export function cmsProductCatalog(cmsClient: CmsClient): PublicProductCatalog {
  return {
    async listPublicProducts(): Promise<PublicProduct[]> {
      const cmsProducts = await cmsClient.getPublicProducts();

      return cmsProducts.map((product) => ({
        id: product.id,
        slug: product.slug,
        name: product.nombre,
        imageUrl: product.url_imagen,
        priceCrc: product.precio_crc,
        isActive: product.activo,
      }));
    },
  };
}
