import { ProductoPublico } from '../domain/producto';
import { CatalogoProductosPublico } from '../application/obtener-grid-productos-publicos';

// DTO que devuelve el CMS externo (contrato con API del CMS, ADR-0001)
export type DtoProductoCms = {
  id: string;
  nombre: string;
  url_imagen: string;
  precio_crc: number;
  activo: boolean;
};

// Contrato del cliente HTTP hacia el CMS
export type ClienteCms = {
  obtenerProductosPublicos(): Promise<DtoProductoCms[]>;
};

// Adaptador que implementa CatalogoProductosPublico hablando al CMS
export class CatalogoProductosCms implements CatalogoProductosPublico {
  constructor(private readonly clienteCms: ClienteCms) {}

  async listarProductosPublicos(): Promise<ProductoPublico[]> {
    const productosDelCms = await this.clienteCms.obtenerProductosPublicos();

    return productosDelCms.map((producto) => ({
      id: producto.id,
      nombre: producto.nombre,
      urlImagen: producto.url_imagen,
      precioCrc: producto.precio_crc,
      activo: producto.activo,
    }));
  }
}
