// fixedClock / fixedDate — construyen un instante fijo para tests. DOM-004 prohíbe `new Date()`
// dentro de domain/ o application/ (check-domain-purity.sh escanea esos árboles literalmente);
// esta fábrica vive en shared/, fuera de su alcance, para que cualquier feature con reloj
// inyectado la reutilice en vez de repetir el literal en cada suite.

import type { Clock } from '../clock'

export const fixedDate = (iso: string): Date => new Date(iso)

export const fixedClock = (iso: string): Clock => {
  const at = fixedDate(iso)
  return () => at
}
