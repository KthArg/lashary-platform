// Textos visibles de la seccion de clientas, externalizados desde el primer commit (DOM-009).

export const CLIENTS_LABELS = {
  sectionTitle: 'Gestión de Clientas', sectionSubtitle: 'Alta y edición manual del registro de clientas',
  newClientTitle: 'Nueva clienta', newClientDescription: 'Los campos marcados son obligatorios.',
  fullNameInput: 'Nombre completo', phoneInput: 'Teléfono', emailInput: 'Correo electrónico', notesInput: 'Notas generales',
  requiredMark: 'obligatorio', optionalMark: 'opcional',
  clientsListTitle: 'Clientas registradas', clientsListEmpty: 'Todavía no hay clientas registradas. Usa Agregar para registrar la primera.',
  clientsListLoading: 'Cargando clientas…',
  editClientTitle: 'Editar clienta', editClientDescription: 'Cambia solo lo que necesites; los campos marcados siguen siendo obligatorios.',
} as const

// US-CLI-01 criterio 1. Morosidad y ultima cita ya tienen columna; su dato llega con US-MOR-01 y US-AGE-05.
export const CLIENTS_TABLE_HEADERS = {
  fullName: 'Nombre', phone: 'Teléfono', email: 'Correo',
  delinquencyStatus: 'Morosidad', lastAppointment: 'Última cita', actions: 'Acciones',
} as const

// Una celda en blanco se lee como "no debe nada"; este texto dice que el dato todavia no existe (EST-005).
export const CLIENTS_TABLE_TEXTS = { pendingColumnValue: 'Sin dato' } as const

export const CLIENTS_PLACEHOLDERS = {
  fullName: 'María Fernández Rojas', phone: '8888 8888', email: 'maria@correo.com',
  notes: 'Preferencias, cómo llegó al estudio…',
} as const

export const CLIENTS_BUTTON_TEXTS = { addClient: 'Agregar', save: 'Guardar', cancel: 'Cancelar', edit: 'Editar', saving: 'Guardando…', retry: 'Reintentar' } as const

export const CLIENTS_ERROR_MESSAGES = {
  fullNameRequired: 'El nombre completo es obligatorio', fullNameTooShort: 'El nombre debe tener al menos 3 caracteres',
  phoneRequired: 'El teléfono es obligatorio', phoneTooShort: 'El teléfono debe tener al menos 8 dígitos',
  phoneInvalidFormat: 'El teléfono solo debe contener números, espacios, guiones o el símbolo +',
  emailRequired: 'El correo electrónico es obligatorio', emailInvalidFormat: 'El formato del correo no es válido',
  notesTooLong: 'Las notas no pueden superar los 500 caracteres',
  fullNameTooLong: 'El nombre no puede superar los 120 caracteres', phoneTooLong: 'El teléfono no puede superar los 20 caracteres',
  emailTooLong: 'El correo no puede superar los 150 caracteres',
  formHasErrors: 'Revisa los campos marcados en rojo.',
  // Sin el detalle de la base: a la administradora no le sirve y a un atacante sí.
  saveFailed: 'No se pudo guardar la clienta. Intenta de nuevo.',
  phoneTaken: 'Ya hay una clienta registrada con este teléfono.',
  loadFailed: 'No se pudieron cargar las clientas.',
  clientNotFound: 'Esta clienta ya no existe o no tienes acceso a ella.',
} as const

export const CLIENTS_CONFIRM_MESSAGES = {
  discardFormTitle: '¿Descartar la clienta?',
  discardForm: 'Hay un formulario de clienta en progreso. Si sales ahora se perderán los datos ingresados.',
  discardConfirm: 'Descartar cambios',
  discardCancel: 'Seguir editando',
  discardEditsTitle: '¿Descartar los cambios?',
  discardEdits: 'Los cambios que hiciste en esta clienta se perderán. La clienta seguirá registrada como estaba.',
} as const

// Cuatro botones que dicen solo "Editar" son indistinguibles en un lector de pantalla (UI-004).
export const CLIENTS_ARIA_LABELS = { editClient: (fullName: string) => `Editar a ${fullName}` } as const
