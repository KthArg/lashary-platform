export const CITAS_SECTION = {
  tabsLabel: 'Secciones de citas',
  tabs: {
    approvals: 'Aprobaciones',
    agenda: 'Agenda',
    availability: 'Disponibilidad',
    alerts: 'Alertas',
    cancellation: 'Cancelación',
  },
} as const

export const CITAS_ROUTES = {
  approvals: '/admin/citas',
  agenda: '/admin/citas/agenda',
  availability: '/admin/citas/disponibilidad',
  alerts: '/admin/citas/alertas',
  cancellation: '/admin/citas/cancelacion',
} as const
