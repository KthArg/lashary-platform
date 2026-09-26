// Recurso agendable (ADR-0005): hoy un único registro sembrado ("Dueña"). Sin invariante de
// negocio propio — es un id + nombre de solo lectura, por eso es un tipo, no una clase con
// constructor (a diferencia de WeeklyAvailabilityBlock/ClosedDate/ManualBlock).
export interface Resource {
  id: string
  name: string
}
