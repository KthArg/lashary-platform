// Texto visible del sitio público (DOM-009). El contenido editable viene del CMS por `content`;
// aquí vive solo lo que es estructura de la página.
export const landingMessages = {
  metadata: {
    title: 'LASHARY Beauty Studio — Extensiones de pestañas en Ciudad Quesada',
    description:
      'Estudio de extensiones de pestañas en Ciudad Quesada, Costa Rica. Una clienta por cita, protocolo de esterilización y materiales de grado profesional.',
  },
  brand: {
    name: 'LASHARY',
    tagline: 'BEAUTY STUDIO',
  },
  header: {
    sectionsNav: 'Secciones',
    reserve: 'Reservar cita',
    openMenu: 'Abrir menú',
  },
  menu: {
    dialogLabel: 'Menú',
    close: 'Cerrar',
    reserve: 'Reservar cita',
  },
  techniques: {
    title: 'Servicios',
    index: '01',
    firstTime: 'Primera vez',
    retouch: 'Retoque',
    minutes: 'min',
    reserve: 'Reservar esta técnica',
    empty:
      'El catálogo se está actualizando. Escribinos y te contamos qué técnicas hay disponibles esta semana.',
  },
  gallery: {
    title: 'Galería',
    index: '02',
    filterLabel: 'Filtrar la galería por técnica',
    all: 'Todas',
    before: 'Antes',
    after: 'Después',
    empty: 'Pronto vas a ver acá resultados antes y después de clientas del estudio.',
  },
}

// Nombre corto de cada familia para los filtros de la galería. El nombre completo de cada
// técnica es del catálogo; aquí solo va la etiqueta del filtro (DOM-009).
export const galleryFamilyLabels: Record<string, string> = {
  lash_classic: 'Clásicas',
  lash_volume: 'Volumen',
  lash_extra_volume: 'Volumen extra',
  brow_design: 'Diseño de cejas',
  brow_lamination: 'Laminado de cejas',
  henna: 'Henna',
  waxing: 'Depilación',
  lips: 'Labios',
}

// Descripción de cada familia de servicio. El catálogo (US-AGE-08) guarda nombre, precios y
// tiempos, no prosa: el texto que explica en qué consiste cada técnica es del sitio, y por eso
// vive aquí (DOM-009). Una familia sin texto no rompe la fila — se muestra sin descripción.
export const techniqueDescriptions: Record<string, string> = {
  lash_classic:
    'Una extensión por cada pestaña natural. El efecto es definido y discreto, como una máscara bien aplicada que no se corre.',
  lash_volume:
    'Abanicos hechos a mano con varias fibras muy finas. El resultado es denso y notorio, y sigue siendo liviano sobre la pestaña.',
  lash_extra_volume:
    'Más fibras por abanico, para quien busca una mirada llena y evidente. Se trabaja despacio, fibra por fibra, para que el peso siga siendo el de la pestaña natural.',
  brow_design:
    'Medimos la ceja según tus facciones, corregimos la forma y definimos el contorno. Sale marcada sin perder lo que ya te favorece.',
  brow_lamination:
    'Ordena el pelo de la ceja y lo fija en su sitio durante semanas. Da densidad a una ceja rala sin agregar color.',
  henna:
    'Tinte vegetal que oscurece el pelo y también la piel bajo la ceja. Rellena los espacios vacíos y se va desvaneciendo solo.',
  waxing:
    'Cera tibia sobre el área que elijas, retirada en el sentido que menos molesta. Se limpia con producto calmante al terminar.',
  lips: 'Perfilado y color en los labios, con pigmentos de grado profesional. El tono se elige con vos antes de empezar.',
}
