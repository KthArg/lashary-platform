import type { DayOfWeek } from '../domain/availability'
import { SCHEDULING_ERROR_CODES, type SchedulingError } from '../domain/errors'
import { formatClosedDate } from './format'

export const schedulingMessages = {
  admin: {
    title: 'Disponibilidad de agenda',
    subtitle: 'Horario semanal, días no laborables y bloqueos puntuales del calendario público.',
  },
  weeklyAvailability: {
    heading: 'Horario semanal',
    description: 'Bloques de horario que se repiten cada semana.',
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
    description: 'Fechas específicas en las que no se atiende.',
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
    description: 'Rangos de horas puntuales en los que no se reciben citas.',
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
    resourceId: 'No se encontró el recurso de agenda. Recargá la página e intentá de nuevo.',
    dayOfWeek: 'Elegí un día de la semana válido',
    startTime: 'La hora de inicio es obligatoria',
    endTime: 'La hora de fin es obligatoria',
    closedDate: 'La fecha es obligatoria',
    startsAt: 'Ingresá una fecha y hora de inicio válidas',
    endsAt: 'Ingresá una fecha y hora de fin válidas',
    reason: 'El motivo debe ser texto',
  },
  days: {
    0: 'Domingo',
    1: 'Lunes',
    2: 'Martes',
    3: 'Miércoles',
    4: 'Jueves',
    5: 'Viernes',
    6: 'Sábado',
  } satisfies Record<DayOfWeek, string>,
  errors: {
    invalidTimeRange: 'La hora de fin debe ser posterior a la hora de inicio.',
    invalidDayOfWeek: 'El día de la semana no es válido.',
    invalidDate: 'La fecha no es válida.',
    closedDateExists: (date: string) => `Ya existe un día no laborable registrado para el ${date}.`,
    invalidBlockRange: 'El bloqueo debe terminar después de empezar.',
  },
} as const

export const dayLabel = (day: DayOfWeek): string => schedulingMessages.days[day]

export function describeSchedulingError(error: SchedulingError): string {
  const e = schedulingMessages.errors
  switch (error.code) {
    case SCHEDULING_ERROR_CODES.invalidTimeRange:
      return e.invalidTimeRange
    case SCHEDULING_ERROR_CODES.invalidDayOfWeek:
      return e.invalidDayOfWeek
    case SCHEDULING_ERROR_CODES.invalidDate:
      return e.invalidDate
    case SCHEDULING_ERROR_CODES.closedDateExists:
      return e.closedDateExists(formatClosedDate(error.closedDate))
    case SCHEDULING_ERROR_CODES.invalidBlockRange:
      return e.invalidBlockRange
  }
}
