export const CITAS_SECTION = {
  tabsLabel: 'Secciones de citas',
  tabs: {
    approvals: 'Aprobaciones',
    availability: 'Disponibilidad',
    alerts: 'Alertas',
    cancellation: 'Cancelación',
    reschedule: 'Reagendados',
  },
} as const

export const CITAS_ROUTES = {
  approvals: '/admin/citas',
  availability: '/admin/citas/disponibilidad',
  alerts: '/admin/citas/alertas',
  cancellation: '/admin/citas/cancelacion',
  reschedule: '/admin/citas/reagendados',
} as const
