// Costa Rica no observa horario de verano: desfase fijo UTC-6 todo el año (ADR-0004). Un
// <input type="datetime-local"> entrega "YYYY-MM-DDTHH:mm" sin zona — si se lo pasa tal cual a
// `new Date(...)`, un servidor que corre en UTC (Vercel) lo interpreta 6 horas adelantado.
// Ancla el desfase explícitamente antes de construir el Date; vive en ui/ (fuera de
// domain/application) así que instanciar Date acá es legítimo (DOM-004).
const COSTA_RICA_UTC_OFFSET = '-06:00'

export function parseCostaRicaLocalDateTime(value: string): Date {
  const withSeconds = value.length === 16 ? `${value}:00` : value
  return new Date(`${withSeconds}${COSTA_RICA_UTC_OFFSET}`)
}
