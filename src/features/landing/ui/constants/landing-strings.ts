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
    login: 'Iniciar sesión',
    openMenu: 'Abrir menú',
  },
  menu: {
    dialogLabel: 'Menú',
    close: 'Cerrar',
    reserve: 'Reservar cita',
    login: 'Iniciar sesión',
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
  studio: {
    title: 'El estudio',
    index: '02',
    trajectory: 'Trayectoria',
    education: 'Formación',
    certifications: 'Certificaciones',
    years: (years: number) => (years === 1 ? '1 año de experiencia' : `${years} años de experiencia`),
  },
  reasons: {
    title: 'Por qué acá',
    index: '03',
  },
  loyalty: {
    title: 'Fidelidad',
    index: '05',
    levelsLabel: 'Beneficios por visita',
    visit: (visit: number) => `${visit}.ª visita`,
    empty: 'Pronto vas a encontrar acá cómo funciona el programa de fidelidad del estudio.',
  },
  footer: {
    label: 'Pie de página',
    contact: 'Contacto',
    whatsapp: 'WhatsApp',
    instagram: 'Instagram',
    hours: 'Horario',
    studio: 'Estudio',
    directions: 'Cómo llegar',
    reservations: 'Reservas',
    reserve: 'Reservar cita',
    rights: (year: number) => `© ${year} LASHARY Beauty Studio. Todos los derechos reservados.`,
  },
  faq: {
    title: 'Preguntas',
    index: '06',
  },
  location: {
    title: 'Ubicación',
    index: '07',
    hours: 'Horario',
    contact: 'Contacto',
    whatsapp: 'Escribinos por WhatsApp',
    instagram: 'Instagram',
    facebook: 'Facebook',
    tiktok: 'TikTok',
    newTab: '(se abre en otra pestaña)',
    mapTitle: 'Mapa de la ubicación del estudio',
    openMap: 'Abrir en Google Maps',
    empty: 'Pronto vas a encontrar acá cómo llegar al estudio y cómo contactarnos.',
  },
  gallery: {
    title: 'Galería',
    index: '04',
    filterLabel: 'Filtrar la galería por técnica',
    all: 'Todas',
    before: 'Antes',
    after: 'Después',
    hint: 'Tocá un par para verlo en grande. Flechas para navegar, Esc para cerrar.',
    dialogLabel: 'Galería ampliada',
    previous: 'Anterior',
    next: 'Siguiente',
    close: 'Cerrar',
    empty: 'Pronto vas a ver acá resultados antes y después de clientas del estudio.',
  },
}

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
