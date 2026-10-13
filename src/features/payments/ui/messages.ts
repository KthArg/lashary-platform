export const paymentsMessages = {
  exemption: {
    title: 'Exonerar anticipo',
    subtitle:
      'Exonera el anticipo requerido a una clienta específica. Queda registrado en la bitácora de auditoría.',
    searchLabel: 'Buscar clienta',
    searchPlaceholder: 'Nombre de la clienta',
    searching: 'Buscando…',
    noResults: 'Sin resultados',
    searchFailed: 'No se pudo buscar. Revisá tu sesión e intentá de nuevo.',
    selected: 'Clienta seleccionada',
    reasonLabel: 'Razón de la exoneración',
    submit: 'Exonerar anticipo',
    accessDenied:
      'Tu sesión no tiene permisos para exonerar anticipos. Iniciá sesión como administradora.',
    savedOk: 'Anticipo exonerado.',
    alreadyExempt: 'Esta clienta ya tiene una exoneración de anticipo vigente.',
    validationTitle: 'Revisá estos campos:',
    validation: {
      clientId: 'Elegí una clienta de la lista antes de exonerar.',
      reason: 'La razón no puede estar vacía.',
    },
  },
} as const
