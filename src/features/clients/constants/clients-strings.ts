// Textos visibles de la seccion de clientas, externalizados desde el primer commit (DOM-009).

export const CLIENTS_LABELS = {
  sectionTitle: 'Clientas', sectionSubtitle: 'Alta y edición manual del registro de clientas',
  newClientTitle: 'Nueva clienta', newClientDescription: 'Los campos marcados son obligatorios.',
  fullNameInput: 'Nombre completo', phoneInput: 'Teléfono', emailInput: 'Correo electrónico', notesInput: 'Notas generales',
  requiredMark: 'obligatorio', optionalMark: 'opcional',
  clientsListTitle: 'Clientas registradas', clientsListEmpty: 'Todavía no hay clientas registradas.',
} as const

export const CLIENTS_PLACEHOLDERS = {
  fullName: 'María Fernández Rojas', phone: '+506 8888 8888', email: 'maria@correo.com',
  notes: 'Preferencias, cómo llegó al estudio…',
} as const

export const CLIENTS_BUTTON_TEXTS = { addClient: 'Agregar', save: 'Guardar', cancel: 'Cancelar', edit: 'Editar' } as const

export const CLIENTS_ERROR_MESSAGES = {
  fullNameRequired: 'El nombre completo es obligatorio', fullNameTooShort: 'El nombre debe tener al menos 3 caracteres',
  phoneRequired: 'El teléfono es obligatorio', phoneTooShort: 'El teléfono debe tener al menos 8 dígitos',
  phoneInvalidFormat: 'El teléfono solo debe contener números, espacios, guiones o el símbolo +',
  emailRequired: 'El correo electrónico es obligatorio', emailInvalidFormat: 'El formato del correo no es válido',
  notesTooLong: 'Las notas no pueden superar los 500 caracteres',
  formHasErrors: 'Revisa los campos marcados en rojo.',
} as const

// Criterio 1 de US-CLI-05: por ahora el alta solo se reporta en consola, sin persistencia.
export const CLIENTS_CONSOLE_MESSAGES = { clientCreated: '[clients] Clienta creada correctamente (solo UI, sin persistencia):' } as const

export const CLIENTS_CONFIRM_MESSAGES = {
  discardFormTitle: '¿Descartar la clienta?',
  discardForm: 'Hay un formulario de clienta en progreso. Si sales ahora se perderán los datos ingresados.',
  discardConfirm: 'Descartar cambios',
  discardCancel: 'Seguir editando',
} as const

// Cuatro botones que dicen solo "Editar" son indistinguibles en un lector de pantalla (UI-004).
export const CLIENTS_ARIA_LABELS = { editClient: (fullName: string) => `Editar a ${fullName}` } as const
