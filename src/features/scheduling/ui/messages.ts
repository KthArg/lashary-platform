export const schedulingMessages = {
  page: {
    title: 'Agendar una cita',
    subtitle: 'Elegí la técnica que querés agendar. La duración incluye preparación y limpieza.',
    empty: 'Todavía no hay técnicas activas para agendar. Volvé a intentarlo más tarde.',
    loading: 'Cargando las técnicas disponibles…',
    error: {
      title: 'No se pudo cargar el catálogo',
      body: 'Ocurrió un error al leer las técnicas disponibles para agendar.',
      retry: 'Reintentar',
    },
  },
  selector: {
    chooseTechnique: 'Técnica',
    firstTimeQuestion: '¿Primera vez o re-aplicación?',
    autoOption: 'Que el sistema lo determine automáticamente',
    firstTimeOption: 'Es mi primera vez con esta técnica',
    retouchOption: 'Ya me apliqué esta técnica antes (retoque)',
    autoDetectHint: 'Podés corregirlo manualmente si el sistema se equivoca.',
    submit: 'Calcular duración',
    computed: 'Duración calculada',
    durationLabel: 'Tiempo total del espacio',
    minutesShort: 'min',
    accessDenied: 'Iniciá sesión como clienta para agendar una cita.',
    pickOne: 'Elegí una técnica de la lista.',
  },
} as const
