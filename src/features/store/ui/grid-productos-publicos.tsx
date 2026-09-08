import { EstadoGridProductos } from '../domain/producto';

// Renderiza una tarjeta de producto individual (UI-001/002/004: componentes, tokens, accesibilidad)
function renderTarjetaProducto(tarjeta: { id: string; nombre: string; urlImagen: string; etiquetaPrecio: string }): string {
  return `<article class="card bg-base-100 shadow-sm" data-producto-id="${tarjeta.id}">
    <figure>
      <img src="${tarjeta.urlImagen}" alt="Producto: ${tarjeta.nombre}" class="h-56 w-full object-cover" loading="lazy" />
    </figure>
    <div class="card-body">
      <h3 class="card-title text-base-content">${tarjeta.nombre}</h3>
      <p class="text-base font-semibold text-primary">${tarjeta.etiquetaPrecio}</p>
    </div>
  </article>`;
}

// Renderiza el grid completo según su estado actual (UI-003: estados vacío, carga, error)
export function renderGridProductosPublicos(estado: EstadoGridProductos): string {
  if (estado.tipo === 'cargando') {
    return '<div class="alert" role="status"><span>Cargando productos…</span></div>';
  }

  if (estado.tipo === 'vacio') {
    return `<section class="alert" role="status"><div><h2 class="font-semibold">${estado.titulo}</h2><p>${estado.descripcion}</p></div></section>`;
  }

  if (estado.tipo === 'error') {
    return `<section class="alert alert-error" role="alert"><div><h2 class="font-semibold">${estado.titulo}</h2><p>${estado.descripcion}</p><button type="button" class="btn btn-sm btn-outline mt-3">${estado.etiquetaReintentar}</button></div></section>`;
  }

  // Estado 'listo': renderizar todas las tarjetas en grid responsivo
  const tarjetas = estado.tarjetas.map(renderTarjetaProducto).join('');
  return `<section aria-label="Catálogo de productos de mantenimiento" class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">${tarjetas}</section>`;
}
