import { CLIENT_VALIDATION_MESSAGES } from '../../../domain/client-validation-messages'

export const CLIENTS_LABELS = {
  brand: 'LASHARY', sectionTitle: 'Gestión de Clientas', sectionSubtitle: 'Alta y edición manual del registro de clientas',
  newClientTitle: 'Nueva clienta', newClientDescription: 'Los campos marcados son obligatorios.',
  fullNameInput: 'Nombre completo', phoneInput: 'Teléfono', emailInput: 'Correo electrónico', notesInput: 'Notas generales',
  requiredMark: 'obligatorio', optionalMark: 'opcional',
  clientsListTitle: 'Clientas registradas', clientsListEmpty: 'Todavía no hay clientas registradas. Usa Agregar para registrar la primera.',
  clientsListEmptyForFilter: (name: string) => `Ninguna clienta registrada coincide con «${name}».`,
  clientsListLoading: 'Cargando clientas…',
  editClientTitle: 'Editar clienta', editClientDescription: 'Cambia solo lo que necesites; los campos marcados siguen siendo obligatorios.',
} as const

export const CLIENTS_TABLE_HEADERS = {
  fullName: 'Nombre', phone: 'Teléfono', email: 'Correo',
  delinquencyStatus: 'Morosidad', lastAppointment: 'Última cita', actions: 'Acciones',
} as const

export const CLIENTS_TABLE_TEXTS = { pendingColumnValue: 'Sin dato' } as const

export const CLIENTS_FILTER_TEXTS = {
  formLabel: 'Buscar clientas',
  nameLabel: 'Buscar por nombre',
  namePlaceholder: 'Parte del nombre',
  submit: 'Buscar',
  clear: 'Quitar filtro',
  activeFilter: (name: string) => `Filtrando por «${name}»`,
} as const

export const CLIENTS_PAGINATION_TEXTS = {
  navLabel: 'Paginación de clientas',
  previous: 'Anterior',
  next: 'Siguiente',
  pageStatus: (page: number, totalPages: number) => `Página ${page} de ${totalPages}`,
  pageSizeLabel: 'Clientas por página',
  totalCount: (total: number) => (total === 1 ? '1 clienta' : `${total} clientas`),
} as const

export const CLIENTS_PLACEHOLDERS = {
  fullName: 'María Fernández Rojas', phone: '8888 8888', email: 'maria@correo.com',
  notes: 'Preferencias, cómo llegó al estudio…',
} as const

export const CLIENTS_BUTTON_TEXTS = { addClient: 'Agregar', save: 'Guardar', cancel: 'Cancelar', edit: 'Editar', saving: 'Guardando…', retry: 'Reintentar' } as const

export const CLIENTS_ERROR_MESSAGES = {
  ...CLIENT_VALIDATION_MESSAGES,
  formHasErrors: 'Revisa los campos marcados en rojo.',
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

export const CLIENTS_ARIA_LABELS = { editClient: (fullName: string) => `Editar a ${fullName}` } as const
