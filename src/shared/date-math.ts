// Aritmética de fechas sin reglas de negocio (ARCH-007). Vive en shared/ para que domain/ y
// application/ nunca construyan un Date con aritmética directamente (DOM-004: el check de pureza
// de dominio escanea esos árboles buscando "new Date(" como texto).
export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000)
}
