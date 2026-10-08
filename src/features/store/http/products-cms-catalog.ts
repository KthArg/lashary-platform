import { PublicProduct } from '../domain/product';
import { PublicProductCatalog } from '../application/public-grid/get-public-grid-state';

export type CmsProductDto = {
  id: string;
  nombre: string;
  url_imagen: string;
  precio_crc: number;
  activo: boolean;
};

export type CmsClient = {
  getPublicProducts(): Promise<CmsProductDto[]>;
};

export function cmsProductCatalog(clienteCms: CmsClient): PublicProductCatalog {
  return {
    async listPublicProducts(): Promise<PublicProduct[]> {
      const productosDelCms = await clienteCms.getPublicProducts();

      return productosDelCms.map((producto) => ({
        id: producto.id,
        nombre: producto.nombre,
        urlImagen: producto.url_imagen,
        precioCrc: producto.precio_crc,
        activo: producto.activo,
      }));
    },
  };
}
