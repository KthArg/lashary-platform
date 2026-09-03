import type { ServiceFamily } from '../domain/technique'

// Texto visible externalizado (DOM-009). Un solo idioma por ahora.
export const catalogMessages = {
  admin: {
    title: 'Catálogo de técnicas',
    subtitle:
      'Técnicas del estudio con sus tiempos, precios y anticipo. El calendario y el sitio leen de aquí.',
    newTechnique: 'Nueva técnica',
    columns: {
      name: 'Técnica',
      family: 'Familia',
      priceFirstTime: 'Precio 1.ª vez',
      priceRetouch: 'Precio retoque',
      durations: 'Duración 1.ª / retoque',
      buffer: 'Prep. + limpieza',
      reapplication: 'Re-aplicación',
      deposit: 'Anticipo',
      status: 'Estado',
      actions: 'Acciones',
    },
    status: { active: 'Activa', inactive: 'Desactivada' },
    rowActions: { edit: 'Editar', deactivate: 'Desactivar' },
    minutesShort: 'min',
    daysShort: 'días',
    notApplicable: '—',
    empty: {
      title: 'Todavía no hay técnicas',
      body: 'Creá la primera técnica para que aparezca en el calendario y en el sitio.',
      cta: 'Crear la primera técnica',
    },
    loading: 'Cargando el catálogo…',
    error: {
      title: 'No se pudo cargar el catálogo',
      body: 'Ocurrió un error al leer las técnicas del catálogo.',
      retry: 'Reintentar',
    },
  },
  form: {
    legendCreate: 'Nueva técnica',
    legendEdit: 'Editar técnica',
    fields: {
      name: 'Nombre',
      family: 'Familia de servicio',
      priceFirstTime: 'Precio primera vez (colones)',
      priceRetouch: 'Precio retoque (colones, opcional)',
      durationFirstTimeMin: 'Duración primera vez (minutos)',
      durationRetouchMin: 'Duración retoque (minutos, opcional)',
      bufferMin: 'Tiempo de preparación y limpieza (minutos)',
      reapplicationIntervalDays: 'Intervalo sugerido de re-aplicación (días, opcional)',
      deposit: 'Anticipo requerido (colones)',
      aftercareText: 'Texto de cuidados posteriores',
    },
    submitCreate: 'Crear técnica',
    submitEdit: 'Guardar cambios',
    cancel: 'Cancelar',
    writeDisabled:
      'La edición del catálogo está deshabilitada hasta que el inicio de sesión de administración esté disponible (flag catalog_admin_write).',
    validationTitle: 'Revisá estos campos:',
    savedCreate: 'Técnica creada.',
    savedEdit: 'Cambios guardados.',
    deactivated: 'Técnica desactivada.',
  },
} as const

const FAMILY_LABELS: Record<ServiceFamily, string> = {
  lash_classic: 'Pestañas — clásico',
  lash_volume: 'Pestañas — volumen',
  lash_extra_volume: 'Pestañas — volumen extra',
  brow_design: 'Diseño de cejas',
  brow_lamination: 'Laminado de cejas',
  henna: 'Henna',
  waxing: 'Depilación',
  lips: 'Labios',
}

export const familyLabel = (family: ServiceFamily): string =>
  FAMILY_LABELS[family]
