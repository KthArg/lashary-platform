import { ProductoPublico } from '../domain/producto';
import { CatalogoProductosPublico } from '../application/obtener-grid-productos-publicos';

export type DtoProductoCms = {
  id: string;
  nombre: string;
  url_imagen: string;
  precio_crc: number;
  activo: boolean;
};

export type ClienteCms = {
  obtenerProductosPublicos(): Promise<DtoProductoCms[]>;
};

export function catalogoProductosCms(clienteCms: ClienteCms): CatalogoProductosPublico {
  return {
    async listarProductosPublicos(): Promise<ProductoPublico[]> {
      const productosDelCms = await clienteCms.obtenerProductosPublicos();

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
