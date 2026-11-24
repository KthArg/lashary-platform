export const INACTIVE_CLIENTS_PATH = '/admin/clients/inactivas'

export const INACTIVE_CLIENTS_QUERY = { range: 'rango', page: 'pagina' } as const

export const inactiveClientsMessages = {
  title: 'Clientas inactivas',
  subtitle: 'Clientas sin visitas en el rango elegido y sin una cita agendada, incluidas las que nunca vinieron.',
  openLink: 'Ver clientas inactivas',
  rangeLabel: 'Sin visitas en los últimos',
  rangeOption: (days: number) => `${days} días`,
  apply: 'Ver',
  tableCaption: 'Clientas inactivas con su última visita y su último recordatorio',
  columns: { name: 'Clienta', lastVisit: 'Última visita', lastReminder: 'Último recordatorio' },
  neverVisited: 'Nunca vino',
  noReminder: 'Ninguno',
  reminder: {
    pending: (date: string) => `En cola desde el ${date}`,
    claimed: (date: string) => `En cola desde el ${date}`,
    sent: (date: string) => `Enviado el ${date}`,
    failed: (date: string) => `No se pudo enviar (${date})`,
  },
  optedOut: 'Se dio de baja',
  total: (count: number) => (count === 1 ? '1 clienta inactiva' : `${count} clientas inactivas`),
  empty: 'No hay clientas inactivas en este rango.',
  emptyAction: 'Ver las de 30 días',
  loading: 'Cargando clientas inactivas…',
  loadFailed: 'No se pudo leer la lista de clientas inactivas.',
  reload: 'Reintentar',
  pagination: {
    label: 'Paginación de clientas inactivas',
    previous: 'Anterior',
    next: 'Siguiente',
    page: (page: number, totalPages: number) => `Página ${page} de ${totalPages}`,
  },
  error: {
    title: 'No pudimos mostrar las clientas inactivas',
    body: 'Ocurrió un problema al cargarlas. Intenta de nuevo.',
    retry: 'Reintentar',
  },
}
