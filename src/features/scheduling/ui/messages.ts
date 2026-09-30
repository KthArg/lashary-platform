import type { DayOfWeek } from '../domain/availability'

export const schedulingMessages = {
  admin: {
    title: 'Disponibilidad de agenda',
    subtitle: 'Horario semanal, días no laborables y bloqueos puntuales del calendario público.',
  },
  weeklyAvailability: {
    heading: 'Horario semanal',
    description: 'Bloques de horario que se repiten cada semana (AC-1).',
    columns: { day: 'Día', hours: 'Horario' },
    empty: 'Todavía no hay bloques de horario definidos.',
    form: {
      legend: 'Agregar bloque',
      fields: {
        dayOfWeek: 'Día de la semana',
        startTime: 'Hora de inicio',
        endTime: 'Hora de fin',
      },
      submit: 'Agregar bloque',
      saved: 'Bloque de horario agregado.',
    },
  },
  closedDates: {
    heading: 'Días no laborables y feriados',
    description: 'Fechas específicas en las que no se atiende (AC-2).',
    columns: { date: 'Fecha', reason: 'Motivo' },
    empty: 'Todavía no hay días no laborables registrados.',
    form: {
      legend: 'Agregar día no laborable',
      fields: { closedDate: 'Fecha', reason: 'Motivo (opcional)' },
      submit: 'Agregar día no laborable',
      saved: 'Día no laborable agregado.',
    },
  },
  manualBlocks: {
    heading: 'Bloqueos manuales',
    description:
      'Bloqueo puntual de un rango de horas — el mecanismo de datos (AC-3); seleccionar varios y desbloquear es alcance de US-AGE-07.',
    columns: { range: 'Rango', reason: 'Motivo' },
    empty: 'Todavía no hay bloqueos manuales.',
    form: {
      legend: 'Agregar bloqueo manual',
      fields: { startsAt: 'Desde', endsAt: 'Hasta', reason: 'Motivo (opcional)' },
      submit: 'Agregar bloqueo',
      saved: 'Bloqueo manual agregado.',
    },
  },
  shared: {
    accessDenied:
      'Tu sesión no tiene permisos para modificar la disponibilidad. Iniciá sesión como administradora.',
    validationTitle: 'Revisá estos campos:',
    notApplicable: '—',
    noResource:
      'Todavía no existe el recurso agendable base. Contactá al equipo técnico antes de continuar.',
  },
  validation: {
    dayOfWeek: 'Elegí un día de la semana válido',
    startTime: 'La hora de inicio es obligatoria',
    endTime: 'La hora de fin es obligatoria',
    closedDate: 'La fecha es obligatoria',
    startsAt: 'La fecha y hora de inicio son obligatorias',
    endsAt: 'La fecha y hora de fin son obligatorias',
  },
} as const

const DAY_LABELS: Record<DayOfWeek, string> = {
  0: 'Domingo',
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
}

export const dayLabel = (day: DayOfWeek): string => DAY_LABELS[day]
